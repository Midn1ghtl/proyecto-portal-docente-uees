const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');

test('PDF funciona sin fuentes estándar dinámicas de PDFKit y desde otro directorio',()=>{
  const codigo=`
    const assert=require('node:assert/strict');
    const Module=require('node:module'),cargar=Module._load;
    Module._load=function(id,...args){
      if(id.startsWith('#standard-fonts/'))throw Object.assign(new Error('Fuente estándar no empaquetada'),{code:'MODULE_NOT_FOUND'});
      return cargar.call(this,id,...args);
    };
    const PDFDocument=require(${JSON.stringify(require.resolve('pdfkit'))});
    // Reproduce la dependencia que tenía la inicialización anterior.
    assert.throws(()=>new PDFDocument(),/Fuente estándar no empaquetada/);
    const {crearPdf}=require(${JSON.stringify(path.join(root,'PagWeb/Backend/services/archivos-academicos.js'))});
    crearPdf({curso:{nombre_asignatura:'Programación y Matemática',profesor:'Docente de prueba',horario:'Diurno'},
      publicacionDisponible:true,registrosPublicados:{registro1:false,registro2:false,registro3:false},
      estudiantes:[{cif:'0001',nombre:'Muñoz Pérez',nota1:8,nota2:null,nota3:9,reposicion:null,notaFinal:null}]
    }).then(bytes=>{assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.ok(bytes.length>2000);})
      .catch(error=>{console.error(error);process.exitCode=1;});
  `;
  execFileSync(process.execPath,['-e',codigo],{cwd:os.tmpdir(),stdio:'pipe'});
});

test('Vercel incluye explícitamente las fuentes privadas del informe',()=>{
  const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
  assert.equal(config.functions['api/index.js'].includeFiles,'PagWeb/Backend/assets/fonts/**');
  for(const fuente of ['DejaVuSans.ttf','DejaVuSans-Bold.ttf'])assert.ok(fs.statSync(path.join(root,'PagWeb/Backend/assets/fonts',fuente)).size>10000);
});
