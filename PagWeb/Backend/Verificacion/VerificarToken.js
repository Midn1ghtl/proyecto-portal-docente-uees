const { leerToken, tokenDeCabecera } = require('./TokenSesion');
function crearVerificador(db) {
  return async function verificarToken(req, res, next) {
    const profesorId = leerToken(tokenDeCabecera(req));
    if (!profesorId) return res.status(401).json({ status: 'error', message: 'Sesión inválida o expirada' });
    try {
      const { rows } = await db.query('SELECT profesorid FROM universidaduees.profesores WHERE profesorid=$1', [profesorId]);
      if (!rows.length) return res.status(401).json({ status: 'error', message: 'Sesión inválida o expirada' });
      req.profesorId = String(rows[0].profesorid);
      next();
    } catch (error) {
      console.error('Error al verificar sesión:', error.code || error.name);
      res.status(500).json({ status: 'error', message: 'No se pudo verificar la sesión' });
    }
  };
}
module.exports = crearVerificador(require('../config/AcademicoDB'));
module.exports.crearVerificador = crearVerificador;
