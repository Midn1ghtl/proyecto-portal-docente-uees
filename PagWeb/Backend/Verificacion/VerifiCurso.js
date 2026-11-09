const db=require("../config/AcademicoDB");
const {exigirCurso,id}=require("../services/academico");
module.exports=async function verificarCurso(req,res,next) {
  try {
    if(req.profesorId===undefined)return res.status(401).json({status:'error',message:'No autorizado'});
    req.cursoId=id(req.params.cursoId,'cursoId');
    await exigirCurso(db,id(req.profesorId,'profesorId'),req.cursoId);
    next();
  } catch(error) {
    res.status(error.status||500).json({status:'error',message:error.status?error.message:'Error interno del servidor'});
  }
};
