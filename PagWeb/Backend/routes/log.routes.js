const express = require("express");
const bcrypt = require("bcryptjs");
const sql = require("../config/BasedeDatos");
const { crearToken, leerToken, tokenDeCabecera } = require("../Verificacion/TokenSesion");

const router = express.Router();

// El ProfesorId es texto de hasta 9 caracteres (ej. "024565789"): NO convertir a número,
// porque se perderían los ceros a la izquierda.
const ID_VALIDO = /^[A-Za-z0-9]{1,9}$/;

const nombreCompleto = (p) => `${p.nombre} ${p.apellidos}`.trim();

// POST /api/v1/login  -> body: { profesorId, contrasena }  (también se acepta "dui" por compatibilidad)
router.post("/login", async (req, res) => {
  const cuerpo = req.body || {};
  const id = String(cuerpo.profesorId ?? "").trim();
  const contrasena = cuerpo.contrasena ?? cuerpo.password ?? cuerpo.dui;

  if (!id || !contrasena || !ID_VALIDO.test(id)) {
    return res.status(400).json({
      status: "error",
      message: "profesorId y contrasena son obligatorios"
    });
  }

  try {
    const filas = await sql`
      SELECT profesorid, nombre, apellidos, email, contrahash
      FROM universidaduees.profesores
      WHERE profesorid = ${id}
    `;

    const profesor = filas[0];

    // Mismo mensaje si no existe o si la contraseña no coincide
    const coincide = profesor
      ? await bcrypt.compare(String(contrasena), profesor.contrahash)
      : false;

    if (!coincide) {
      return res.status(401).json({
        status: "error",
        message: "Credenciales incorrectas"
      });
    }

    res.json({
      status: "success",
      message: "Operación exitosa",
      data: {
        profesorId: String(profesor.profesorid),
        nombre: nombreCompleto(profesor),
        correo: profesor.email,
        carnet: String(profesor.profesorid),
        token: crearToken(profesor.profesorid)
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

// GET /api/v1/sesion -> token válido y docente registrado.
// Devuelve nombre e identificación para mostrarlos en el portal.
router.get("/sesion", async (req, res) => {
  const token = tokenDeCabecera(req);

  if (!token) {
    return res.status(401).json({ status: "error", message: "No autorizado" });
  }

  const id = leerToken(token);

  if (!id) {
    return res.status(401).json({ status: "error", message: "Sesión inválida o expirada" });
  }

  try {
    const filas = await sql`
      SELECT profesorid, nombre, apellidos
      FROM universidaduees.profesores
      WHERE profesorid = ${id}
    `;

    if (!filas[0]) {
      return res.status(401).json({ status: "error", message: "Sesión inválida o expirada" });
    }

    res.json({
      status: "success",
      message: "Sesión válida",
      data: {
        profesorId: String(filas[0].profesorid),
        nombre: nombreCompleto(filas[0]),
        carnet: String(filas[0].profesorid)
      }
    });

  } catch (error) {
    console.error("Error en sesion:", error);
    res.status(500).json({
      status: "error",
      message: "Error interno del servidor"
    });
  }
});

module.exports = router;
