const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const express=require('express');
const ExcelJS=require('exceljs');
const {PGlite}=require('@electric-sql/pglite');
const {crearCursosRouter,crearNotasRouter}=require('../PagWeb/Backend/modules/academico.routes');
let pg,db,server,base,matriculas,originales;
const root=path.resolve(__dirname,'..');
const aprobadas=[];
before(async()=>{
  pg=new PGlite();await pg.exec(fs.readFileSync(path.join(root,'docs/BaseDatos-New.sql'),'utf8'));
  originales=(await pg.query('SELECT calificacionid,notafinal FROM universidaduees.calificaciones ORDER BY calificacionid')).rows;
  await pg.exec(fs.readFileSync(path.join(root,'docs/migraciones/001_autenticacion_dui.sql'),'utf8'));
  const migration=fs.readFileSync(path.join(root,'docs/migraciones/002_backend_academico.sql'),'utf8');
  await pg.exec(migration);await pg.exec(migration);
  db={query:(q,v)=>pg.query(q,v),transaction:(work)=>pg.transaction(tx=>work(tx))};
  // Esta autenticación simulada existe únicamente en las pruebas; no se publica.
  const autenticar=(req,res,next)=>{
    if(!req.headers['x-test-docente'])return res.status(401).json({status:'error',message:'No autorizado'});
    req.profesorId=Number(req.headers['x-test-docente']);next();
  };
  const app=express();app.use(express.json({limit:'1mb'}));
  app.use('/api/v1',crearCursosRouter({db,autenticar}));app.use('/api/v1',crearNotasRouter({db,autenticar}));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  base='http://127.0.0.1:'+server.address().port+'/api/v1';
  matriculas=(await pg.query('SELECT matricula_id,estudianteid FROM universidaduees.matricula WHERE asignaturaid=1 ORDER BY estudianteid')).rows;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(pg)await pg.close();});
