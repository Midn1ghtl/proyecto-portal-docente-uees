require("dotenv").config();
const express = require("express");
const cors = require("cors");

const loginRoutes = require("./routes/log.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Muestra cada petición que llega
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use("/api/v1", loginRoutes);

app.listen(3000, () => {
  console.log("Servidor listo en http://127.0.0.1:3000");
});