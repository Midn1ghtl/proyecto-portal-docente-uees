(function(){
  const $=id=>document.getElementById(id);
  function aviso(text,tipo){$('mensajePerfil').className='alert alert-'+tipo;$('mensajePerfil').textContent=text;}
  Portal.listo.then(docente=>{
    APIAcademica.json('/sesion').then(r=>{if(r.data.correo)$('correoNuevo').value=r.data.correo;}).catch(()=>{});
    $('formCorreo').addEventListener('submit',async event=>{
      event.preventDefault();const button=$('guardarCorreo');button.disabled=true;
      try{const r=await APIAcademica.json('/profesor/'+docente.profesorId+'/email',{method:'PATCH',body:{correo:$('correoNuevo').value.trim()}});aviso('Correo actualizado: '+r.data.correo,'success');}
      catch(error){aviso(error.message,'danger');}finally{button.disabled=false;}
    });
    $('formContrasena').addEventListener('submit',async event=>{
      event.preventDefault();if($('claveNueva').value!==$('claveRepetida').value){aviso('La nueva contraseña y su confirmación no coinciden.','warning');return;}
      const button=$('guardarContrasena');button.disabled=true;
      try{await APIAcademica.json('/profesor/'+docente.profesorId+'/contra',{method:'POST',body:{'contraseñaActual':$('claveActual').value,'contraseñaNueva':$('claveNueva').value}});$('formContrasena').reset();aviso('Contraseña actualizada. Las demás sesiones se cerraron.','success');}
      catch(error){aviso(error.message,'danger');}finally{button.disabled=false;}
    });
  }).catch(()=>{});
})();
