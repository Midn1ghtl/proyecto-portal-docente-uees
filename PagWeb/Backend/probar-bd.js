const db = require('./config/AcademicoDB');
(async () => {
  try {
    const { rows } = await db.query(`SELECT
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='universidaduees' AND table_name='matricula' AND column_name='matricula_id') AS matriculas_listas,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='universidaduees' AND table_name='calificaciones' AND column_name='nota_final_calculada') AS notas_listas,
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='universidaduees' AND table_name='publicaciones_registros') AS publicaciones_listas,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='universidaduees' AND table_name='profesores' AND column_name='contrasena_hash') AS credenciales_listas`);
    console.log('Conexión PostgreSQL correcta. Estructura disponible:', rows[0]);
  } catch (error) {
    console.error('No se pudo comprobar la base:', error.code || error.name);
    console.error('Revisa DATABASE_URL privada, acceso a internet y el script de instalación.');
    process.exitCode = 1;
  } finally { await db.close(); }
})();
