const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("el build excluye backend, secretos y artefactos de compilaciones anteriores", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "portal-public-test-"));
  try {
    fs.mkdirSync(path.join(root, "scripts"));
    fs.copyFileSync(path.join(__dirname, "../scripts/build-public.js"), path.join(root, "scripts/build-public.js"));
    const pages = ["index.html", "portal-docente.html", "asignatura.html", "calendario.html", "soporte.html", "tutorial.html"];
    fs.mkdirSync(path.join(root, "PagWeb/src/js"), { recursive: true });
    for (const page of pages) fs.writeFileSync(path.join(root, "PagWeb", page), "<h1>Prueba</h1>");
    fs.mkdirSync(path.join(root, "PagWeb/Backend"));
    fs.writeFileSync(path.join(root, "PagWeb/Backend/app.js"), "private backend");
    fs.writeFileSync(path.join(root, "PagWeb/Backend/.env"), "DATABASE_URL=sentinel");
    fs.writeFileSync(path.join(root, "PagWeb/src/.env"), "PRIVATE=sentinel");
    fs.writeFileSync(path.join(root, "PagWeb/src/js/app.js"), "public frontend");
    fs.symlinkSync(path.join(root, "PagWeb/Backend"), path.join(root, "PagWeb/src/private"), process.platform === "win32" ? "junction" : "dir");
    fs.mkdirSync(path.join(root, "public/Backend"), { recursive: true });
    fs.writeFileSync(path.join(root, "public/Backend/stale.js"), "stale secret");
    execFileSync(process.execPath, [path.join(root, "scripts/build-public.js")]);
    assert.equal(fs.readFileSync(path.join(root, "public/src/js/app.js"), "utf8"), "public frontend");
    for (const page of pages) assert.ok(fs.existsSync(path.join(root, "public", page)));
    for (const name of ["Backend", "src/.env", "src/private"]) assert.equal(fs.existsSync(path.join(root, "public", name)), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
