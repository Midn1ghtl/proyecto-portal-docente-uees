const {crearNotasRouter}=require("../modules/academico.routes");
module.exports=crearNotasRouter({
  db:require("../config/AcademicoDB"),
  autenticar:require("../Verificacion/VerificarToken")
});
