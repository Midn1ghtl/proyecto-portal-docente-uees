function ingresar(idUsuario, idClave) {
  var usuario = document.getElementById(idUsuario).value;
  var clave = document.getElementById(idClave).value;

  if (usuario === "" || clave === "") {
    alert("Digite su usuario y contraseña.");
    return false;
  }

  window.location.href = "portal-docente.html";

  return false;
}