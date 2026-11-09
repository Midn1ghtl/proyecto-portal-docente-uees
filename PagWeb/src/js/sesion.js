// esto va en los head de las páginas que requieren sesión iniciada

(function () {
    const API = window.PORTAL_API_URL;
    const PAGINA_LOGIN = "index.html";

    const almacen = () => localStorage.getItem("token") ? localStorage : sessionStorage;

    function limpiarSesion() {
        ["token", "profesorId", "nombre"].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    }

    function irAlLogin() {
        limpiarSesion();
        window.location.replace(PAGINA_LOGIN);
    }

    function mostrarPagina() {
        const estilo = document.getElementById("ocultar");
        if (estilo) estilo.remove();
    }

    // Escapa texto antes de meterlo en innerHTML
    function esc(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    // Llamada a la API con el token; lanza Error con el mensaje del servidor si falla
    async function api(ruta, opciones = {}) {
        let respuesta;
        try {
            respuesta = await fetch(API + ruta, {
                ...opciones,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + almacen().getItem("token"),
                    ...(opciones.headers || {})
                }
            });
        } catch {
            throw new Error("No se pudo conectar con la API. Comprueba que el portal esté publicado o que el servidor local esté iniciado.");
        }

        let datos = {};
        try { datos = await respuesta.json(); } catch (e) { /* respuesta sin JSON */ }

        if (respuesta.status === 401) {
            throw new Error(datos.message || "Sesión inválida o expirada");
        }
        if (!respuesta.ok) {
            throw new Error(datos.message || "Error en la solicitud");
        }
        return datos;
    }

    function pintarDocente(docente) {
        const poner = (id, texto) => {
            const el = document.getElementById(id);
            if (el) el.textContent = texto;
        };
        poner("perfilCarnet", docente.carnet ? "Carné: " + docente.carnet : "");
        poner("perfilNombre", docente.nombre || "");
        poner("saludoNombre", docente.nombre || "");

        const salir = document.getElementById("btnCerrarSesion");
        if (salir) {
            salir.addEventListener("click", (e) => {
                e.preventDefault();
                irAlLogin();
            });
        }
    }

    // Verifica la sesión en el servidor y entrega los datos del docente
    const listo = new Promise((resolver, rechazar) => {
        if (!almacen().getItem("token")) {
            irAlLogin();
            return;
        }

        api("/sesion")
            .then((r) => {
                const docente = {
                    profesorId: Number(r.data?.profesorId ?? almacen().getItem("profesorId")),
                    nombre: r.data?.nombre ?? almacen().getItem("nombre"),
                    carnet: r.data?.carnet ?? ""
                };

                const mostrar = () => { pintarDocente(docente); mostrarPagina(); resolver(docente); };

                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", mostrar);
                } else {
                    mostrar();
                }
            })
            .catch((error) => {
                console.error("No se pudo verificar la sesión:", error);
                alert(error.message || "No se pudo verificar la sesión con el servidor.");
                irAlLogin();
                rechazar(error);
            });
    });

    // Evita el aviso "Uncaught (in promise)" si nadie escucha el rechazo
    listo.catch(() => {});

    window.Portal = { api, esc, listo };
})();