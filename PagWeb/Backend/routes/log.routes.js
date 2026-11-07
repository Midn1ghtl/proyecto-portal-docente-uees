const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sql = require("../config/BasedeDatos");

const router = express.Router();

// POST /api/v1/login  -> body según la API: { profesorId, dui }
router.post("/login", async (req, res) => {
  const { profesorId, dui } = req.body || {};
  const id = Number(profesorId);

  if (!profesorId || !dui || !Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "profesorId y dui son obligatorios"
    });
  }

  try {
    const filas = await sql`
      SELECT profesor_id, dui_hash, nombre, correo, carnet
      FROM profesores
      WHERE profesor_id = ${id}
    `;

    const profesor = filas[0];

    // Mismo mensaje si no existe o si el DUI no coincide
    const coincide = profesor
      ? await bcrypt.compare(String(dui), profesor.dui_hash)
      : false;

    if (!coincide) {
      return res.status(401).json({
        status: "error",
        message: "Credenciales incorrectas"
      });
    }

    // Token aleatorio: al cliente se le da el token, a la BD solo su hash
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await sql`DELETE FROM sesiones_docentes WHERE expires_at < NOW()`;
    await sql`
      INSERT INTO sesiones_docentes (token_hash, profesor_id, expires_at)
      VALUES (${tokenHash}, ${id}, NOW() + INTERVAL '8 hours')
    `;

    res.json({
      status: "success",
      message: "Operación exitosa",
      data: {
        profesorId: Number(profesor.profesor_id),
        nombre: profesor.nombre,
        correo: profesor.correo,
        carnet: profesor.carnet,
        token
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      status: "error",
      message: "Error interno del servidor"
    });
  }
});

// GET /api/v1/sesion -> consulta la BD: token válido y docente registrado
router.get("/sesion", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ status: "error", message: "No autorizado" });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const filas = await sql`
      SELECT p.profesor_id
      FROM sesiones_docentes s
      JOIN profesores p ON p.profesor_id = s.profesor_id
      WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW()
    `;

    if (!filas[0]) {
      return res.status(401).json({
        status: "error",
        message: "Sesión inválida o expirada"
      });
    }

    res.json({ status: "success", message: "Sesión válida" });

  } catch (error) {
    console.error("Error en sesion:", error);
    res.status(500).json({
      status: "error",
      message: "Error interno del servidor"
    });
  }
});

module.exports = router;