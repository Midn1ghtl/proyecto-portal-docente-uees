/* sesion.js - compartido por las páginas del portal docente.
   Valida la sesión contra el servidor (que consulta la BD), muestra la página
   solo si es válida, llena los datos del docente y ofrece Portal.api() para
   llamar a la API con el token. */
(function () {
    // Si la página se abre desde tu computadora o desde tu red local (por IP, ej. 192.168.x.x),
    // usa el servidor local en el puerto 3000. En cualquier otro lugar usa Vercel.
    const host = window.location.hostname;
    const ES_LOCAL = ["localhost", "127.0.0.1"].includes(host) ||
        /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
    const API_URL = (ES_LOCAL
        ? `http://${host}:3000`
        : "https://portaldocenteuees.vercel.app") + "/api/v1";
    const LOGIN = "index.html";
    const CLAVES_SESION = ["token", "profesorId", "nombre", "carnet", "correo"];

    // Solo se borra la sesión; los borradores de notas se conservan
    function limpiarSesion() {
        CLAVES_SESION.forEach((k) => localStorage.removeItem(k));
    }

    function salir() {
        limpiarSesion();
        window.location.replace(LOGIN);
    }

    function esc(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    async function api(ruta, opciones = {}) {
        const resp = await fetch(API_URL + ruta, {
            ...opciones,
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + (localStorage.getItem("token") || ""),
                ...(opciones.headers || {})
            }
        });

        if (resp.status === 401) {
            salir();
            return new Promise(() => {}); // la página se está redirigiendo
        }

        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            throw new Error(json.message || "Error del servidor (" + resp.status + ")");
        }
        return json;
    }

    const domListo = new Promise((resolver) => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", resolver);
        } else {
            resolver();
        }
    });

    function poner(id, texto) {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    }

    // Se resuelve con los datos del docente cuando la sesión es válida
    const listo = (async () => {
        if (!localStorage.getItem("token")) {
            salir();
            return new Promise(() => {});
        }

        try {
            const r = await api("/sesion");
            const p = r.data;

            localStorage.setItem("profesorId", p.profesorId);
            localStorage.setItem("nombre", p.nombre || "");
            localStorage.setItem("carnet", p.carnet || "");
            localStorage.setItem("correo", p.correo || "");

            await domListo;

            poner("perfilNombre", p.nombre || "Docente");
            poner("perfilCarnet", p.carnet ? "Carné: " + p.carnet : "");
            poner("saludoNombre", p.nombre || "docente");

            const btnSalir = document.getElementById("btnCerrarSesion");
            if (btnSalir) {
                btnSalir.addEventListener("click", (e) => {
                    e.preventDefault();
                    salir();
                });
            }

            const oculto = document.getElementById("ocultar");
            if (oculto) oculto.remove();

            return p;
        } catch (error) {
            console.error(error);
            salir();
            return new Promise(() => {});
        }
    })();

    window.Portal = { api, listo, esc, salir, API_URL };
})();