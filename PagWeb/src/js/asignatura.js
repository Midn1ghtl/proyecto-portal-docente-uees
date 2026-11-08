 const CAMPOS = ["nota1", "nota2", "nota3", "reposicion"];
            const COLUMNAS = 9;
 
            // Reglas de calificación (el servidor aplica las mismas)
            const PESOS = { nota1: 0.30, nota2: 0.30, nota3: 0.40 };
            const NOTA_APROBACION = 6;
            const SUMA_PARA_REPOSICION = 10;
 
            const redondear = (n) => Math.round(n * 100 + 1e-9) / 100;
 
            function calcular(n) {
                const a = n.nota1 ?? null, b = n.nota2 ?? null, c = n.nota3 ?? null;
                const notaFinal = (a !== null && b !== null && c !== null)
                    ? redondear(a * PESOS.nota1 + b * PESOS.nota2 + c * PESOS.nota3)
                    : null;
                return {
                    notaFinal,
                    aprobado: notaFinal === null ? null : notaFinal >= NOTA_APROBACION,
                    derechoReposicion: (a !== null && b !== null) ? a + b >= SUMA_PARA_REPOSICION : null
                };
            }
 
            function htmlResultado(n) {
                const r = calcular(n);
                if (r.notaFinal === null) return "—";
                const etiqueta = r.aprobado
                    ? '<span class="badge text-bg-success">Aprobado</span>'
                    : '<span class="badge text-bg-danger">Reprobado</span>';
                return `${r.notaFinal.toFixed(2)} ${etiqueta}`;
            }
 
            let cursos = [];
            let cursoActual = null;
            let estudiantes = [];
            let servidor = {};   // matriculaId -> calificación guardada en la BD
            let borrador = {};   // matriculaId -> notas editadas aún sin enviar
 
            const $ = (id) => document.getElementById(id);
            const esc = Portal.esc;
 
            const filaMensaje = (texto) => `<tr><td colspan="${COLUMNAS}">${texto}</td></tr>`;
 
            const claveBorrador = () =>
                `borrador_notas_${localStorage.getItem("profesorId")}_${cursoActual.id_curso}`;
 
            function guardarBorrador() {
                try {
                    if (Object.keys(borrador).length) {
                        localStorage.setItem(claveBorrador(), JSON.stringify(borrador));
                    } else {
                        localStorage.removeItem(claveBorrador());
                    }
                } catch (e) { console.error(e); }
            }
 
            function leerBorrador() {
                try {
                    return JSON.parse(localStorage.getItem(claveBorrador()) || "{}");
                } catch (e) {
                    return {};
                }
            }
 
            function aviso(texto, tipo) {
                const caja = $("mensaje");
                if (!texto) { caja.className = "alert d-none"; return; }
                caja.className = `alert alert-${tipo}`;
                caja.textContent = texto;
            }
 
            const invalida = (v) => v !== null && !(v >= 0 && v <= 10);
            const igual = (a, b) => (a ?? null) === (b ?? null);
 
            // Valor a mostrar: lo editado (borrador) o, si no, lo guardado en la BD
            function valor(matriculaId, campo) {
                const b = borrador[matriculaId];
                if (b && campo in b) return b[campo];
                const s = servidor[matriculaId];
                return s ? (s[campo] ?? null) : null;
            }
 
            const formatoNota = (n) => (n === null || n === undefined ? "—" : Number(n).toFixed(2));
 
            function pintarTabla() {
                const cuerpo = $("cuerpoNotas");
 
                if (!estudiantes.length) {
                    cuerpo.innerHTML = filaMensaje("Esta asignatura no tiene estudiantes matriculados.");
                    actualizarEstado();
                    return;
                }
 
                cuerpo.innerHTML = estudiantes.map((e) => {
                    const m = e.matriculaId;
                    const actuales = {
                        nota1: valor(m, "nota1"),
                        nota2: valor(m, "nota2"),
                        nota3: valor(m, "nota3")
                    };
                    const sinReposicion = calcular(actuales).derechoReposicion === false;
 
                    const celdas = CAMPOS.map((c) => {
                        const v = valor(m, c);
                        const bloqueado = c === "reposicion" && sinReposicion;
                        return `<td>
                            <input type="number" class="form-control form-control-sm nota${invalida(v) ? " is-invalid" : ""}"
                                style="width:90px" min="0" max="10" step="0.01"
                                data-campo="${c}" value="${v === null ? "" : v}"
                                ${bloqueado ? `disabled title="Sin derecho a reposición: Nota 1 + Nota 2 debe sumar ${SUMA_PARA_REPOSICION} o más"` : ""}>
                        </td>`;
                    }).join("");
 
                    return `<tr data-m="${m}" class="${borrador[m] ? "table-warning" : ""}">
                        <td><img src="src/assets/img/avatar.png" class="rounded-circle" width="40" height="40" alt="Foto"></td>
                        <td>${esc(e.cif || "—")}</td>
                        <td>${esc(e.nombre)}</td>
                        ${celdas}
                        <td class="fw-semibold celda-final">${htmlResultado(actuales)}</td>
                        <td>—</td>
                    </tr>`;
                }).join("");
 
                actualizarEstado();
            }
 
            function actualizarEstado() {
                const n = Object.keys(borrador).length;
                $("estadoBorrador").textContent = n
                    ? `${n} estudiante(s) con cambios sin enviar (guardados temporalmente en este navegador).`
                    : "Sin cambios pendientes.";
                $("btnEnviar").disabled = n === 0;
                $("btnDescartar").disabled = n === 0;
            }
 
            // Cada vez que se escribe una nota se guarda el borrador temporal
            $("cuerpoNotas").addEventListener("input", (ev) => {
                const input = ev.target.closest(".nota");
                if (!input) return;
 
                const fila = input.closest("tr");
                const m = Number(fila.dataset.m);
 
                const notas = {};
                fila.querySelectorAll(".nota").forEach((inp) => {
                    notas[inp.dataset.campo] = inp.value === "" ? null : Number(inp.value);
                });
 
                // Sin derecho a reposición: se bloquea y se limpia ese campo
                const campoRep = fila.querySelector('[data-campo="reposicion"]');
                if (calcular(notas).derechoReposicion === false) {
                    campoRep.value = "";
                    campoRep.disabled = true;
                    campoRep.title = `Sin derecho a reposición: Nota 1 + Nota 2 debe sumar ${SUMA_PARA_REPOSICION} o más`;
                    notas.reposicion = null;
                } else {
                    campoRep.disabled = false;
                    campoRep.removeAttribute("title");
                }
 
                fila.querySelectorAll(".nota").forEach((inp) => {
                    inp.classList.toggle("is-invalid", invalida(notas[inp.dataset.campo]));
                });
 
                // Nota final y estado en vivo
                fila.querySelector(".celda-final").innerHTML = htmlResultado(notas);
 
                const guardada = servidor[m];
                const sinCambios = CAMPOS.every((c) => igual(notas[c], guardada ? guardada[c] : null));
 
                if (sinCambios) delete borrador[m]; else borrador[m] = notas;
 
                fila.classList.toggle("table-warning", !sinCambios);
                guardarBorrador();
                actualizarEstado();
                aviso("");
            });
 
            async function enviar() {
                const filas = Object.entries(borrador).map(([m, notas]) => ({
                    matriculaId: Number(m),
                    nota1: notas.nota1,
                    nota2: notas.nota2,
                    nota3: notas.nota3,
                    reposicion: notas.reposicion
                }));
 
                if (!filas.length) return;
 
                if (filas.some((f) => CAMPOS.some((c) => invalida(f[c])))) {
                    aviso("Hay notas fuera del rango 0 a 10. Corrígelas antes de enviar.", "danger");
                    return;
                }
 
                $("btnEnviar").disabled = true;
 
                try {
                    const r = await Portal.api(`/cursos/${cursoActual.id_curso}/calificaciones`, {
                        method: "POST",
                        body: JSON.stringify({ calificaciones: filas })
                    });
 
                    servidor = {};
                    r.data.forEach((c) => { servidor[c.matriculaId] = c; });
                    borrador = {};
                    guardarBorrador();
                    pintarTabla();
                    aviso("Notas guardadas en la base de datos como borrador.", "success");
 
                } catch (error) {
                    console.error(error);
                    aviso(error.message || "No se pudieron guardar las notas.", "danger");
                    actualizarEstado();
                }
            }
 
            function descartar() {
                if (!confirm("¿Descartar los cambios que no has enviado?")) return;
                borrador = {};
                guardarBorrador();
                pintarTabla();
                aviso("");
            }
 
            async function cargarCurso(idCurso) {
                cursoActual = cursos.find((c) => c.id_curso === idCurso);
 
                $("detalleAsignatura").textContent =
                    `${cursoActual.nombre_asignatura} · ${cursoActual.codigo_asignatura || ""} · ${cursoActual.horario || "Sin horario"} · ${cursoActual.total_estudiantes} estudiantes`;
 
                $("cuerpoNotas").innerHTML = filaMensaje("Cargando...");
                aviso("");
 
                try {
                    const [est, cal] = await Promise.all([
                        Portal.api(`/cursos/${idCurso}/estudiantes`),
                        Portal.api(`/cursos/${idCurso}/calificaciones`)
                    ]);
 
                    estudiantes = est.data;
                    servidor = {};
                    cal.data.forEach((c) => { servidor[c.matriculaId] = c; });
                    borrador = leerBorrador();
                    pintarTabla();
 
                } catch (error) {
                    console.error(error);
                    $("cuerpoNotas").innerHTML = filaMensaje("No se pudo cargar la información.");
                    aviso(error.message, "danger");
                }
            }
 
            $("btnEnviar").addEventListener("click", enviar);
            $("btnDescartar").addEventListener("click", descartar);
 
            $("selCurso").addEventListener("change", (e) => {
                const id = Number(e.target.value);
                history.replaceState(null, "", `asignatura.html?cursoId=${id}`);
                cargarCurso(id);
            });
 
            Portal.listo.then(async (docente) => {
                try {
                    const r = await Portal.api(`/profesor/${docente.profesorId}/cursos`);
                    cursos = r.data;
 
                    if (!cursos.length) {
                        $("selCurso").innerHTML = "<option>No tienes asignaturas asignadas</option>";
                        $("selCurso").disabled = true;
                        $("detalleAsignatura").textContent = "";
                        $("cuerpoNotas").innerHTML = filaMensaje("No tienes asignaturas asignadas.");
                        return;
                    }
 
                    // El horario distingue las secciones de una misma materia
                    $("selCurso").innerHTML = cursos.map((c) =>
                        `<option value="${c.id_curso}">${esc(c.nombre_asignatura)}${c.horario ? " - " + esc(c.horario) : ""}</option>`).join("");
 
                    const pedido = Number(new URLSearchParams(location.search).get("cursoId"));
                    const inicial = cursos.find((c) => c.id_curso === pedido) || cursos[0];
 
                    $("selCurso").value = inicial.id_curso;
                    cargarCurso(inicial.id_curso);
 
                } catch (error) {
                    console.error(error);
                    $("cuerpoNotas").innerHTML = filaMensaje("No se pudieron cargar las asignaturas.");
                    aviso(error.message, "danger");
                }
            });