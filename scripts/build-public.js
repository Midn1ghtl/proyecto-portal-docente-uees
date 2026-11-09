const fs = require("node:fs");
const path = require("node:path");

// Publicar únicamente páginas y recursos del frontend, nunca PagWeb/Backend.
const root = path.resolve(__dirname, "..");
const source = path.join(root, "PagWeb");
const destination = path.join(root, "public");
const pages = [
  "index.html", "portal-docente.html", "asignatura.html",
  "calendario.html", "soporte.html", "tutorial.html"
];

function copyFile(from, to) {
  if (!fs.lstatSync(from).isFile()) throw new Error("Se esperaba un archivo: " + from);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyAssets(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    // No seguir enlaces simbólicos ni copiar archivos ocultos o secretos.
    if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
    const input = path.join(from, entry.name);
    const output = path.join(to, entry.name);
    if (entry.isDirectory()) copyAssets(input, output);
    else if (entry.isFile() && /\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf)$/i.test(entry.name)) {
      copyFile(input, output);
    }
  }
}

fs.rmSync(destination, { recursive: true, force: true });
for (const page of pages) copyFile(path.join(source, page), path.join(destination, page));
copyAssets(path.join(source, "src"), path.join(destination, "src"));
console.log("Frontend preparado en public/; backend excluido.");
