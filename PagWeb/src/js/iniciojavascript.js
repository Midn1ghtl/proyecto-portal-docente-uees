// Especifica la URL completa de tu backend en Vercel
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://portaldocenteuees.vercel.app";

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("loginForm");

    if (formulario) {
        formulario.addEventListener("submit", ingresar);
    }
});

async function ingresar(event) {
    event.preventDefault();

    const profesorId = Number(document.getElementById("usuario1").value.trim());
    const dui = document.getElementById("clave1").value.trim();

    if (!profesorId || Number.isNaN(profesorId) || !dui) {
        alert("El ID del docente (número) y el DUI son obligatorios");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/api/v1/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                profesorId,
                dui
            })
        });

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            throw new Error(datos.message || `Error al ingresar (${respuesta.status})`);
        }

        // Guardar sesión según el esquema de OpenAPI
        localStorage.setItem("token", datos.data.token);
        localStorage.setItem("profesorId", datos.data.profesorId);
        if (datos.data.nombre) {
            localStorage.setItem("nombre", datos.data.nombre);
        }

        window.location.href = "portal-docente.html";

    } catch (error) {
        console.error(error);
        alert(error.message || "Error al conectar con el servidor");
    }
}