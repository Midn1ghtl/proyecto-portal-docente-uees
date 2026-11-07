// Conexion con la base de datos en neon 
//const { neon } = require('@neondatabase/serverless');
//require('dotenv').config();

//const sql = neon(process.env.postgresql_url);

// --- CÓDIGO DE PRUEBA DE CONEXIÓN ---
//async function probarConexion() {
//  try {
//    const resultado = await sql`SELECT NOW()`;
//    console.log('Conexión exitosa a Neon PostgreSQL. Hora del servidor:', resultado[0].now);
//  } catch (error) {
//    console.error('Error de conexión:', error);
//  }
//}

//probarConexion();
// ------------------------------------

//module.exports = sql;

//require("dotenv").config();

//const http = require("http");
//const { neon } = require("@neondatabase/serverless");

//const sql = neon(process.env.DATABASE_URL);

//const requestHandler = async (req, res) => {
  //const result = await sql`SELECT version()`;
  //const { version } = result[0];
  //res.writeHead(200, { "Content-Type": "text/plain" });
  //res.end(version);
//};

//http.createServer(requestHandler).listen(3000, () => {
  //console.log("Server running at http://localhost:3000");
//});

require("dotenv").config();

const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

module.exports = sql;