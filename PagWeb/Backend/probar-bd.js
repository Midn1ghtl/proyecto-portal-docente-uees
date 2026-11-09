const db = require('./config/AcademicoDB');
const {estadoEsquema}=require('./services/academico');
(async()=>{
  try { console.log('Conexión PostgreSQL correcta:',await estadoEsquema(db)); }
  catch(error){ console.error('No se pudo comprobar la base:',error.code||error.name);process.exitCode=1; }
  finally { await db.close(); }
})();
