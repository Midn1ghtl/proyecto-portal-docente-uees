require("dotenv").config();
const express = require("express");
const cors = require("cors");

const loginRoutes = require("./routes/log.routes");
const cursosRoutes = require("./routes/cursos.routes");
const notasRoutes = require("./routes/notas.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Muestra cada petición que llega (antes de las rutas, para que las registre todas)
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use("/api/v1", loginRoutes);
app.use("/api/v1", cursosRoutes);
app.use("/api/v1", notasRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});