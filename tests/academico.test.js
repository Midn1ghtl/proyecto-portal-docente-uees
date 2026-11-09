const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const express=require('express');
const ExcelJS=require('exceljs');
const {PGlite}=require('@electric-sql/pglite');
const {crearCursosRouter,crearNotasRouter}=require('../PagWeb/Backend/modules/academico.routes');
const {crearToken}=require('../PagWeb/Backend/Verificacion/TokenSesion');
const {crearVerificador}=require('../PagWeb/Backend/Verificacion/VerificarToken');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
const {crearLoginRouter}=require('../PagWeb/Backend/routes/log.routes');
let pg,db,server,base,matriculas,originales;
const root=path.resolve(__dirname,'..');
let sinMigracion;
before(async()=>{
  pg=new PGlite();await pg.exec(fs.readFileSync(path.join(root,'docs/BaseDatos-New.sql'),'utf8').replace(/ProfesorId integer/g,'ProfesorId varchar(9)').replace(/DocenteId integer/g,'DocenteId varchar(9)'));
  await pg.exec('ALTER TABLE universidaduees.profesores ADD COLUMN contrahash text');
  originales=(await pg.query('SELECT calificacionid,notafinal FROM universidaduees.calificaciones ORDER BY calificacionid')).rows;

  db={query:(q,v)=>pg.query(q,v),transaction:(work)=>pg.transaction(tx=>work(tx))};
  const api=require('../PagWeb/Backend/services/academico').crearAcademico(db);
  sinMigracion={detalle:await api.detalle('1',1),estudiantes:await api.estudiantes('1',1),notas:await api.calificaciones('1',1)};
  const migration=fs.readFileSync(path.join(root,'docs/migraciones/003_borradores_publicacion.sql'),'utf8');
  await pg.exec(migration);await pg.exec(migration);
  db={query:(q,v)=>pg.query(q,v),transaction:(work)=>pg.transaction(tx=>work(tx))};
  const autenticar=crearVerificador(db);
  const app=express();app.use(express.json({limit:'1mb'}));
  const sql=async(parts,...values)=>{const q=parts.reduce((out,part,i)=>out+(i?'$'+i:'')+part,'');return (await pg.query(q,values)).rows;};
  app.use('/api/v1',crearLoginRouter(sql));
  app.use('/api/v1',crearCursosRouter({db,autenticar}));app.use('/api/v1',crearNotasRouter({db,autenticar}));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  base='http://127.0.0.1:'+server.address().port+'/api/v1';
  matriculas=(await pg.query('SELECT estudianteid AS matricula_id,estudianteid FROM universidaduees.matricula WHERE asignaturaid=1 ORDER BY estudianteid')).rows;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(pg)await pg.close();});
