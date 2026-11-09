const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const dotenv = require("dotenv");
// No importa ni modifica la configuración usada por el login.
for (const file of [path.resolve(__dirname,"../../../.env"), path.resolve(__dirname,"../.env")]) {
  if (fs.existsSync(file)) dotenv.config({ path: file, override: false, quiet: true });
}
let pool;
function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL en el entorno privado del backend");
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5,
      idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
    pool.on("error", error => console.error("Conexión académica:", error.code || error.name));
  }
  return pool;
}
module.exports = {
  query: (text, values) => getPool().query(text, values),
  async transaction(work, readOnly = false) {
    const client = await getPool().connect();
    try {
      await client.query(readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { client.release(); }
  },
  async close() { if (pool) { await pool.end(); pool = null; } }
};