async function req(route,{method='GET',body,profesor=1,headers={}}={}){
  return fetch(base+route,{method,headers:{...(profesor?{'x-test-docente':String(profesor)}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
}
const notas=()=>req('/cursos/1/calificaciones').then(r=>r.json()).then(r=>r.data);
const nuevo=(cif,email)=>({cif,nombre:'Ana',apellidos:'Prueba',email});
async function upload(content,name='estudiantes.csv',profesor=1,route='/cursos/1/estudiantes/cargaMasiva'){
  const form=new FormData();form.append('archivo',new Blob([content]),name);
  return fetch(base+route,{method:'POST',headers:profesor?{'x-test-docente':String(profesor)}:{},body:form});
}
function csv(rows){return 'cif,nombre,apellidos,email\n'+rows.map(r=>[r.cif,r.nombre,r.apellidos,r.email].join(',')).join('\n');}

test('migración repetible conserva los 150 valores históricos y sus claves',async()=>{
  assert.deepEqual((await pg.query('SELECT calificacionid,notafinal FROM universidaduees.calificaciones ORDER BY calificacionid')).rows,originales);
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM universidaduees.matricula')).rows[0].n,150);
  assert.equal(new Set(matriculas.map(m=>m.matricula_id)).size,50);
});
test('rechaza peticiones sin sesión y acceso de un docente a otro',async()=>{
  assert.equal((await req('/cursos/1',{profesor:null})).status,401);
  assert.equal((await req('/cursos/1',{profesor:2})).status,403);
  assert.equal((await req('/profesor/2/cursos')).status,403);
  assert.equal((await req('/cursos/999')).status,404);
  assert.equal((await req('/cursos/abc')).status,400);
});
test('cursos, detalle y estudiantes usan asignatura y matrícula reales',async()=>{
  const cursos=(await (await req('/profesor/1/cursos')).json()).data;
  assert.equal(cursos.length,1);assert.equal(cursos[0].id_curso,1);assert.equal(cursos[0].total_estudiantes,50);
  const detalle=await (await req('/cursos/1')).json();assert.equal(detalle.nombre_asignatura,'Bases de Datos');
  const estudiantes=(await (await req('/cursos/1/estudiantes')).json()).data;
  assert.equal(estudiantes.length,50);assert.match(estudiantes[0].nombre,/\s/);
});
test('las 14 operaciones de cursos y perfil exigen sesión y rechazan al docente ajeno',async()=>{
  const operations=[
    ['/profesor/1/cursos','GET'],['/cursos/1','GET'],['/cursos/1/estudiantes','GET'],
    ['/cursos/1/estudiantes/cargaMasiva','POST',{}],['/cursos/1/calificaciones','GET'],
    ['/cursos/1/calificaciones','POST',{calificaciones:[{matriculaId:matriculas[0].matricula_id,nota1:8}]}],
    ['/cursos/1/calificaciones/1001','PATCH',{nota1:8}],['/cursos/1/calificaciones/1001','DELETE'],
    ['/cursos/1/registros/1/publicacion','POST',{confirmar:true}],['/cursos/1/registros/1/publicacion','DELETE'],
    ['/cursos/1/informe','GET'],['/cursos/1/exportar','GET'],['/profesor/1/email','PATCH',{correo:'otro@example.test'}],
    ['/profesor/1/contra','POST',{'contraseñaActual':'prueba anterior','contraseñaNueva':'prueba nueva'}]
  ];
  for(const [route,method,body] of operations){
    assert.equal((await req(route,{method,body,profesor:null})).status,401,method+' '+route);
    assert.equal((await req(route,{method,body,profesor:2})).status,403,method+' '+route);
  }
});
test('lectura calcula 30/30/40 sin usar los valores históricos incorrectos',async()=>{
  const rows=await notas();assert.equal(rows.length,50);
  for(const row of rows)assert.equal(row.notaFinal,Math.round((row.nota1*0.3+row.nota2*0.3+row.nota3*0.4)*100)/100);
});
test('POST parcial conserva campos omitidos y null permite borrador',async()=>{
  const antes=(await notas()).find(r=>r.matriculaId===matriculas[0].matricula_id);
  const response=await req('/cursos/1/calificaciones',{method:'POST',body:{calificaciones:[{matriculaId:antes.matriculaId,nota1:8.5,nota3:null,reposicion:9}]}});
  assert.equal(response.status,200);const row=(await response.json()).data.find(r=>r.matriculaId===antes.matriculaId);
  assert.equal(row.nota1,8.5);assert.equal(row.nota2,antes.nota2);assert.equal(row.nota3,null);assert.equal(row.notaFinal,null);assert.equal(row.reposicion,9);
});
test('un lote inválido no escribe parcialmente y rechaza duplicados y tipos incorrectos',async()=>{
  const antes=await notas();
  for(const calificaciones of [
    [{matriculaId:matriculas[0].matricula_id,nota1:1},{matriculaId:999999,nota1:2}],
    [{matriculaId:matriculas[0].matricula_id,nota1:1},{matriculaId:matriculas[0].matricula_id,nota1:2}],
    [{matriculaId:matriculas[0].matricula_id,nota1:true}],
    [{matriculaId:matriculas[0].matricula_id,nota1:'7'}],
    [{matriculaId:String(matriculas[0].matricula_id),nota1:7}],
    [{matriculaId:matriculas[0].matricula_id,notaFinal:10}],
    [{matriculaId:matriculas[0].matricula_id,nota1:11}]
  ])assert.equal((await req('/cursos/1/calificaciones',{method:'POST',body:{calificaciones}})).status,400);
  assert.deepEqual(await notas(),antes);
});
test('publicación valida registro completo y edición lo devuelve a borrador',async()=>{
  let r=await req('/cursos/1/registros/3/publicacion',{method:'POST',body:{confirmar:true}});assert.equal(r.status,422);
  r=await req('/cursos/1/registros/1/publicacion',{method:'POST',body:{confirmar:true}});assert.equal(r.status,200);
  assert.equal((await notas())[0].registrosPublicados.registro1,true);
  r=await req('/cursos/1/registros/1/publicacion',{method:'POST',body:{}});assert.equal(r.status,400);
  const first=(await notas()).find(r=>r.matriculaId===matriculas[0].matricula_id);
  r=await req('/cursos/1/calificaciones/'+first.calificacionId,{method:'PATCH',body:{nota1:7,nota3:9}});assert.equal(r.status,200);
  const changed=(await r.json()).data;assert.equal(changed.registrosPublicados.registro1,false);
  assert.equal(changed.notaFinal,Math.round((7*.3+changed.nota2*.3+9*.4)*100)/100);
  assert.equal((await req('/cursos/1/calificaciones/2001',{method:'PATCH',body:{nota1:1}})).status,404);
  r=await req('/cursos/1/registros/3/publicacion',{method:'POST',body:{confirmar:true}});assert.equal(r.status,200);
  for(let i=0;i<2;i++){
    const response=await req('/cursos/1/registros/3/publicacion',{method:'DELETE'});assert.equal(response.status,200);assert.equal((await response.json()).data.publicado,false);
  }
});
test('eliminar notas conserva matrícula y permite guardarlas de nuevo',async()=>{
  const last=(await notas()).find(r=>r.matriculaId===matriculas[49].matricula_id);
  assert.equal((await req('/cursos/1/calificaciones/'+last.calificacionId,{method:'DELETE'})).status,200);
  assert.equal((await notas()).length,49);
  assert.equal((await req('/cursos/1/calificaciones/'+last.calificacionId,{method:'DELETE'})).status,404);
  const response=await req('/cursos/1/calificaciones',{method:'POST',body:{calificaciones:[{matriculaId:last.matriculaId,nota1:0,nota2:0,nota3:0}]}});
  assert.equal(response.status,200);const row=(await response.json()).data.find(r=>r.matriculaId===last.matriculaId);
  assert.ok(row.calificacionId>3050);assert.equal(row.notaFinal,0);
});
test('CSV incorpora estudiantes y omite duplicados sin modificar datos existentes',async()=>{
  const student=nuevo('00001234','ana.importada@example.test');
  const r=await upload(csv([student,student,{...student,cif:'CIF-UEES-0001',email:'otro@example.test'}]));
  assert.equal(r.status,200,await r.clone().text());assert.deepEqual((await r.json()).data,{totalRecibidos:3,incorporados:1,omitidos:2});
  const existing=(await pg.query("SELECT email FROM universidaduees.estudiantes WHERE cif='CIF-UEES-0001'")).rows[0];assert.equal(existing.email,'estudiante0001@example.test');
  const repeat=await upload(csv([student]));assert.equal((await repeat.json()).data.incorporados,0);
  const students=(await (await req('/cursos/1/estudiantes')).json()).data;assert.ok(students.some(s=>s.cif==='00001234'));
});
test('CSV inválido o conflicto revierte toda la carga',async()=>{
  const count=()=>pg.query('SELECT count(*)::int AS n FROM universidaduees.estudiantes').then(r=>r.rows[0].n);const antes=await count();
  let response=await upload(csv([nuevo('NUEVO-1','valido@example.test'),nuevo('NUEVO-2','invalido')]));assert.equal(response.status,400);assert.equal(await count(),antes);
  response=await upload(csv([nuevo('NUEVO-1','correo.conflicto@example.test'),nuevo('NUEVO-2','correo.conflicto@example.test')]));assert.equal(response.status,409);assert.equal(await count(),antes);
  assert.equal((await upload('cif,nombre\n1,Ana')).status,400);
  assert.equal((await upload(csv([nuevo('NO-AUT','noaut@example.test')]),'datos.csv',2)).status,403);
});
test('XLSX permite texto y rechaza CIF numéricos y fórmulas',async()=>{
  async function libro(cif){const b=new ExcelJS.Workbook(),s=b.addWorksheet('Estudiantes');s.addRow(['cif','nombre','apellidos','email']);s.addRow([cif,'Luis','Prueba','luis.xlsx@example.test']);return b.xlsx.writeBuffer();}
  let response=await upload(await libro('00005678'),'datos.xlsx');assert.equal(response.status,200,await response.clone().text());
  response=await upload(await libro(5678),'datos.xlsx');assert.equal(response.status,400);
  response=await upload(await libro({formula:'1+1'}),'datos.xlsx');assert.equal(response.status,400);
  assert.equal((await upload('no es xlsx','datos.xlsx')).status,400);
});
test('carga rechaza archivos mayores de 2 MB y tipos no soportados',async()=>{
  assert.equal((await upload(Buffer.alloc(2*1024*1024+1,65))).status,413);
  assert.equal((await upload('texto','datos.exe')).status,400);
  assert.equal((await req('/cursos/1/estudiantes/cargaMasiva',{method:'POST',body:{archivo:'texto'}})).status,400);
});
test('un curso vacío devuelve lista vacía y no puede publicarse',async()=>{
  await pg.query("INSERT INTO universidaduees.asignaturas(asignaturaid,nombre,cursoid,profesorid) VALUES(4,'Sin alumnos',1,1)");
  const r=await req('/cursos/4/estudiantes');assert.deepEqual((await r.json()).data,[]);
  assert.equal((await req('/cursos/4/registros/1/publicacion',{method:'POST',body:{confirmar:true}})).status,422);
});
test('PDF es descargable y Excel contiene CIF texto y notas numéricas',async()=>{
  let response=await req('/cursos/1/informe');assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/application\/pdf/);const pdf=Buffer.from(await response.arrayBuffer());assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.ok(pdf.length>2000);
  fs.writeFileSync(path.join(os.tmpdir(),'uees-test-academico.pdf'),pdf);
  response=await req('/cursos/1/exportar');assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/\.xlsx/);
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));const sheet=workbook.getWorksheet('Calificaciones');
  assert.equal(sheet.rowCount,53);let encontrado=false;
  sheet.eachRow((row,i)=>{if(i>1&&row.getCell(1).value==='00001234')encontrado=true;});assert.ok(encontrado);
  const primera=(await notas()).find(r=>r.matriculaId===matriculas[0].matricula_id);
  const rows=[];sheet.eachRow((row,i)=>{if(i>1)rows.push(row.values);});
  const nota=rows.find(r=>r[1]==='CIF-UEES-0001');assert.equal(typeof nota[3],'number');assert.equal(nota[7],primera.notaFinal);
  assert.equal((await req('/cursos/1/informe',{profesor:2})).status,403);
  assert.equal((await req('/cursos/1/exportar',{profesor:2})).status,403);
});
test('correo solo se modifica para el docente autenticado y valida conflictos',async()=>{
  const r=await req('/profesor/1/email',{method:'PATCH',body:{correo:'nuevo.docente@example.test'}});assert.equal(r.status,200);assert.equal((await r.json()).data.correo,'nuevo.docente@example.test');
  assert.equal((await req('/profesor/2/email',{method:'PATCH',body:{correo:'otro@example.test'}})).status,403);
  assert.equal((await req('/profesor/1/email',{method:'PATCH',body:{correo:'malo'}})).status,400);
  assert.equal((await req('/profesor/1/email',{method:'PATCH',body:{correo:'carlos.hernandez@example.test'}})).status,409);
});

