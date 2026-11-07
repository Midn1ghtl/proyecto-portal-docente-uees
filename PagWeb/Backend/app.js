const express = require("express");
const cors = require("cors");
const path = require("path");

const loginRoutes = require("./routes/log.routes");
const cursosRoutes = require("./routes/cursos.routes");
const notasRoutes = require("./routes/notas.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", loginRoutes);
app.use("/api/v1", cursosRoutes);
app.use("/api/v1", notasRoutes);

app.use(express.static(path.resolve(__dirname, "..")));

module.exports = app;
