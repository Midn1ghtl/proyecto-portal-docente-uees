const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..');
const leer=ruta=>fs.readFileSync(path.join(root,ruta),'utf8');
const migracion=leer('docs/migraciones/003_borradores_publicacion.sql');
const baseOriginal=leer('docs/BaseDatos-New.sql');

test('migración compartida es repetible y conserva todas las filas existentes',async()=>{
  const pg=new PGlite();
  try {
    await pg.exec(baseOriginal.replace(/ProfesorId integer/g,'ProfesorId varchar(9)').replace(/DocenteId integer/g,'DocenteId varchar(9)'));
    await pg.exec("ALTER TABLE universidaduees.profesores ADD COLUMN contrahash text DEFAULT 'hash-ficticio-conservado'");
    const tablas=[['cursos','cursoid'],['profesores','profesorid'],['estudiantes','estudianteid'],['asignaturas','asignaturaid'],['evaluaciones','evaluacionesid'],['matricula','asignaturaid,estudianteid'],['calificaciones','calificacionid']];
    const captura=async()=>Promise.all(tablas.map(async([tabla,orden])=>(await pg.query('SELECT * FROM universidaduees.'+tabla+' ORDER BY '+orden)).rows));
    const antes=await captura();
    await pg.exec(migracion);await pg.exec(migracion);
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
