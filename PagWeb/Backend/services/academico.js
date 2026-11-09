const bcrypt = require("bcryptjs");
const CAMPOS = ["nota1", "nota2", "nota3", "reposicion"];
const fallo = (status, message) => Object.assign(new Error(message), { status });
function id(valor, nombre = "Identificador") {
  const n = typeof valor === "number" ? valor : /^\d+$/.test(String(valor)) ? Number(valor) : NaN;
  if (!Number.isSafeInteger(n) || n <= 0 || n > 2147483647) throw fallo(400, nombre + " inválido");
  return n;
}
// El ID del docente es textual: conserva ceros iniciales y letras.
function idProfesor(valor) {
  const texto = String(valor ?? '');
  if (!/^[A-Za-z0-9]{1,9}$/.test(texto)) throw fallo(400, 'profesorId inválido');
  return texto;
}
function objeto(value) { return value && typeof value === "object" && !Array.isArray(value); }
function notas(body, conMatricula = false) {
  const permitidos = conMatricula ? [...CAMPOS, "matriculaId"] : CAMPOS;
  if (!objeto(body) || Object.keys(body).some(k => !permitidos.includes(k)) ||
      !CAMPOS.some(k => Object.hasOwn(body,k))) throw fallo(400,"Envía únicamente notas modificables y al menos una nota");
  const salida = {};
  for (const campo of CAMPOS) if (Object.hasOwn(body,campo)) {
    const v = body[campo];
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 10))
      throw fallo(400,campo + " debe ser un número entre 0 y 10 o null");
    salida[campo] = v === null ? null : Math.round((v + Number.EPSILON)*100)/100;
  }
  if (conMatricula) {
    if(typeof body.matriculaId!=='number')throw fallo(400,"matriculaId debe ser un entero numérico");
    salida.matriculaId = id(body.matriculaId,"matriculaId");
  }
  return salida;
}
function correo(value) {
  if (typeof value !== "string" || value.trim().length > 150 || /[\u0000-\u001f]/.test(value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    throw fallo(400,"Correo electrónico inválido (máximo 150 caracteres)");
  return value.trim().toLowerCase();
}
const SELECT_CURSO = `SELECT a.asignaturaid AS id_curso, a.profesorid, a.cursoid AS carrera_id,
  coalesce(to_jsonb(a)->>'codigo','') AS codigo_asignatura, a.nombre AS nombre_asignatura,
  concat_ws(' ',p.nombre,p.apellidos) AS profesor, c.horario,
  (SELECT count(*)::int FROM universidaduees.matricula m WHERE m.asignaturaid=a.asignaturaid) AS total_estudiantes
  FROM universidaduees.asignaturas a JOIN universidaduees.cursos c ON c.cursoid=a.cursoid
  JOIN universidaduees.profesores p ON p.profesorid=a.profesorid`;
function cursoPublico(row) {
  const { profesorid, carrera_id, ...publico } = row;
  return publico;
}
async function exigirCurso(db,profesorId,cursoId,bloquear=false) {
  const result = await db.query(SELECT_CURSO+" WHERE a.asignaturaid=$1"+(bloquear ? " FOR UPDATE OF a" : ""),[cursoId]);
  const curso = result.rows[0];
  if (!curso) throw fallo(404,"Curso no encontrado");
  if (String(curso.profesorid)!==profesorId) throw fallo(403,"No tienes acceso a este curso");
  return curso;
}
async function estadoEsquema(db) {
  const {rows}=await db.query(`SELECT
    to_regclass('universidaduees.publicaciones_registros') IS NOT NULL AS publicaciones,
    (SELECT count(*)=4 FROM information_schema.columns WHERE table_schema='universidaduees'
      AND table_name='calificaciones' AND column_name IN ('nota1','nota2','nota3','notafinal') AND is_nullable='YES') AS borradores,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='universidaduees'
      AND table_name='calificaciones' AND column_name='calificacionid' AND (is_identity='YES' OR column_default IS NOT NULL)) AS ids`);
  return {edicionDisponible: rows[0].publicaciones && rows[0].borradores && rows[0].ids,
    publicacionDisponible: rows[0].publicaciones};
}
async function publicaciones(db,cursoId) {
  if (!(await estadoEsquema(db)).publicacionDisponible) return {registro1:false,registro2:false,registro3:false};
  const result = await db.query("SELECT registro,publicado FROM universidaduees.publicaciones_registros WHERE asignaturaid=$1",[cursoId]);
  const flags = {registro1:false,registro2:false,registro3:false};
  for (const row of result.rows) flags['registro'+row.registro]=row.publicado;
  return flags;
}
async function leerNotas(db,cursoId) {
  const esquema=await estadoEsquema(db);
  const flags = await publicaciones(db,cursoId);
  const {rows} = await db.query(`SELECT c.calificacionid AS "calificacionId", m.estudianteid AS "matriculaId",
    c.nota1,c.nota2,c.nota3,c.reposicion,CASE WHEN c.nota1 IS NULL OR c.nota2 IS NULL OR c.nota3 IS NULL THEN NULL ELSE round(c.nota1*0.30+c.nota2*0.30+c.nota3*0.40,2) END AS "notaFinal"
    FROM universidaduees.calificaciones c JOIN universidaduees.matricula m
      ON m.asignaturaid=c.asignaturaid AND m.estudianteid=c.estudianteid
    WHERE m.asignaturaid=$1 ORDER BY m.estudianteid`,[cursoId]);
  return rows.map(r=>({...r,...Object.fromEntries([...CAMPOS,"notaFinal"].map(k=>[k,r[k]===null?null:Number(r[k])])),
    estado:!esquema.publicacionDisponible?"SIN_ESTADO":Object.values(flags).some(Boolean)?"PUBLICADO":"BORRADOR",registrosPublicados:{...flags}}));
}
async function despublicar(db,cursoId,registros) {
  if (!registros.length) return;
  await db.query(`UPDATE universidaduees.publicaciones_registros SET publicado=false,actualizado_en=now()
    WHERE asignaturaid=$1 AND registro=ANY($2::smallint[])`,[cursoId,registros]);
}
function entradasDe(body, permitirVacio=false) {
      if (!objeto(body) || Object.keys(body).some(k=>k!=="calificaciones") || !Array.isArray(body.calificaciones) ||
          (!permitirVacio && !body.calificaciones.length) || body.calificaciones.length>1000) throw fallo(400,"Envía entre 1 y 1000 calificaciones");
  const entradas=body.calificaciones.map(e=>notas(e,true));
      if (new Set(entradas.map(e=>e.matriculaId)).size!==entradas.length) throw fallo(400,"No repitas la misma matrícula en una petición");
  return entradas;
}
async function guardarEn(tx,cursoId,profesorId,entradas) {
  if (!entradas.length) return [];
        const result=await tx.query(`SELECT m.estudianteid,c.nota1,c.nota2,c.nota3,c.reposicion
          FROM universidaduees.matricula m LEFT JOIN universidaduees.calificaciones c
          ON c.asignaturaid=m.asignaturaid AND c.estudianteid=m.estudianteid
          WHERE m.asignaturaid=$1 AND m.estudianteid=ANY($2::int[])`,[cursoId,entradas.map(e=>e.matriculaId)]);
        if (result.rows.length!==entradas.length) throw fallo(400,"Una matrícula no pertenece a este curso");
        const guardadas=new Map(result.rows.map(r=>[r.estudianteid,r]));const registros=new Set();
        const datos=entradas.map(e=>{
          const previa=guardadas.get(e.matriculaId);const fila={estudianteid:previa.estudianteid};
          CAMPOS.forEach((campo,i)=>{
            const antes=previa[campo]===null?null:Number(previa[campo]);
            fila[campo]=Object.hasOwn(e,campo)?e[campo]:antes;
            if(i<3&&antes!==fila[campo])registros.add(i+1);
          });return fila;
        });
        await tx.query(`INSERT INTO universidaduees.calificaciones
          (asignaturaid,estudianteid,docenteid,nota1,nota2,nota3,reposicion,notafinal)
          SELECT $1,x.estudianteid,$2,x.nota1,x.nota2,x.nota3,x.reposicion,
            CASE WHEN x.nota1 IS NULL OR x.nota2 IS NULL OR x.nota3 IS NULL THEN NULL
                 ELSE round(x.nota1*0.30+x.nota2*0.30+x.nota3*0.40,2) END
          FROM jsonb_to_recordset($3::jsonb) AS x(estudianteid int,nota1 numeric,nota2 numeric,nota3 numeric,reposicion numeric)
          ON CONFLICT(asignaturaid,estudianteid) DO UPDATE SET
            nota1=excluded.nota1,nota2=excluded.nota2,nota3=excluded.nota3,
            reposicion=excluded.reposicion,notafinal=excluded.notafinal,docenteid=excluded.docenteid`,[cursoId,profesorId,JSON.stringify(datos)]);
        await despublicar(tx,cursoId,[...registros]);
  return [...registros];
}
async function publicarRegistro(tx,cursoId,r) {
  const campo=['nota1','nota2','nota3'][r-1];
  const {rows}=await tx.query(`SELECT count(*)::int AS total,count(c.${campo})::int AS completas
    FROM universidaduees.matricula m LEFT JOIN universidaduees.calificaciones c
    ON c.asignaturaid=m.asignaturaid AND c.estudianteid=m.estudianteid WHERE m.asignaturaid=$1`,[cursoId]);
  if(!rows[0].total || rows[0].total!==rows[0].completas)
    throw fallo(422,`Registro ${r}: ${rows[0].total-rows[0].completas} estudiante(s) sin nota. No se guardó ni publicó ninguna parte de este envío. Conserva tus cambios o guárdalos como borrador.`);
  await tx.query(`INSERT INTO universidaduees.publicaciones_registros(asignaturaid,registro,publicado)
    VALUES($1,$2,true) ON CONFLICT(asignaturaid,registro) DO UPDATE SET publicado=true,actualizado_en=now()`,[cursoId,r]);
}

function crearAcademico(db) {
  async function conCurso(profesor,curso,work,escritura=false) {
    const profesorId=idProfesor(profesor), cursoId=id(curso,"cursoId");
    return db.transaction(async tx=>{
      const detalle=await exigirCurso(tx,profesorId,cursoId,escritura);
      if (escritura && !(await estadoEsquema(tx)).edicionDisponible) throw fallo(503,'La consulta está disponible. Para guardar borradores y publicar falta autorizar la preparación de la base de datos.');
      return work(tx,detalle,cursoId,profesorId);
    },!escritura);
  }
  return {
    async cursos(profesor,propietario) {
      const p=idProfesor(profesor), objetivo=idProfesor(propietario);
      if (p!==objetivo) throw fallo(403,"No tienes acceso a estos cursos");
      const existe=await db.query("SELECT profesorid FROM universidaduees.profesores WHERE profesorid=$1",[p]);
      if (!existe.rows.length) throw fallo(404,"Docente no encontrado");
      const result=await db.query(SELECT_CURSO+" WHERE a.profesorid=$1 ORDER BY a.nombre,a.asignaturaid",[p]);
      return result.rows.map(cursoPublico);
    },
    detalle: (p,c)=>conCurso(p,c,async(tx,detalle)=>({...cursoPublico(detalle),...await estadoEsquema(tx)})),
    estudiantes: (p,c)=>conCurso(p,c,async(tx,detalle,cursoId)=>{
      const result=await tx.query(`SELECT m.estudianteid AS "matriculaId",concat_ws(' ',e.nombre,e.apellidos) AS nombre,e.cif
        FROM universidaduees.matricula m JOIN universidaduees.estudiantes e ON e.estudianteid=m.estudianteid
        WHERE m.asignaturaid=$1 ORDER BY e.nombre,e.apellidos,m.estudianteid`,[cursoId]);
      return result.rows;
    }),
    calificaciones: (p,c)=>conCurso(p,c,(tx,detalle,cursoId)=>leerNotas(tx,cursoId)),
    async guardar(p,c,body) {
      const entradas=entradasDe(body);
      return conCurso(p,c,async(tx,detalle,cursoId,profesorId)=>{
        await guardarEn(tx,cursoId,profesorId,entradas);
        return leerNotas(tx,cursoId);
      },true);
    },
    async publicarCambios(p,c,body) {
      const entradas=entradasDe(body,true);
      return conCurso(p,c,async(tx,detalle,cursoId,profesorId)=>{
        await guardarEn(tx,cursoId,profesorId,entradas);
        // Publica los registros ordinarios incluidos. Sin ediciones, publica los
        // registros guardados aún en borrador que contengan al menos una nota.
        let registros=[1,2,3].filter(r=>entradas.some(e=>Object.hasOwn(e,'nota'+r)));
        if (entradas.length && !registros.length) throw fallo(422,'La reposición es un dato adicional sin registro de publicación definido. Usa Guardar cambios como borrador.');
        if (!registros.length) {
          const flags=await publicaciones(tx,cursoId);
          const {rows}=await tx.query('SELECT count(nota1)::int AS n1,count(nota2)::int AS n2,count(nota3)::int AS n3 FROM universidaduees.calificaciones WHERE asignaturaid=$1',[cursoId]);
          registros=[1,2,3].filter(r=>!flags['registro'+r] && rows[0]['n'+r]>0);
        }
        if(!registros.length) throw fallo(422,'No hay registros ordinarios pendientes de publicación. Puedes guardar la reposición como dato adicional en borrador.');
        for(const r of registros) await publicarRegistro(tx,cursoId,r);
        return {calificaciones:await leerNotas(tx,cursoId),registrosPublicados:await publicaciones(tx,cursoId),registros};
      },true);
    },
    async cambiar(p,c,calificacion,body) {
      const cambios=notas(body);const calificacionId=id(calificacion,"calificacionId");
      return conCurso(p,c,async(tx,detalle,cursoId)=>{
        const {rows}=await tx.query("SELECT * FROM universidaduees.calificaciones WHERE asignaturaid=$1 AND calificacionid=$2",[cursoId,calificacionId]);
        if(!rows[0])throw fallo(404,"Calificación no encontrada en este curso");
        const previa=rows[0], valores=CAMPOS.map(k=>Object.hasOwn(cambios,k)?cambios[k]:previa[k]===null?null:Number(previa[k]));
        await tx.query(`UPDATE universidaduees.calificaciones SET nota1=$3,nota2=$4,nota3=$5,reposicion=$6,
          notafinal=CASE WHEN $3::numeric IS NULL OR $4::numeric IS NULL OR $5::numeric IS NULL THEN NULL
          ELSE round($3::numeric*0.30+$4::numeric*0.30+$5::numeric*0.40,2) END
          WHERE asignaturaid=$1 AND calificacionid=$2`,[cursoId,calificacionId,...valores]);
        const registros=[1,2,3].filter(i=>Object.hasOwn(cambios,'nota'+i)&&cambios['nota'+i]!== (previa['nota'+i]===null?null:Number(previa['nota'+i])));
        await despublicar(tx,cursoId,registros);
        return (await leerNotas(tx,cursoId)).find(r=>r.calificacionId===calificacionId);
      },true);
    },
    eliminar: (p,c,calificacion)=>conCurso(p,c,async(tx,detalle,cursoId)=>{
      const result=await tx.query("DELETE FROM universidaduees.calificaciones WHERE asignaturaid=$1 AND calificacionid=$2 RETURNING calificacionid",[cursoId,id(calificacion,"calificacionId")]);
      if(!result.rows.length)throw fallo(404,"Calificación no encontrada en este curso");
      await despublicar(tx,cursoId,[1,2,3]);
    },true),
    async publicacion(p,c,registro,publicar,body) {
      const r=id(registro,"registro");if(r>3)throw fallo(400,"registro debe ser 1, 2 o 3");
      if(publicar&&(!objeto(body)||body.confirmar!==true||Object.keys(body).some(k=>k!=="confirmar")))throw fallo(400,"Se requiere confirmar: true");
      return conCurso(p,c,async(tx,detalle,cursoId)=>{
        if(publicar){
          const campo=['nota1','nota2','nota3'][r-1];
          const {rows}=await tx.query(`SELECT count(*)::int AS total,count(c.${campo})::int AS completas
            FROM universidaduees.matricula m LEFT JOIN universidaduees.calificaciones c
            ON c.asignaturaid=m.asignaturaid AND c.estudianteid=m.estudianteid WHERE m.asignaturaid=$1`,[cursoId]);
          if(!rows[0].total||rows[0].total!==rows[0].completas)throw fallo(422,"Todos los estudiantes deben tener nota en el registro para publicarlo");
        }
        await tx.query(`INSERT INTO universidaduees.publicaciones_registros(asignaturaid,registro,publicado)
          VALUES($1,$2,$3) ON CONFLICT(asignaturaid,registro) DO UPDATE SET publicado=excluded.publicado,actualizado_en=now()`,[cursoId,r,publicar]);
        return {cursoId,registro:r,publicado:publicar};
      },true);
    },
    informe: (p,c)=>conCurso(p,c,async(tx,detalle,cursoId)=>{
      const {rows}=await tx.query(`SELECT e.cif,concat_ws(' ',e.nombre,e.apellidos) AS nombre,
        c.nota1,c.nota2,c.nota3,c.reposicion,CASE WHEN c.nota1 IS NULL OR c.nota2 IS NULL OR c.nota3 IS NULL THEN NULL ELSE round(c.nota1*0.30+c.nota2*0.30+c.nota3*0.40,2) END AS "notaFinal"
        FROM universidaduees.matricula m JOIN universidaduees.estudiantes e ON e.estudianteid=m.estudianteid
        LEFT JOIN universidaduees.calificaciones c ON c.asignaturaid=m.asignaturaid AND c.estudianteid=m.estudianteid
        WHERE m.asignaturaid=$1 ORDER BY e.nombre,e.apellidos,m.estudianteid`,[cursoId]);
      return {curso:cursoPublico(detalle),...await estadoEsquema(tx),registrosPublicados:await publicaciones(tx,cursoId),estudiantes:rows.map(r=>({...r,
        ...Object.fromEntries([...CAMPOS,"notaFinal"].map(k=>[k,r[k]===null?null:Number(r[k])]))}))};
    }),
    async contrasena(p,propietario,body) {
      const profesorId=idProfesor(p);
      if(profesorId!==idProfesor(propietario))throw fallo(403,"No puedes modificar otro docente");
      if(!objeto(body)||Object.keys(body).length!==2||!Object.hasOwn(body,"contraseñaActual")||!Object.hasOwn(body,"contraseñaNueva"))
        throw fallo(400,"Envía contraseñaActual y contraseñaNueva");
      const actual=body['contraseñaActual'],nueva=body['contraseñaNueva'];
      if(typeof actual!=='string'||!actual||Buffer.byteLength(actual,'utf8')>72||typeof nueva!=='string'||nueva.length<8||Buffer.byteLength(nueva,'utf8')>72)
        throw fallo(400,"La nueva contraseña necesita al menos 8 caracteres y como máximo 72 bytes UTF-8");
      return db.transaction(async tx=>{
        const {rows}=await tx.query("SELECT contrahash FROM universidaduees.profesores WHERE profesorid=$1 FOR UPDATE",[profesorId]);
        if(!rows.length)throw fallo(404,"Docente no encontrado");
        if(!rows[0].contrahash||!await bcrypt.compare(actual,rows[0].contrahash))throw fallo(401,"Contraseña actual incorrecta");
        const hash=await bcrypt.hash(nueva,12);
        await tx.query("UPDATE universidaduees.profesores SET contrahash=$2 WHERE profesorid=$1",[profesorId,hash]);
      });
    },
    async email(p,propietario,body) {
      const profesorId=idProfesor(p);if(profesorId!==idProfesor(propietario))throw fallo(403,"No puedes modificar otro docente");
      if(!objeto(body)||Object.keys(body).length!==1)throw fallo(400,"Envía únicamente correo");
      const email=correo(body.correo);
      const {rows}=await db.query("UPDATE universidaduees.profesores SET email=$2 WHERE profesorid=$1 RETURNING profesorid",[profesorId,email]);
      if(!rows.length)throw fallo(404,"Docente no encontrado");
      return {profesorId,correo:email};
    }
  };
}
module.exports={crearAcademico,exigirCurso,id,idProfesor,fallo,estadoEsquema};