async function req(route,{method='GET',body,profesor=1,headers={}}={}){
  return fetch(base+route,{method,headers:{...(profesor?{Authorization:'Bearer '+crearToken(profesor)}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
}
const notas=()=>req('/cursos/1/calificaciones').then(r=>r.json()).then(r=>r.data);
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
    ['/cursos/1/calificaciones/publicacion','POST',{calificaciones:[]}],['/cursos/1/calificaciones','GET'],
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
test('docentes no pueden crear ni importar estudiantes o matrículas',async()=>{
  const antes=(await pg.query('SELECT (SELECT count(*) FROM universidaduees.estudiantes) AS estudiantes,(SELECT count(*) FROM universidaduees.matricula) AS matriculas')).rows;
  for(const route of ['/cursos/1/estudiantes/cargaMasiva','/cursos/1/estudiantes','/estudiantes','/matricula']) {
    const response=await req(route,{method:'POST',body:{cif:'NO-CREAR',nombre:'Prueba'}});assert.equal(response.status,404);
  }
  assert.deepEqual((await pg.query('SELECT (SELECT count(*) FROM universidaduees.estudiantes) AS estudiantes,(SELECT count(*) FROM universidaduees.matricula) AS matriculas')).rows,antes);
});

test('esquema original permite leer matrículas y notas sin columnas agregadas',()=>{
  assert.equal(sinMigracion.detalle.edicionDisponible,false);
  assert.equal(sinMigracion.estudiantes.length,50);assert.equal(sinMigracion.notas.length,50);
  assert.ok(sinMigracion.estudiantes.some(e=>e.matriculaId===1));
  assert.equal(sinMigracion.notas[0].notaFinal,Math.round((sinMigracion.notas[0].nota1*.3+sinMigracion.notas[0].nota2*.3+sinMigracion.notas[0].nota3*.4)*100)/100);
});

test('botón único guarda y publica varios alumnos; fallo revierte el lote completo',async()=>{
  await pg.query("INSERT INTO universidaduees.asignaturas(asignaturaid,nombre,cursoid,profesorid) VALUES(6,'Publicación masiva',1,'1')");
  await pg.query('INSERT INTO universidaduees.matricula(asignaturaid,estudianteid,cursoid) VALUES(6,1,1),(6,2,1)');
  const ruta='/cursos/6/calificaciones';
  let r=await req(ruta+'/publicacion',{method:'POST',body:{calificaciones:[{matriculaId:1,nota1:8},{matriculaId:2,nota1:9}]}});
  assert.equal(r.status,200);let data=(await r.json()).data;assert.deepEqual(data.registros,[1]);assert.ok(data.calificaciones.every(n=>n.notaFinal===null&&n.registrosPublicados.registro1));
  r=await req(ruta,{method:'POST',body:{calificaciones:[{matriculaId:1,nota1:7,nota2:8}]}});assert.equal(r.status,200);
  let guardadas=(await (await req(ruta)).json()).data;assert.equal(guardadas[0].nota1,7);assert.equal(guardadas[0].nota2,8);assert.equal(guardadas[0].registrosPublicados.registro1,false);
  // Publicar R1 y R2 en el mismo envío: R2 está incompleto; R1 tampoco debe publicarse ni cambiar notas.
  r=await req(ruta+'/publicacion',{method:'POST',body:{calificaciones:[{matriculaId:1,nota1:10,nota2:9},{matriculaId:2,nota1:6}]}});
  assert.equal(r.status,422);assert.match((await r.json()).message,/Registro 2/);assert.deepEqual((await (await req(ruta)).json()).data,guardadas);
  // Completar R2 guardado en borrador; publicar después sin ediciones pendientes en el navegador.
  r=await req(ruta,{method:'POST',body:{calificaciones:[{matriculaId:2,nota2:7}]}});assert.equal(r.status,200);
  r=await req(ruta+'/publicacion',{method:'POST',body:{calificaciones:[]}});assert.equal(r.status,200);data=(await r.json()).data;assert.deepEqual(data.registros,[1,2]);
  assert.ok(data.calificaciones.every(n=>n.registrosPublicados.registro1&&n.registrosPublicados.registro2&&!n.registrosPublicados.registro3));
  assert.equal((await req(ruta+'/publicacion',{method:'POST',body:{calificaciones:[{matriculaId:999,nota1:9}]}})).status,400);
  assert.equal((await req(ruta+'/publicacion',{method:'POST',profesor:2,body:{calificaciones:[]}})).status,403);
  const antesReposicion=(await (await req(ruta)).json()).data;
  r=await req(ruta+'/publicacion',{method:'POST',body:{calificaciones:[{matriculaId:1,reposicion:10}]}});assert.equal(r.status,422);
  assert.deepEqual((await (await req(ruta)).json()).data,antesReposicion);
  r=await req(ruta,{method:'POST',body:{calificaciones:[{matriculaId:1,reposicion:10}]}});assert.equal(r.status,200);
  assert.equal((await r.json()).data[0].reposicion,10);
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
  assert.equal(sheet.rowCount,51);let encontrado=false;
  sheet.eachRow((row,i)=>{if(i>1&&row.getCell(1).value==='CIF-UEES-0001')encontrado=true;});assert.ok(encontrado);
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

test('contraseña usa contrahash y permite autenticar con la nueva clave',async()=>{
  const bcrypt=require('bcryptjs');
  await pg.query('UPDATE universidaduees.profesores SET contrahash=$1 WHERE profesorid=$2',[await bcrypt.hash('clave anterior prueba',4),'1']);
  const body={'contraseñaActual':'clave anterior prueba','contraseñaNueva':'nueva clave prueba'};
  assert.equal((await req('/profesor/1/contra',{method:'POST',body:{...body,'contraseñaActual':'incorrecta'}})).status,401);
  assert.equal((await req('/profesor/2/contra',{method:'POST',body})).status,403);
  assert.equal((await req('/profesor/1/contra',{method:'POST',body:{...body,'contraseñaNueva':'corta'}})).status,400);
  assert.equal((await req('/profesor/1/contra',{method:'POST',body})).status,200);
  const login=await req('/login',{method:'POST',profesor:null,body:{profesorId:'1',contrasena:body['contraseñaNueva']}});
  assert.equal(login.status,200);
  const token=(await login.json()).data.token;
  assert.equal((await req('/sesion',{headers:{Authorization:'Bearer '+token}})).status,200);
  assert.equal((await req('/profesor/1/cursos',{headers:{Authorization:'Bearer '+token}})).status,200);
});

test('login real conserva ceros, rechaza token alterado y distingue lista vacía',async()=>{
  const bcrypt=require('bcryptjs');
  await pg.query('INSERT INTO universidaduees.profesores(profesorid,nombre,apellidos,contrahash) VALUES($1,$2,$3,$4)', ['001234567','Docente','Prueba',await bcrypt.hash('clave de prueba',4)]);
  let r=await req('/login',{method:'POST',profesor:null,body:{dui:'00123456-7',contrasena:'clave de prueba'}});
  assert.equal(r.status,200);const sesion=(await r.json()).data;assert.equal(sesion.profesorId,'001234567');
  const headers={Authorization:'Bearer '+sesion.token};
  assert.equal((await req('/sesion',{headers})).status,200);
  r=await req('/profesor/001234567/cursos',{headers});assert.equal(r.status,200);assert.deepEqual((await r.json()).data,[]);
  await pg.query("INSERT INTO universidaduees.asignaturas(asignaturaid,nombre,cursoid,profesorid) VALUES(5,'Asignada',1,'001234567')");
  r=await req('/profesor/001234567/cursos',{headers});assert.equal((await r.json()).data[0].nombre_asignatura,'Asignada');
  assert.equal((await req('/cursos/5',{headers})).status,200);
  assert.equal((await req('/profesor/1234567/cursos',{headers})).status,403);
  assert.equal((await req('/profesor/1/cursos',{headers:{Authorization:'Bearer '+sesion.token+'x'}})).status,401);
  assert.equal((await req('/profesor/1/cursos',{headers:{Authorization:'Bearer '+sesion.token+'.extra'}})).status,401);
  assert.equal((await req('/profesor/1/cursos',{headers:{Authorization:'Bearer '+crearToken('NOEXISTE')}})).status,401);
  await pg.exec('ALTER TABLE universidaduees.asignaturas DROP COLUMN IF EXISTS codigo');
  assert.equal((await req('/profesor/001234567/cursos',{headers})).status,200);
  await pg.exec('DROP TABLE universidaduees.publicaciones_registros');
  r=await req('/cursos/1/calificaciones');assert.equal(r.status,200);
  r=await req('/cursos/1/calificaciones',{method:'POST',body:{calificaciones:[{matriculaId:1,nota1:9}]}});assert.equal(r.status,503);assert.match((await r.json()).message,/preparación/);
});
