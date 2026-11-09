const express = require("express");
const cors = require("cors");
const path = require("path");

const loginRoutes = require("./routes/log.routes");
const cursosRoutes = require("./routes/cursos.routes");
const notasRoutes = require("./routes/notas.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/v1", loginRoutes);
app.use("/api/v1", cursosRoutes);
app.use("/api/v1", notasRoutes);

app.use("/api/v1", (req, res) => res.status(404).json({ status: "error", message: "Ruta no encontrada" }));

// public/ se genera con npm run build y contiene solo el frontend.
app.use(express.static(path.resolve(__dirname, "..", "..", "public")));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === "entity.parse.failed" ? 400 : error.type === "entity.too.large" ? 413 : 500;
  res.status(status).json({ status: "error", message: status === 400 ? "JSON inválido" : status === 413 ? "Solicitud demasiado grande" : "Error interno del servidor" });
});

module.exports = app;