test('contraseña verifica la actual, almacena bcrypt y revoca otras sesiones',async()=>{
  const bcrypt=require('bcryptjs'),crypto=require('node:crypto');
  await pg.query('UPDATE universidaduees.profesores SET contrasena_hash=$1 WHERE profesorid=1',[await bcrypt.hash('clave anterior prueba',4)]);
  const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
  const token='a'.repeat(64);
  await pg.query("INSERT INTO universidaduees.sesiones_docentes(token_hash,profesor_id,expires_at) VALUES($1,1,now()+interval '1 hour'),($2,1,now()+interval '1 hour')",[hash(token),hash('b'.repeat(64))]);
  const body={'contraseñaActual':'clave anterior prueba','contraseñaNueva':'nueva clave prueba'};
  assert.equal((await req('/profesor/1/contra',{method:'POST',body:{...body,'contraseñaActual':'incorrecta'}})).status,401);
  assert.equal((await req('/profesor/2/contra',{method:'POST',body})).status,403);
  assert.equal((await req('/profesor/1/contra',{method:'POST',body:{...body,'contraseñaNueva':'corta'}})).status,400);
  const result=await req('/profesor/1/contra',{method:'POST',body,headers:{Authorization:'Bearer '+token}});assert.equal(result.status,200);
  const saved=(await pg.query('SELECT contrasena_hash FROM universidaduees.profesores WHERE profesorid=1')).rows[0];assert.ok(await bcrypt.compare(body['contraseñaNueva'],saved.contrasena_hash));
  const sessions=(await pg.query('SELECT token_hash FROM universidaduees.sesiones_docentes WHERE profesor_id=1')).rows;assert.deepEqual(sessions,[{token_hash:hash(token)}]);
});
