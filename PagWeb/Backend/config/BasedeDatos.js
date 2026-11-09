const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { neon } = require("@neondatabase/serverless");
// Prioridad: entorno, .env de la raíz y .env antiguo de Backend.
for (const envPath of [
  path.resolve(__dirname, "../../..", ".env"),
  path.resolve(__dirname, "..", ".env")
]) {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false, quiet: true });
}
if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL. Configúrala en el entorno o en un archivo .env privado.");
}
module.exports = neon(process.env.DATABASE_URL);
