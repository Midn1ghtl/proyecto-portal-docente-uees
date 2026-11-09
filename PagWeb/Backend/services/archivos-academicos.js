const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require('node:fs');
const path = require('node:path');
let fuentes;
function cargarFuentes() {
  if (!fuentes) {
    try {
      fuentes = {
        normal: fs.readFileSync(path.join(__dirname, '../assets/fonts/DejaVuSans.ttf')),
        negrita: fs.readFileSync(path.join(__dirname, '../assets/fonts/DejaVuSans-Bold.ttf'))
      };
    } catch {
      throw Object.assign(new Error('Faltan las fuentes del informe en el servidor'), {code:'PDF_FONT_MISSING'});
    }
  }
  return fuentes;
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
    ...[1,2,3].map(r=>["Registro "+r,!data.publicacionDisponible?'SIN ESTADO':data.registrosPublicados['registro'+r]?'PUBLICADO':'BORRADOR']) ]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
function crearPdf(data) {
  return new Promise((resolve,reject)=>{
    // La fuente inicial también es nuestra TTF: evita cargar Helvetica mediante
    // los imports dinámicos de PDFKit al arrancar una función empaquetada.
    const fonts=cargarFuentes();
    const doc=new PDFDocument({font:fonts.normal,size:"A4",layout:"landscape",margin:36,info:{Title:"Calificaciones - "+data.curso.nombre_asignatura}});
    doc.registerFont('UEES',fonts.normal);
    doc.registerFont('UEES-Bold',fonts.negrita);
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
      doc.text([1,2,3].map(r=>'R'+r+': '+(!data.publicacionDisponible?'SIN ESTADO':data.registrosPublicados['registro'+r]?'PUBLICADO':'BORRADOR')).join('   '),36,86);
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
module.exports={crearExcel,crearPdf};
