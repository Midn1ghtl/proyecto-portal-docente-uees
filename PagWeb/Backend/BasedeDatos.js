// Conexion con la base de datos en neon 
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.postgresql_url);

// --- CÓDIGO DE PRUEBA DE CONEXIÓN ---
async function probarConexion() {
  try {
    const resultado = await sql`SELECT NOW()`;
    console.log('Conexión exitosa a Neon PostgreSQL. Hora del servidor:', resultado[0].now);
  } catch (error) {
    console.error('Error de conexión:', error);
  }
}

probarConexion();
// ------------------------------------

module.exports = sql;