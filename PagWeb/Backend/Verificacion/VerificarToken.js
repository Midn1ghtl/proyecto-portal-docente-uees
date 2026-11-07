const crypto = require("crypto");
const sql = require("../config/BasedeDatos");

// Comprueba en la BD que el token exista, no haya expirado y que el docente esté registrado.
// Si todo está bien deja el id del docente en req.profesorId.
async function verificarToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ status: "error", message: "No autorizado" });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const filas = await sql`
      SELECT s.profesor_id
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

    req.profesorId = Number(filas[0].profesor_id);
    next();

  } catch (error) {
    console.error("Error en verificarToken:", error);
    res.status(500).json({ status: "error", message: "Error interno del servidor" });
  }
}

module.exports = verificarToken;