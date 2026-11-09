document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("loginForm");

    if (formulario) {
        formulario.addEventListener("submit", ingresar);
    }
});

async function ingresar(event) {
    event.preventDefault();

    const profesorId = document.getElementById("usuario1").value.trim();
    const contrasena = document.getElementById("clave1").value;

    if (!profesorId || !contrasena) {
        alert("El ID del docente y la contraseña son obligatorios");
        return;
    }

    try {
        const respuesta = await fetch(`${window.PORTAL_API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                profesorId,
                contrasena
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