// Diagnóstico de solo lectura: nunca imprime credenciales ni datos personales.
const db = require('../PagWeb/Backend/config/AcademicoDB');
(async () => {
  try {
    await db.transaction(async tx => {
      for (const [nombre, consulta] of [
        ['columnas', `SELECT table_name,column_name,data_type,is_nullable,column_default
          FROM information_schema.columns WHERE table_schema='universidaduees'
          ORDER BY table_name,ordinal_position`],
        ['relaciones', `SELECT conrelid::regclass::text AS tabla,pg_get_constraintdef(oid) AS relacion
          FROM pg_constraint WHERE connamespace='universidaduees'::regnamespace AND contype IN ('f','p','u')`]
      ]) { const datos=(await tx.query(consulta)).rows; if(!process.argv.includes('--http'))console.log(nombre,JSON.stringify(datos,null,2)); }
    }, true);
    if (process.argv.includes('--http')) {
      // Usa tokens temporales internos; no imprime tokens, nombres ni identificadores.
      // Solo ejecuta GET y consultas SELECT contra la base real.
      const app = require('../PagWeb/Backend/app');
      const { crearToken } = require('../PagWeb/Backend/Verificacion/TokenSesion');
      const docentes = await db.transaction(tx => tx.query('SELECT profesorid FROM universidaduees.profesores ORDER BY profesorid'), true);
      const server = app.listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve));
      try {
        const base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
        for (const [indice, docente] of docentes.rows.entries()) {
          const headers = { Authorization: 'Bearer ' + crearToken(docente.profesorid) };
          const sesion = await fetch(base + '/sesion', { headers });
          const cursos = await fetch(base + '/profesor/' + encodeURIComponent(docente.profesorid) + '/cursos', { headers });
          const resultado = await cursos.json();
          console.log(JSON.stringify({ docente: indice + 1, sesion: sesion.status, cursos: cursos.status, asignaturas: resultado.data?.length }));
          for (const curso of resultado.data || []) {
            for (const ruta of ['', '/estudiantes', '/calificaciones', '/informe', '/exportar']) {
              const respuesta = await fetch(base + '/cursos/' + curso.id_curso + ruta, { headers });
              const resumen={docente:indice+1,operacion:ruta||'/detalle',http:respuesta.status};
              if(ruta==='/informe'||ruta==='/exportar') {
                const bytes=Buffer.from(await respuesta.arrayBuffer());
                resumen.tipo=respuesta.headers.get('content-type');resumen.bytes=bytes.length;
                resumen.firma=bytes.subarray(0,4).toString('hex');
                if(respuesta.ok&&ruta==='/exportar') {
                  const ExcelJS=require('exceljs'),libro=new ExcelJS.Workbook();await libro.xlsx.load(bytes);
                  resumen.estudiantesExcel=libro.getWorksheet('Calificaciones').rowCount-1;
                }
              } else {
                const cuerpo=await respuesta.json();
                if(!respuesta.ok)resumen.error=cuerpo;
                else if(ruta==='')resumen.edicionDisponible=cuerpo.edicionDisponible;
                else resumen.filas=cuerpo.data?.length;
              }
              console.log(JSON.stringify(resumen));
            }
          }
        }
      } finally { await new Promise(resolve => server.close(resolve)); }
    }
  } catch (error) {
    console.error('Diagnóstico no disponible:', error.code || error.name);
    process.exitCode = 1;
  } finally { await db.close(); }
})();
