const {crearCursosRouter}=require("../modules/academico.routes");
module.exports=crearCursosRouter({
  db:require("../config/AcademicoDB"),
  autenticar:require("../Verificacion/VerificarToken")
});
