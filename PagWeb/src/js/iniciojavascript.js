document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("loginForm");

    if (formulario) {
        formulario.addEventListener("submit", ingresar);
    }

});

async function ingresar(event) {

    event.preventDefault();

    // Nombres según la API (loginRequest): profesorId (integer) y dui (string)
    const profesorId = Number(document.getElementById("usuario1").value.trim());
    const dui = document.getElementById("clave1").value.trim();

    if (!profesorId || Number.isNaN(profesorId) || !dui) {
        alert("El ID del docente (número) y el DUI son obligatorios");
        return;
    }

    try {

        const respuesta = await fetch("http://localhost:3000/api/v1/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                profesorId,
                dui
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.message || "Error al ingresar");
        }

        // Guardar sesión (respuesta según el esquema "login" de la API)
        localStorage.setItem("token", datos.data.token);
        localStorage.setItem("profesorId", datos.data.profesorId);
        localStorage.setItem("nombre", datos.data.nombre);

        // Verificar en la base de datos y abrir el portal docente
        window.location.href = "portal-docente.html";

    } catch (error) {

        console.error(error);

        alert(error.message || "Error al conectar con el servidor");
    }
}