const sql = require("../config/BasedeDatos");

// Usar después de verificarToken.
// 404 si el curso no existe, 403 si pertenece a otro docente.
async function verificarCurso(req, res, next) {
  const cursoId = Number(req.params.cursoId);

  if (!Number.isInteger(cursoId) || cursoId <= 0) {
    return res.status(400).json({ status: "error", message: "cursoId inválido" });
  }

  try {
    const filas = await sql`SELECT profesor_id FROM cursos WHERE curso_id = ${cursoId}`;

    if (!filas[0]) {
      return res.status(404).json({ status: "error", message: "Curso no encontrado" });
    }

    if (Number(filas[0].profesor_id) !== req.profesorId) {
      return res.status(403).json({ status: "error", message: "No tienes acceso a este curso" });
    }

    req.cursoId = cursoId;
    next();

  } catch (error) {
    console.error("Error en verificarCurso:", error);
    res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
}

module.exports = verificarCurso;