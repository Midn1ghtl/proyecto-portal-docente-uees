(function () {
  const CAMPOS=['nota1','nota2','nota3','reposicion'];
  const $=id=>document.getElementById(id),api=window.APIAcademica,esc=Portal.esc;
  let docente,cursos=[],curso=null,estudiantes=[],servidor={},borrador={},carga=0,ocupado=false;
  let publicados={registro1:false,registro2:false,registro3:false};
  function aviso(texto,tipo='info'){$('mensaje').className=texto?'alert alert-'+tipo:'alert d-none';$('mensaje').textContent=texto;}
  function clave(){return 'borrador_notas_'+docente.profesorId+'_'+curso.id_curso;}
  function persistir(){try{if(Object.keys(borrador).length)localStorage.setItem(clave(),JSON.stringify(borrador));else localStorage.removeItem(clave());}catch{aviso('No se pudo guardar la copia temporal en este navegador. Guarda las notas en el servidor.','warning');}}
  function final(n){return [n.nota1,n.nota2,n.nota3].some(x=>x===null||x===undefined)?null:Math.round((n.nota1*.3+n.nota2*.3+n.nota3*.4+Number.EPSILON)*100)/100;}
  function actuales(m){return Object.fromEntries(CAMPOS.map(c=>[c,borrador[m]&&Object.hasOwn(borrador[m],c)?borrador[m][c]:servidor[m]?.[c]??null]));}
  function invalidas(n){return CAMPOS.some(c=>n[c]!==null&&(typeof n[c]!=='number'||!Number.isFinite(n[c])||n[c]<0||n[c]>10));}
  function estado(){
    const n=Object.keys(borrador).length;
    $('estadoBorrador').textContent=n?n+' estudiante(s) con cambios pendientes. Se conservan temporalmente en este navegador.':'Sin cambios pendientes.';
    $('btnEnviar').disabled=ocupado||!curso||!n;$('btnDescartar').disabled=ocupado||!n;
    $('selCurso').disabled=ocupado||!cursos.length;
    ['btnPdf','btnExcel','archivoEstudiantes','btnImportar'].forEach(id=>$(id).disabled=ocupado||!curso);
    [1,2,3].forEach(r=>{
      $('estadoRegistro'+r).textContent=publicados['registro'+r]?'Publicado':'Borrador';
      $('publicar'+r).disabled=ocupado||!curso||!!n||publicados['registro'+r];
      $('despublicar'+r).disabled=ocupado||!curso||!publicados['registro'+r];
    });
    document.querySelectorAll('#cuerpoNotas .nota').forEach(i=>i.disabled=ocupado);
    document.querySelectorAll('[data-guardar]').forEach(b=>b.disabled=ocupado||!borrador[b.dataset.guardar]);
    document.querySelectorAll('[data-borrar]').forEach(b=>b.disabled=ocupado||!servidor[b.dataset.borrar]);
  }
  function pintar(){
    $('cuerpoNotas').innerHTML=estudiantes.length?estudiantes.map(e=>{
      const m=e.matriculaId,n=actuales(m),f=final(n);
      return '<tr data-m="'+m+'" class="'+(borrador[m]?'table-warning':'')+'">'+
      '<td><img src="src/assets/img/avatar.png" width="40" height="40" alt="Avatar" class="rounded-circle"></td><td>'+esc(e.cif)+'</td><td>'+esc(e.nombre)+'</td>'+
      CAMPOS.map(c=>'<td><input aria-label="'+c+' de '+esc(e.nombre)+'" type="number" class="form-control form-control-sm nota" style="width:90px" min="0" max="10" step="0.01" data-campo="'+c+'" value="'+(n[c]===null?'':Number(n[c]))+'"></td>').join('')+
      '<td class="celda-final fw-semibold">'+(f===null?'—':f.toFixed(2))+'</td><td><button class="btn btn-sm btn-outline-primary mb-1" data-guardar="'+m+'">Guardar</button> <button class="btn btn-sm btn-outline-danger" data-borrar="'+m+'">Borrar notas</button></td></tr>';
    }).join(''):'<tr><td colspan="9">Esta asignatura no tiene estudiantes matriculados.</td></tr>';
    estado();
  }
  function aplicarNotas(rows){servidor={};rows.forEach(r=>servidor[r.matriculaId]=r);publicados=rows[0]?.registrosPublicados||{registro1:false,registro2:false,registro3:false};}
  async function cargar(id){
    const ticket=++carga;ocupado=true;estado();aviso('');$('cuerpoNotas').innerHTML='<tr><td colspan="9">Cargando...</td></tr>';
    try{
      const [detalle,lista,notas]=await Promise.all([api.json('/cursos/'+id),api.json('/cursos/'+id+'/estudiantes'),api.json('/cursos/'+id+'/calificaciones')]);
      if(ticket!==carga)return;
      curso=detalle;estudiantes=lista.data;aplicarNotas(notas.data);
      try{borrador=JSON.parse(localStorage.getItem(clave())||'{}');if(!borrador||typeof borrador!=='object'||Array.isArray(borrador))borrador={};}catch{borrador={};}
      const validas=new Set(estudiantes.map(e=>String(e.matriculaId)));for(const m of Object.keys(borrador))if(!validas.has(m))delete borrador[m];
      $('detalleAsignatura').textContent=curso.nombre_asignatura+' · '+(curso.horario||'Sin horario')+' · '+estudiantes.length+' estudiantes';
      pintar();
    }catch(error){aviso(error.message,'danger');$('cuerpoNotas').innerHTML='<tr><td colspan="9">No se pudo cargar la asignatura.</td></tr>';}
    finally{if(ticket===carga){ocupado=false;estado();}}
  }
  async function conOcupado(fn){if(ocupado)return;ocupado=true;estado();try{await fn();}catch(error){aviso(error.message,'danger');}finally{ocupado=false;estado();}}
  $('cuerpoNotas').addEventListener('input',event=>{
    const input=event.target.closest('.nota');if(!input||ocupado)return;
    const tr=input.closest('tr'),m=tr.dataset.m,n={};
    tr.querySelectorAll('.nota').forEach(i=>{n[i.dataset.campo]=i.value===''?null:Number(i.value);i.classList.toggle('is-invalid',i.value!==''&&(!Number.isFinite(Number(i.value))||Number(i.value)<0||Number(i.value)>10));});
    const igual=CAMPOS.every(c=>n[c]===(servidor[m]?.[c]??null));if(igual)delete borrador[m];else borrador[m]=n;
    tr.classList.toggle('table-warning',!igual);const f=final(n);tr.querySelector('.celda-final').textContent=f===null||!Number.isFinite(f)?'—':f.toFixed(2);
    persistir();estado();
  });
  async function guardar(matricula){
    const pendientes=matricula?[String(matricula)]:Object.keys(borrador);if(!pendientes.length)return;
    if(pendientes.some(m=>invalidas(borrador[m]))){aviso('Corrige las notas: deben estar entre 0 y 10.','danger');return;}
    await conOcupado(async()=>{
      if(matricula&&servidor[matricula]){
        await api.json('/cursos/'+curso.id_curso+'/calificaciones/'+servidor[matricula].calificacionId,{method:'PATCH',body:borrador[matricula]});
      }else{
        await api.json('/cursos/'+curso.id_curso+'/calificaciones',{method:'POST',body:{calificaciones:pendientes.map(m=>({matriculaId:Number(m),...borrador[m]}))}});
      }
      pendientes.forEach(m=>delete borrador[m]);persistir();aplicarNotas((await api.json('/cursos/'+curso.id_curso+'/calificaciones')).data);pintar();
      aviso('Notas guardadas en PostgreSQL. Los registros modificados quedan en borrador.','success');
    });
  }
  $('btnEnviar').addEventListener('click',()=>guardar());
  $('btnDescartar').addEventListener('click',()=>{if(confirm('¿Descartar los cambios sin enviar de esta asignatura?')){borrador={};persistir();pintar();aviso('Cambios pendientes descartados.');}});
  $('cuerpoNotas').addEventListener('click',event=>{
    const guardarBtn=event.target.closest('[data-guardar]');if(guardarBtn){guardar(Number(guardarBtn.dataset.guardar));return;}
    const borrarBtn=event.target.closest('[data-borrar]');if(!borrarBtn||ocupado)return;
    const m=Number(borrarBtn.dataset.borrar),guardada=servidor[m];if(!guardada)return;
    if(!confirm('¿Eliminar las calificaciones guardadas de este estudiante? Su matrícula se conserva.'))return;
    conOcupado(async()=>{
      await api.json('/cursos/'+curso.id_curso+'/calificaciones/'+guardada.calificacionId,{method:'DELETE'});
      delete borrador[m];persistir();aplicarNotas((await api.json('/cursos/'+curso.id_curso+'/calificaciones')).data);pintar();aviso('Calificaciones eliminadas; estudiante y matrícula conservados.','success');
    });
  });
  [1,2,3].forEach(r=>{
    $('publicar'+r).addEventListener('click',()=>conOcupado(async()=>{
      await api.json('/cursos/'+curso.id_curso+'/registros/'+r+'/publicacion',{method:'POST',body:{confirmar:true}});
      publicados['registro'+r]=true;aviso('Registro '+r+' publicado.','success');
    }));
    $('despublicar'+r).addEventListener('click',()=>conOcupado(async()=>{
      await api.json('/cursos/'+curso.id_curso+'/registros/'+r+'/publicacion',{method:'DELETE'});
      publicados['registro'+r]=false;aviso('Registro '+r+' despublicado.','success');
    }));
  });
  window.descargarInformeCurso=tipo=>{
    if(!curso||ocupado)return;
    if(Object.keys(borrador).length&&!confirm('El informe usará las notas guardadas en el servidor. Hay cambios pendientes. ¿Continuar?'))return;
    return conOcupado(async()=>{await api.descargar(curso.id_curso,tipo);aviso('Descarga preparada.','success');});
  };
  $('btnPdf').addEventListener('click',()=>window.descargarInformeCurso('pdf'));
  $('btnExcel').addEventListener('click',()=>window.descargarInformeCurso('xlsx'));
  $('btnImportar').addEventListener('click',()=>{
    const file=$('archivoEstudiantes').files[0];if(!file){aviso('Selecciona un CSV o XLSX de estudiantes.','warning');return;}
    if(file.size>2*1024*1024){aviso('El archivo supera 2 MB.','danger');return;}
    conOcupado(async()=>{
      const form=new FormData();form.append('archivo',file);
      const result=await api.json('/cursos/'+curso.id_curso+'/estudiantes/cargaMasiva',{method:'POST',body:form});
      estudiantes=(await api.json('/cursos/'+curso.id_curso+'/estudiantes')).data;
      aplicarNotas((await api.json('/cursos/'+curso.id_curso+'/calificaciones')).data);pintar();$('archivoEstudiantes').value='';
      $('detalleAsignatura').textContent=curso.nombre_asignatura+' · '+(curso.horario||'Sin horario')+' · '+estudiantes.length+' estudiantes';
      aviso('Carga finalizada: '+result.data.incorporados+' incorporados y '+result.data.omitidos+' omitidos.','success');
    });
  });
  $('selCurso').addEventListener('change',event=>{const id=Number(event.target.value);history.replaceState(null,'','asignatura.html?cursoId='+id);cargar(id);});
  Portal.listo.then(async perfil=>{
    docente=perfil;
    try{
      cursos=(await api.json('/profesor/'+docente.profesorId+'/cursos')).data;
      $('selCurso').innerHTML=cursos.map(c=>'<option value="'+c.id_curso+'">'+esc(c.nombre_asignatura)+(c.horario?' · '+esc(c.horario):'')+'</option>').join('');
      if(!cursos.length){$('selCurso').innerHTML='<option>Sin asignaturas asignadas</option>';$('cuerpoNotas').innerHTML='<tr><td colspan="9">No tienes asignaturas asignadas.</td></tr>';estado();return;}
      const params=new URLSearchParams(location.search),pedido=Number(params.get('cursoId')),inicial=cursos.find(c=>c.id_curso===pedido)||cursos[0];
      $('selCurso').value=String(inicial.id_curso);await cargar(inicial.id_curso);
      if(params.has('accion'))aviso('Selecciona la asignatura y utiliza los botones PDF o Excel para descargar sus notas.');
    }catch(error){aviso(error.message,'danger');estado();}
  }).catch(()=>{});
})();
