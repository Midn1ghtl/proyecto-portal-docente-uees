console.log("DATABASE_URL existe:", !!process.env.DATABASE_URL);

const sql = require("./config/BasedeDatos");

sql`SELECT profesor_id, nombre FROM profesores`
  .then((filas) => console.log("Docentes en la BD:", filas))
  .catch((e) => console.error("ERROR de BD:", e.message));