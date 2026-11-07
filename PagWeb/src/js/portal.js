// Asignaturas del docente que inició sesión (GET /profesor/{profesorId}/cursos)
            Portal.listo.then(async (docente) => {
                const lista = document.getElementById("listaAsignaturas");

                try {
                    const r = await Portal.api(`/profesor/${docente.profesorId}/cursos`);

                    if (!r.data.length) {
                        lista.innerHTML = "<p>No tienes asignaturas asignadas.</p>";
                        return;
                    }

                    lista.innerHTML = r.data.map((c) => `
                        <a href="asignatura.html?cursoId=${c.id_curso}" style="text-decoration:none;color:inherit">
                            <div class="asignatura">
                                <h4>${Portal.esc(c.nombre_asignatura)}</h4>
                                <p>${Portal.esc(c.codigo_asignatura || "")} · ${Portal.esc(c.horario || "Sin horario")} · ${c.total_estudiantes} estudiantes</p>
                            </div>
                        </a>`).join("");

                } catch (error) {
                    console.error(error);
                    lista.innerHTML = "<p>No se pudieron cargar las asignaturas.</p>";
                }
            });