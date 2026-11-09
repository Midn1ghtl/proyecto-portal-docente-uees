const express=require("express");
const {crearAcademico,fallo,idProfesor}=require("../services/academico");
const {crearExcel,crearPdf}=require("../services/archivos-academicos");
const ok=(res,data,message="Operación exitosa")=>res.json({status:"success",message,...(data===undefined?{}:{data})});
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
function errorAcademico(error,req,res,next) {
  if(res.headersSent)return next(error);
  let status=error.status||500, message=error.message;
  if(error.code==='23505'){status=409;message='Los datos entran en conflicto con un registro existente';}
  if(error.code==='23503'||error.code==='23514'||error.code==='22001'){status=400;message='Los datos no cumplen las restricciones de la base de datos';}
  if (error.code==='42703'||error.code==='42P01') {status=503;message='Falta preparar el esquema académico en la base de datos; consulta al administrador';}
  if(status===500){console.error('Error académico:',{codigo:error.code||error.name,ruta:req.route?.path,operacion:error.operacion});message='Error interno del servidor';}
  res.status(status).json({status:"error",message});
}
function base({db,autenticar}) {
  if(typeof autenticar!=='function')throw new Error('Se requiere el middleware real de autenticación');
  const router=express.Router(),api=crearAcademico(db);
  // El login de tu compañera debe validar la sesión y asignar req.profesorId.
  const protegido=[autenticar,(req,res,next)=>{
    try {if(req.profesorId===undefined||req.profesorId===null)throw fallo(401,'La autenticación no identificó al docente');
      req.profesorId=idProfesor(req.profesorId);next();
    }catch(error){res.status(401).json({status:'error',message:'Sesión no válida'});}
  },(req,res,next)=>{res.set('Cache-Control','no-store');next();}];
  return {router,api,protegido};
}
function crearCursosRouter(options) {
  const {router,api,protegido}=base(options);
  router.get('/profesor/:profesorId/cursos',...protegido,asyncRoute(async(req,res)=>ok(res,await api.cursos(req.profesorId,req.params.profesorId))));
  router.get('/cursos/:cursoId',...protegido,asyncRoute(async(req,res)=>res.json(await api.detalle(req.profesorId,req.params.cursoId))));
  router.get('/cursos/:cursoId/estudiantes',...protegido,asyncRoute(async(req,res)=>ok(res,await api.estudiantes(req.profesorId,req.params.cursoId))));
  for(const [suffix,mime,extension,generar] of [
    ['informe','application/pdf','pdf',crearPdf],
    ['exportar','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx',crearExcel]
  ])router.get('/cursos/:cursoId/'+suffix,...protegido,asyncRoute(async(req,res)=>{
    const data=await api.informe(req.profesorId,req.params.cursoId);
    let bytes;
    try { bytes=await generar(data); }
    catch(error) {error.operacion='generar_'+extension;throw error;}
    res.set('Content-Type',mime).set('Content-Disposition','attachment; filename="calificaciones_curso_'+data.curso.id_curso+'.'+extension+'"').send(bytes);
  }));
  router.post('/profesor/:profesorId/contra',...protegido,asyncRoute(async(req,res)=>{await api.contrasena(req.profesorId,req.params.profesorId,req.body);ok(res,undefined,'Contraseña actualizada');}));
  router.patch('/profesor/:profesorId/email',...protegido,asyncRoute(async(req,res)=>ok(res,await api.email(req.profesorId,req.params.profesorId,req.body))));
  router.use(errorAcademico);return router;
}
function crearNotasRouter(options) {
  const {router,api,protegido}=base(options);
  router.get('/cursos/:cursoId/calificaciones',...protegido,asyncRoute(async(req,res)=>ok(res,await api.calificaciones(req.profesorId,req.params.cursoId))));
  router.post('/cursos/:cursoId/calificaciones',...protegido,asyncRoute(async(req,res)=>ok(res,await api.guardar(req.profesorId,req.params.cursoId,req.body),'Calificaciones guardadas; los registros modificados quedan en borrador')));
  router.post('/cursos/:cursoId/calificaciones/publicacion',...protegido,asyncRoute(async(req,res)=>ok(res,await api.publicarCambios(req.profesorId,req.params.cursoId,req.body),'Cambios guardados y publicados en una sola transacción')));
  router.patch('/cursos/:cursoId/calificaciones/:calificacionId',...protegido,asyncRoute(async(req,res)=>ok(res,await api.cambiar(req.profesorId,req.params.cursoId,req.params.calificacionId,req.body))));
  router.delete('/cursos/:cursoId/calificaciones/:calificacionId',...protegido,asyncRoute(async(req,res)=>{await api.eliminar(req.profesorId,req.params.cursoId,req.params.calificacionId);ok(res,undefined,'Calificación eliminada');}));
  router.post('/cursos/:cursoId/registros/:registro/publicacion',...protegido,asyncRoute(async(req,res)=>ok(res,await api.publicacion(req.profesorId,req.params.cursoId,req.params.registro,true,req.body))));
  router.delete('/cursos/:cursoId/registros/:registro/publicacion',...protegido,asyncRoute(async(req,res)=>ok(res,await api.publicacion(req.profesorId,req.params.cursoId,req.params.registro,false))));
  router.use(errorAcademico);return router;
}
module.exports={crearCursosRouter,crearNotasRouter};
