const crypto = require("crypto");

// El esquema nuevo no tiene tabla de sesiones, así que el token va firmado (HMAC-SHA256)
// y lleva dentro el id del docente y su fecha de expiración. No hace falta guardar nada en la BD.
// Define SESSION_SECRET en .env / Vercel; si no existe, se deriva de DATABASE_URL.
const HORAS_SESION = 8;

const secreto = () =>
  process.env.SESSION_SECRET ||
  crypto.createHash("sha256").update("portal-uees:" + (process.env.DATABASE_URL || "")).digest("hex");

const firmar = (dato) =>
  crypto.createHmac("sha256", secreto()).update(dato).digest("base64url");

function crearToken(profesorId) {
  const payload = Buffer.from(JSON.stringify({
    p: String(profesorId),
    exp: Date.now() + HORAS_SESION * 60 * 60 * 1000
  })).toString("base64url");
  return `${payload}.${firmar(payload)}`;
}

// Devuelve el profesorId (texto) si el token es válido y no ha expirado; si no, null.
function leerToken(token) {
  if (typeof token !== "string") return null;
  const [payload, firma] = token.split(".");
  if (!payload || !firma) return null;

  const esperada = firmar(payload);
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!datos.p || !(datos.exp > Date.now())) return null;
    return String(datos.p);
  } catch {
    return null;
  }
}

function tokenDeCabecera(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

module.exports = { crearToken, leerToken, tokenDeCabecera };
