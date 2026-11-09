(function () {
  const CAMPOS=['nota1','nota2','nota3','reposicion'];
  const $=id=>document.getElementById(id),api=window.APIAcademica,esc=Portal.esc;
  let docente,cursos=[],curso=null,estudiantes=[],servidor={},borrador={},ocupado=false,notasDisponibles=false;
  let publicados={registro1:false,registro2:false,registro3:false};
  function aviso(texto,tipo='info'){$('mensaje').className=texto?'alert alert-'+tipo:'alert d-none';$('mensaje').textContent=texto;}
  function clave(){return 'borrador_notas_'+docente.profesorId+'_'+curso.id_curso;}
  function persistir(){if(!curso)return;try{if(Object.keys(borrador).length)localStorage.setItem(clave(),JSON.stringify(borrador));else localStorage.removeItem(clave());}catch{aviso('No se pudo conservar la copia temporal del navegador.','warning');}}
  function final(n){return [n.nota1,n.nota2,n.nota3].some(x=>x===null||x===undefined)?null:Math.round((n.nota1*.3+n.nota2*.3+n.nota3*.4+Number.EPSILON)*100)/100;}
  function actuales(m){return Object.fromEntries(CAMPOS.map(c=>[c,borrador[m]&&Object.hasOwn(borrador[m],c)?borrador[m][c]:servidor[m]?.[c]??null]));}
  function invalidas(n){return Object.values(n).some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>10));}
  function estado(){
    const n=Object.keys(borrador).length,edicion=curso?.edicionDisponible&&notasDisponibles;
    const pendientes=[1,2,3].filter(r=>!publicados['registro'+r]&&Object.values(servidor).some(f=>f['nota'+r]!==null));
    $('estadoBorrador').textContent=(n?n+' estudiante(s) con cambios sin enviar. ':'Sin cambios sin enviar. ')+(curso?.publicacionDisponible?(pendientes.length?'Registros guardados pendientes de publicación: '+pendientes.join(', ')+'.':''):'Estado académico pendiente de preparar en la base de datos.');
    $('btnEnviar').disabled=ocupado||!edicion||!n;
    $('btnPublicar').disabled=ocupado||!edicion||(!n&&!pendientes.length);
    $('btnDescartar').disabled=ocupado||!n;
    $('selCurso').disabled=ocupado||!cursos.length;
    ['btnPdf','btnExcel'].forEach(id=>$(id).disabled=ocupado||!curso);
    document.querySelectorAll('#cuerpoNotas .nota').forEach(i=>i.disabled=ocupado||!notasDisponibles);
    document.querySelectorAll('[data-borrar]').forEach(b=>b.disabled=ocupado||!edicion||!servidor[b.dataset.borrar]);
  }
  function pintar(){
    $('cuerpoNotas').innerHTML=estudiantes.length?estudiantes.map(e=>{
      const m=e.matriculaId,n=actuales(m),f=final(n);
      return '<tr data-m="'+m+'" class="'+(borrador[m]?'table-warning':'')+'">'+
      '<td><img src="src/assets/img/avatar.png" width="40" height="40" alt="Avatar" class="rounded-circle"></td><td>'+esc(e.cif)+'</td><td>'+esc(e.nombre)+'</td>'+
      CAMPOS.map(c=>'<td><input aria-label="'+c+' de '+esc(e.nombre)+'" type="number" class="form-control form-control-sm nota" style="width:90px" min="0" max="10" step="0.01" data-campo="'+c+'" value="'+(n[c]===null?'':Number(n[c]))+'"></td>').join('')+
      '<td class="celda-final fw-semibold">'+(!notasDisponibles?'No disponible':f===null?'Pendiente':f.toFixed(2))+'</td><td><button class="btn btn-sm btn-outline-danger" data-borrar="'+m+'">Borrar notas</button></td></tr>';
    }).join(''):'<tr><td colspan="9">Esta asignatura no tiene estudiantes matriculados.</td></tr>';
    estado();
  }
  function aplicarNotas(rows){servidor={};rows.forEach(r=>servidor[r.matriculaId]=r);publicados=rows[0]?.registrosPublicados||{registro1:false,registro2:false,registro3:false};}
  async function cargar(id){
    if(ocupado)return;
    persistir();curso=null;estudiantes=[];servidor={};borrador={};notasDisponibles=false;ocupado=true;estado();aviso('');
    $('cuerpoNotas').innerHTML='<tr><td colspan="9">Cargando...</td></tr>';
    try{
      const [detalle,lista,notas]=await Promise.allSettled([api.json('/cursos/'+id),api.json('/cursos/'+id+'/estudiantes'),api.json('/cursos/'+id+'/calificaciones')]);
      if(detalle.status==='rejected')throw new Error('Detalle: '+detalle.reason.message);
      if(lista.status==='rejected')throw new Error('Estudiantes: '+lista.reason.message);
      curso=detalle.value;estudiantes=lista.value.data;
      if(notas.status==='fulfilled'){aplicarNotas(notas.value.data);notasDisponibles=true;}
      try{borrador=JSON.parse(localStorage.getItem(clave())||'{}');if(!borrador||typeof borrador!=='object'||Array.isArray(borrador))borrador={};}catch{borrador={};}
      const validas=new Set(estudiantes.map(e=>String(e.matriculaId)));for(const m of Object.keys(borrador))if(!validas.has(m))delete borrador[m];
      $('detalleAsignatura').textContent=curso.nombre_asignatura+' · '+(curso.horario||'Sin horario')+' · '+estudiantes.length+' estudiantes';
      pintar();
      if(!notasDisponibles)aviso('Los estudiantes sí se cargaron. Calificaciones: '+notas.reason.message+'. La edición está deshabilitada para evitar sobrescribir notas.','danger');
      else if(!curso.edicionDisponible)aviso('Puedes consultar estudiantes, notas e informes. Guardar borradores y publicar requiere preparar el esquema de Neon con autorización. Las ediciones se conservarán temporalmente en este navegador.','warning');
    }catch(error){curso=null;aviso(error.message,'danger');$('cuerpoNotas').innerHTML='<tr><td colspan="9">Error al consultar la asignatura. Revisa el mensaje anterior; no se ha confirmado una lista vacía.</td></tr>';}
    finally{ocupado=false;estado();}
  }
  async function conOcupado(fn){if(ocupado)return;ocupado=true;estado();try{await fn();}catch(error){aviso(error.message,'danger');}finally{ocupado=false;estado();}}
  $('cuerpoNotas').addEventListener('input',event=>{
    const input=event.target.closest('.nota');if(!input||ocupado||!notasDisponibles)return;
    const tr=input.closest('tr'),m=tr.dataset.m,n={};
    tr.querySelectorAll('.nota').forEach(i=>{const v=i.validity.badInput?'inválida':i.value===''?null:Number(i.value);if(v!==(servidor[m]?.[i.dataset.campo]??null))n[i.dataset.campo]=v;i.classList.toggle('is-invalid',invalidas({v}));});
    if(!Object.keys(n).length)delete borrador[m];else borrador[m]=n;
    tr.classList.toggle('table-warning',!!borrador[m]);const f=final(actuales(m));tr.querySelector('.celda-final').textContent=f===null||!Number.isFinite(f)?'Pendiente':f.toFixed(2);
    persistir();estado();
  });
  async function guardar(publicar=false){
    if(!curso||!notasDisponibles)return;
    const pendientes=Object.keys(borrador);if(!publicar&&!pendientes.length)return;
    if(pendientes.some(m=>invalidas(borrador[m]))){aviso('Corrige las notas: deben estar entre 0 y 10.','danger');return;}
    await conOcupado(async()=>{
      const result=await api.json('/cursos/'+curso.id_curso+'/calificaciones'+(publicar?'/publicacion':''),{method:'POST',body:{calificaciones:pendientes.map(m=>({matriculaId:Number(m),...borrador[m]}))}});
      // No borra la copia temporal ni cambia la tabla si el servidor rechaza el lote.
      aplicarNotas(publicar?result.data.calificaciones:result.data);
      borrador={};persistir();pintar();
      aviso(publicar?'Cambios guardados y publicados. Registros: '+result.data.registros.join(', ')+'.':'Borrador guardado en PostgreSQL. Se recuperará al volver a entrar. Los registros modificados quedan sin publicar.','success');
    });
  }
  $('btnEnviar').addEventListener('click',()=>guardar(false));
  $('btnPublicar').addEventListener('click',()=>guardar(true));
  $('btnDescartar').addEventListener('click',()=>{if(confirm('¿Descartar únicamente los cambios sin enviar de esta asignatura? Las notas guardadas en PostgreSQL se conservan.')){borrador={};persistir();pintar();aviso('Cambios sin enviar descartados.');}});
  $('cuerpoNotas').addEventListener('click',event=>{
    const boton=event.target.closest('[data-borrar]');if(!boton||ocupado||!curso?.edicionDisponible)return;
    const m=Number(boton.dataset.borrar),guardada=servidor[m];if(!guardada)return;
    if(!confirm('¿Eliminar las notas guardadas de este estudiante? Su matrícula se conserva. También se descartarán sus ediciones sin enviar.'))return;
    conOcupado(async()=>{
      await api.json('/cursos/'+curso.id_curso+'/calificaciones/'+guardada.calificacionId,{method:'DELETE'});
      delete servidor[m];delete borrador[m];persistir();publicados={registro1:false,registro2:false,registro3:false};pintar();aviso('Notas eliminadas. Estudiante y matrícula conservados.','success');
    });
  });
  window.descargarInformeCurso=tipo=>{
    if(ocupado)return;
    if(!curso){aviso('Selecciona una asignatura antes de imprimir o exportar.');$('selCurso').focus();return;}
    if(Object.keys(borrador).length&&!confirm('El informe utilizará las notas guardadas en PostgreSQL; tus cambios sin guardar no se incluirán y se conservarán en la tabla. ¿Continuar?'))return;
    return conOcupado(async()=>{await api.descargar(curso.id_curso,tipo);aviso(tipo==='pdf'?'PDF descargado. Ábrelo y utiliza Imprimir (Ctrl+P) para imprimirlo.':'Archivo Excel descargado con las notas guardadas.','success');});
  };
  $('btnPdf').addEventListener('click',()=>window.descargarInformeCurso('pdf'));
  $('btnExcel').addEventListener('click',()=>window.descargarInformeCurso('xlsx'));
  $('selCurso').addEventListener('change',event=>{
    const id=Number(event.target.value);if(!id)return;
    const params=new URLSearchParams(location.search);params.set('cursoId',String(id));history.replaceState(null,'','asignatura.html?'+params);
    cargar(id);
  });
  window.addEventListener('beforeunload',event=>{if(Object.keys(borrador).length){event.preventDefault();event.returnValue='';}});
  Portal.listo.then(async perfil=>{
    docente=perfil;
    try{
      cursos=(await api.json('/profesor/'+docente.profesorId+'/cursos')).data;
      $('selCurso').innerHTML='<option value="">Selecciona una asignatura</option>'+cursos.map(c=>'<option value="'+c.id_curso+'">'+esc(c.nombre_asignatura)+(c.horario?' · '+esc(c.horario):'')+'</option>').join('');
      if(!cursos.length){$('cuerpoNotas').innerHTML='<tr><td colspan="9">No tienes asignaturas asignadas.</td></tr>';estado();return;}
      const params=new URLSearchParams(location.search),pedido=Number(params.get('cursoId')),inicial=cursos.find(c=>c.id_curso===pedido);
      if(inicial){$('selCurso').value=String(inicial.id_curso);await cargar(inicial.id_curso);}
      else{$('cuerpoNotas').innerHTML='<tr><td colspan="9">Selecciona una asignatura para consultar sus estudiantes.</td></tr>';estado();aviso(params.has('accion')?'Selecciona la asignatura y pulsa Imprimir / descargar PDF o Exportar a Excel.':'Selecciona una asignatura.');}
    }catch(error){aviso(error.message,'danger');estado();}
  }).catch(()=>{});
})();
