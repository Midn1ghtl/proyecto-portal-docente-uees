const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..');
const leer=ruta=>fs.readFileSync(path.join(root,ruta),'utf8');
const migracion=leer('docs/migraciones/003_borradores_publicacion.sql');
const verificar=leer('docs/entrega-neon/01_VERIFICAR.sql');
const baseOriginal=leer('docs/BaseDatos-New.sql');

test('el SQL para compartir coincide con la migración del proyecto',()=>{
  assert.equal(leer('docs/entrega-neon/02_ACTUALIZAR_NEON.sql'),migracion);
  assert.deepEqual(fs.readdirSync(path.join(root,'docs/entrega-neon')).sort(),[
    '00_LEER_PRIMERO.md','01_VERIFICAR.sql','02_ACTUALIZAR_NEON.sql','Base-Corregida.compatible.sql'
  ]);
});

test('estructura corregida crea una base vacía compatible y rechaza sobreescribirla',async()=>{
  const pg=new PGlite();
  try {
    const esquema=leer('docs/entrega-neon/Base-Corregida.compatible.sql');
    await pg.exec(esquema);await pg.exec(verificar);
    const {rows}=await pg.query(`SELECT table_name,column_name,data_type,is_nullable,is_identity
      FROM information_schema.columns WHERE table_schema='universidaduees'`);
    assert.equal(rows.find(r=>r.table_name==='profesores'&&r.column_name==='profesorid').data_type,'character varying');
    assert.ok(rows.some(r=>r.table_name==='profesores'&&r.column_name==='contrahash'));
    assert.equal(rows.find(r=>r.table_name==='calificaciones'&&r.column_name==='nota1').is_nullable,'YES');
    assert.equal(rows.find(r=>r.table_name==='calificaciones'&&r.column_name==='calificacionid').is_identity,'YES');
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM universidaduees.estudiantes')).rows[0].n,0);
    await assert.rejects(pg.exec(esquema),/Solo para una base nueva/);await pg.exec('ROLLBACK');
    await pg.exec(verificar);
  } finally {await pg.close();}
});

test('migración compartida es repetible y conserva todas las filas existentes',async()=>{
  const pg=new PGlite();
  try {
    await pg.exec(baseOriginal.replace(/ProfesorId integer/g,'ProfesorId varchar(9)').replace(/DocenteId integer/g,'DocenteId varchar(9)'));
    await pg.exec("ALTER TABLE universidaduees.profesores ADD COLUMN contrahash text DEFAULT 'hash-ficticio-conservado'");
    const tablas=[['cursos','cursoid'],['profesores','profesorid'],['estudiantes','estudianteid'],['asignaturas','asignaturaid'],['evaluaciones','evaluacionesid'],['matricula','asignaturaid,estudianteid'],['calificaciones','calificacionid']];
    const captura=async()=>Promise.all(tablas.map(async([tabla,orden])=>(await pg.query('SELECT * FROM universidaduees.'+tabla+' ORDER BY '+orden)).rows));
    const antes=await captura();await pg.exec(verificar);
    await pg.exec(migracion);await pg.exec(migracion);await pg.exec(verificar);
    assert.deepEqual(await captura(),antes);
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM universidaduees.publicaciones_registros')).rows[0].n,0);
    await pg.query('DELETE FROM universidaduees.calificaciones WHERE calificacionid=1001');
    const {rows}=await pg.query("INSERT INTO universidaduees.calificaciones(asignaturaid,estudianteid,docenteid,nota1) VALUES(1,1,'1',8) RETURNING calificacionid,nota2,nota3,notafinal");
    assert.ok(rows[0].calificacionid>3050);assert.equal(rows[0].nota2,null);assert.equal(rows[0].nota3,null);assert.equal(rows[0].notafinal,null);
  } finally {await pg.close();}
});

test('modelo de profesor entero aborta antes de cambiar las tablas',async()=>{
  const pg=new PGlite();
  try {
    await pg.exec(baseOriginal);
    await assert.rejects(pg.exec(migracion),/Esquema incompatible/);await pg.exec('ROLLBACK');
    const {rows}=await pg.query("SELECT is_nullable FROM information_schema.columns WHERE table_schema='universidaduees' AND table_name='calificaciones' AND column_name='nota1'");
    assert.equal(rows[0].is_nullable,'NO');
    assert.equal((await pg.query("SELECT to_regclass('universidaduees.publicaciones_registros') AS tabla")).rows[0].tabla,null);
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM universidaduees.calificaciones')).rows[0].n,150);
  } finally {await pg.close();}
});
