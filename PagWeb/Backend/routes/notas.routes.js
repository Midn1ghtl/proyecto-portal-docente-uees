const express = require("express");
const sql = require("../config/BasedeDatos");
  const verificarToken = require("../Verificacion/VerificarToken");
  const verificarCurso = require("../Verificacion/VerifiCurso");

const router = express.Router();

const CAMPOS = ["nota1", "nota2", "nota3", "reposicion"];

const aNumero = (v) => (v === null || v === undefined ? null : Number(v));

// null/vacío = sin nota. Si trae valor debe ser un número entre 0 y 10.
function leerNota(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return { ok: true, valor: null };
  }
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0 || n > 10) return { ok: false };
  return { ok: true, valor: Math.round(n * 100) / 100 };
}

// Devuelve las calificaciones del curso con el formato "calificacion" de la API
async function obtenerCalificaciones(cursoId) {
  const filas = await sql`
    SELECT c.calificacion_id, c.matricula_id, c.nota1, c.nota2, c.nota3, c.reposicion, c.nota_final
    FROM calificaciones c
    JOIN matriculas m ON m.matricula_id = c.matricula_id
    WHERE m.curso_id = ${cursoId}
    ORDER BY c.matricula_id
  `;

  const pubs = await sql`
    SELECT registro, publicado FROM publicaciones_registros WHERE curso_id = ${cursoId}
  `;

  const registrosPublicados = { registro1: false, registro2: false, registro3: false };
  pubs.forEach((p) => { registrosPublicados["registro" + p.registro] = p.publicado; });

  // Resumen de solo lectura: PUBLICADO si al menos un registro está publicado
  const estado = Object.values(registrosPublicados).some(Boolean) ? "PUBLICADO" : "BORRADOR";

  return filas.map((f) => ({
    calificacionId: Number(f.calificacion_id),
    matriculaId: Number(f.matricula_id),
    nota1: aNumero(f.nota1),
    nota2: aNumero(f.nota2),
    nota3: aNumero(f.nota3),
    reposicion: aNumero(f.reposicion),
    notaFinal: aNumero(f.nota_final),
    estado,
    registrosPublicados: { ...registrosPublicados }
  }));
}

// GET /api/v1/cursos/:cursoId/calificaciones
router.get("/cursos/:cursoId/calificaciones", verificarToken, verificarCurso, async (req, res) => {
  try {
    const data = await obtenerCalificaciones(req.cursoId);
    res.json({ status: "success", message: "Operación exitosa", data });
  } catch (error) {
    console.error("Error al obtener calificaciones:", error);
    res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
});

// POST /api/v1/cursos/:cursoId/calificaciones  -> guarda (o actualiza) como borrador
// Cada elemento reemplaza las cuatro notas de esa matrícula. notaFinal la calcula la BD.
router.post("/cursos/:cursoId/calificaciones", verificarToken, verificarCurso, async (req, res) => {
  const lista = req.body && req.body.calificaciones;

  if (!Array.isArray(lista) || lista.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "Se requiere una lista de calificaciones"
    });
  }

  try {
    const matriculas = await sql`
      SELECT matricula_id FROM matriculas WHERE curso_id = ${req.cursoId}
    `;
    const permitidas = new Set(matriculas.map((m) => Number(m.matricula_id)));

    const consultas = [];

    for (const e of lista) {
      if (!e || typeof e !== "object") {
        return res.status(400).json({ status: "error", message: "Datos inválidos" });
      }

      const matriculaId = Number(e.matriculaId);
      if (!permitidas.has(matriculaId)) {
        return res.status(400).json({
          status: "error",
          message: `La matrícula ${e.matriculaId} no pertenece a este curso`
        });
      }

      const notas = [];
      for (const campo of CAMPOS) {
        // El ejemplo del contrato escribe "reposición" con tilde; se aceptan ambas
        const bruto = campo === "reposicion" ? (e.reposicion ?? e["reposición"]) : e[campo];
        const r = leerNota(bruto);
        if (!r.ok) {
          return res.status(400).json({
            status: "error",
            message: `Nota inválida en ${campo} (matrícula ${matriculaId}): debe estar entre 0 y 10`
          });
        }
        notas.push(r.valor);
      }

      const [n1, n2, n3, rep] = notas;

      consultas.push(sql`
        INSERT INTO calificaciones (matricula_id, nota1, nota2, nota3, reposicion)
        VALUES (${matriculaId}, ${n1}, ${n2}, ${n3}, ${rep})
        ON CONFLICT (matricula_id) DO UPDATE SET
          nota1      = EXCLUDED.nota1,
          nota2      = EXCLUDED.nota2,
          nota3      = EXCLUDED.nota3,
          reposicion = EXCLUDED.reposicion
      `);
    }

    // Todo o nada: si una falla, no se guarda ninguna
    await sql.transaction(consultas);

    const data = await obtenerCalificaciones(req.cursoId);

    res.json({
      status: "success",
      message: "Calificaciones guardadas como borrador",
      data
    });

  } catch (error) {
    console.error("Error al guardar calificaciones:", error);
    res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
});

module.exports = router;