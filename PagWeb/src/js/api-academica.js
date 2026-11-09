(function () {
  function token() { return localStorage.getItem('token') || sessionStorage.getItem('token'); }
  async function solicitar(ruta,opciones={},binario=false) {
    const headers={Authorization:'Bearer '+(token()||''),...(opciones.headers||{})};
    let body=opciones.body;
    if(body!==undefined&&!(body instanceof FormData)){
      headers['Content-Type']='application/json';if(typeof body!=='string')body=JSON.stringify(body);
    }
    let response;
    try {response=await fetch(window.PORTAL_API_URL+ruta,{...opciones,headers,body});}
    catch {throw new Error('No se pudo conectar con el servidor. Comprueba la URL y que el backend esté iniciado.');}
    if(!response.ok){
      const error=await response.json().catch(()=>({}));
      throw new Error((error.message||'La solicitud falló')+' (HTTP '+response.status+').');
    }
    if(binario)return response.blob();
    const datos=await response.json().catch(()=>null);
    if(datos===null)throw new Error('El servidor no devolvió el JSON esperado. Revisa la URL de la API.');
    return datos;
  }
  async function descargar(cursoId,tipo) {
    const extension=tipo==='pdf'?'pdf':'xlsx',ruta=tipo==='pdf'?'informe':'exportar';
    const blob=await solicitar('/cursos/'+cursoId+'/'+ruta,{},true);
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='calificaciones_curso_'+cursoId+'.'+extension;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  window.APIAcademica={json:solicitar,descargar};
})();
