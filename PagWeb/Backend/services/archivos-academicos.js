const path = require("node:path");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { parse } = require("csv-parse/sync");
const { fallo } = require("./academico");
const COLUMNAS = ["cif","nombre","apellidos","email"];

// Comprueba límites del ZIP antes de descomprimir un XLSX en memoria.
function limitarXlsx(buffer) {
  let end=-1;
  for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--) {
    if(buffer.readUInt32LE(i)===0x06054b50 && i+22+buffer.readUInt16LE(i+20)===buffer.length){end=i;break;}
  }
  if(end<0)throw fallo(400,"XLSX inválido");
  const count=buffer.readUInt16LE(end+10), size=buffer.readUInt32LE(end+12), start=buffer.readUInt32LE(end+16);
  if(buffer.readUInt16LE(end+4)||buffer.readUInt16LE(end+6)||count>1000||count===65535||start+size>end)
    throw fallo(400,"XLSX demasiado complejo o inválido");
  let offset=start,total=0;
  for(let n=0;n<count;n++) {
    if(offset+46>end||buffer.readUInt32LE(offset)!==0x02014b50)throw fallo(400,"XLSX inválido");
    const uncompressed=buffer.readUInt32LE(offset+24);
    if(buffer.readUInt16LE(offset+8)&1||uncompressed===0xffffffff)throw fallo(400,"XLSX cifrado o ZIP64 no admitido");
    total+=uncompressed;
    if(total>20*1024*1024)throw fallo(400,"XLSX excede 20 MB descomprimido");
    offset+=46+buffer.readUInt16LE(offset+28)+buffer.readUInt16LE(offset+30)+buffer.readUInt16LE(offset+32);
  }
  if(offset!==start+size)throw fallo(400,"XLSX inválido");
}
function encabezados(keys) {
  if(keys.length!==4||new Set(keys).size!==4||!COLUMNAS.every(k=>keys.includes(k)))
    throw fallo(400,"Usa exactamente estas columnas: cif,nombre,apellidos,email");
}
async function leerEstudiantes(file) {
  if(!file)throw fallo(400,"Adjunta el archivo en el campo archivo");
  if(!file.buffer.length)throw fallo(400,"El archivo está vacío");
  const ext=path.extname(file.originalname).toLowerCase();
  try {
    if(ext==='.csv') {
      const text=new TextDecoder('utf-8',{fatal:true}).decode(file.buffer);
      const delimiter=text.split(/\r?\n/,1)[0].includes(';')?';':',';
      return parse(text,{bom:true,skip_empty_lines:true,max_record_size:10000,delimiter,
        columns:cols=>{const keys=cols.map(c=>c.trim().toLowerCase());encabezados(keys);return keys;}});
    }
    if(ext!=='.xlsx')throw fallo(400,"Solo se admiten archivos CSV UTF-8 o XLSX");
    limitarXlsx(file.buffer);
    const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(file.buffer);
    if(workbook.worksheets.length!==1)throw fallo(400,"El XLSX debe tener una única hoja");
    const sheet=workbook.worksheets[0];
    if(sheet.rowCount>1001||sheet.columnCount!==4)throw fallo(400,"Máximo 1000 estudiantes y cuatro columnas");
    function texto(cell) {
      if(cell.value===null)return '';
      if(typeof cell.value!=='string')throw fallo(400,"Las celdas de estudiantes deben ser texto; no uses fórmulas ni CIF numéricos");
      return cell.value;
    }
    const keys=[1,2,3,4].map(i=>texto(sheet.getRow(1).getCell(i)).trim().toLowerCase());encabezados(keys);
    const rows=[];
    for(let i=2;i<=sheet.rowCount;i++) {
      const row=sheet.getRow(i),values=[1,2,3,4].map(c=>texto(row.getCell(c)));
      if(values.every(v=>!v.trim()))continue;
      rows.push(Object.fromEntries(keys.map((key,n)=>[key,values[n]])));
    }
    return rows;
  } catch(error) {
    if(error.status)throw error;
    throw fallo(400,"No se pudo leer el archivo. Comprueba el formato y las columnas");
  }
}
async function crearExcel(data) {
  const workbook=new ExcelJS.Workbook();workbook.creator="Portal Docente UEES";
  const sheet=workbook.addWorksheet("Calificaciones");
  sheet.columns=[{header:"CIF",key:"cif",width:22},{header:"Estudiante",key:"nombre",width:40},
    ...[["Registro 1","nota1"],["Registro 2","nota2"],["Registro 3","nota3"],["Reposición","reposicion"],["Nota final","notaFinal"]]
      .map(([header,key])=>({header,key,width:16}))];
  sheet.addRows(data.estudiantes);sheet.views=[{state:"frozen",ySplit:1}];
  sheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};
  sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0B4F7F"}};
  for(let col=3;col<=7;col++)sheet.getColumn(col).numFmt="0.00";
  sheet.autoFilter={from:"A1",to:"G1"};
  const info=workbook.addWorksheet("Información");
  info.columns=[{width:28},{width:70}];
  info.addRows([["Asignatura",data.curso.nombre_asignatura],["Docente",data.curso.profesor],
    ["Horario",data.curso.horario||""],["Fórmula ordinaria","Registro 1: 30%; Registro 2: 30%; Registro 3: 40%"],
    ["Reposición","Se conserva como dato adicional. Efecto académico pendiente de confirmar."],
    ...[1,2,3].map(r=>["Registro "+r,data.registrosPublicados['registro'+r]?"PUBLICADO":"BORRADOR"]) ]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
function crearPdf(data) {
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:"A4",layout:"landscape",margin:36,info:{Title:"Calificaciones - "+data.curso.nombre_asignatura}});
    doc.registerFont('UEES',require.resolve('../assets/fonts/DejaVuSans.ttf'));
    doc.registerFont('UEES-Bold',require.resolve('../assets/fonts/DejaVuSans-Bold.ttf'));
    const parts=[];doc.on('data',b=>parts.push(b));doc.on('end',()=>resolve(Buffer.concat(parts)));doc.on('error',reject);
    const widths=[85,260,70,70,70,90,90];let y,pageNumber=0;
    function pie() {
      doc.font('UEES').fillColor('black').fontSize(8).text(
        'Final ordinaria: 30% + 30% + 40%. Reposición: regla pendiente de confirmar.  |  Página '+pageNumber,
        36,doc.page.height-52,{width:735});
    }
    function cabecera() {
      pageNumber++;
      doc.fillColor('#0b4f7f').font('UEES-Bold').fontSize(16).text("Portal Docente UEES",36,30);
      doc.fontSize(11).text(data.curso.nombre_asignatura,36,53,{width:735});
      doc.font('UEES').fontSize(9).fillColor('black').text(data.curso.profesor+" · "+(data.curso.horario||"Sin horario"),36,71,{width:735});
      doc.text([1,2,3].map(r=>'R'+r+': '+(data.registrosPublicados['registro'+r]?'PUBLICADO':'BORRADOR')).join('   '),36,86);
      y=108;let x=36;
      ["CIF","Estudiante","Registro 1","Registro 2","Registro 3","Reposición","Nota final"].forEach((title,i)=>{
        doc.font('UEES-Bold').fontSize(9).text(title,x+4,y,{width:widths[i]-8});x+=widths[i];
      });y+=22;
    }
    cabecera();
    for(const row of data.estudiantes) {
      doc.font('UEES').fontSize(9);
      const height=Math.max(22,doc.heightOfString(row.nombre,{width:widths[1]-8})+10);
      if(y+height>doc.page.height-65){pie();doc.addPage();cabecera();}
      let x=36;
      [row.cif,row.nombre,...['nota1','nota2','nota3','reposicion','notaFinal'].map(k=>row[k]===null?'—':Number(row[k]).toFixed(2))].forEach((value,i)=>{
        doc.fillColor('black').font('UEES').fontSize(9).text(String(value),x+4,y+4,{width:widths[i]-8,height:height-6,ellipsis:true});x+=widths[i];
      });
      doc.strokeColor('#dddddd').moveTo(36,y+height).lineTo(771,y+height).stroke();y+=height;
    }
    if(!data.estudiantes.length)doc.text("Sin estudiantes matriculados.",36,y);
    pie();
    doc.end();
  });
}
module.exports={leerEstudiantes,crearExcel,crearPdf};
