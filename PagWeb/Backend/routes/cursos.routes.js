const express = require("express");
const sql = require("../config/BasedeDatos");
  const verificarToken = require("../Verificacion/VerificarToken");
  const verificarCurso = require("../Verificacion/VerifiCurso");

const router = express.Router();

// GET /api/v1/profesor/:profesorId/cursos  -> solo los cursos del docente con sesión
router.get("/profesor/:profesorId/cursos", verificarToken, async (req, res) => {
  const profesorId = Number(req.params.profesorId);

  if (!Number.isInteger(profesorId) || profesorId <= 0) {
    return res.status(400).json({ status: "error", message: "profesorId inválido" });
  }

  // Un docente solo puede consultar sus propios cursos
  if (profesorId !== req.profesorId) {
    return res.status(403).json({ status: "error", message: "No tienes acceso a estos cursos" });
  }

  try {
    const cursos = await sql`
      SELECT
        c.curso_id          AS id_curso,
        a.codigo            AS codigo_asignatura,
        a.nombre            AS nombre_asignatura,
        p.nombre            AS profesor,
        c.horario           AS horario,
        (SELECT COUNT(*) FROM matriculas m WHERE m.curso_id = c.curso_id)::int AS total_estudiantes
      FROM cursos c
      JOIN asignaturas a ON a.asignatura_id = c.asignatura_id
      JOIN profesores  p ON p.profesor_id   = c.profesor_id
      WHERE c.profesor_id = ${profesorId}
      ORDER BY a.nombre
    `;

    res.json({
      status: "success",
      message: "Operación exitosa",
      data: cursos.map((c) => ({
        id_curso: Number(c.id_curso),
        codigo_asignatura: c.codigo_asignatura,
        nombre_asignatura: c.nombre_asignatura,
        profesor: c.profesor,
        horario: c.horario,
        total_estudiantes: Number(c.total_estudiantes)
      }))
    });

  } catch (error) {
    console.error("Error en cursos del profesor:", error);
    res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
});

// GET /api/v1/cursos/:cursoId/estudiantes
router.get("/cursos/:cursoId/estudiantes", verificarToken, verificarCurso, async (req, res) => {
  try {
    const filas = await sql`
      SELECT m.matricula_id, e.nombre, e.cif
      FROM matriculas m
      JOIN estudiantes e ON e.estudiante_id = m.estudiante_id
      WHERE m.curso_id = ${req.cursoId}
      ORDER BY e.nombre
    `;

    res.json({
      status: "success",
      message: "Operación exitosa",
      data: filas.map((f) => ({
        matriculaId: Number(f.matricula_id),
        nombre: f.nombre,
        cif: f.cif
      }))
    });

  } catch (error) {
    console.error("Error en estudiantes del curso:", error);
    res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
});

module.exports = router;