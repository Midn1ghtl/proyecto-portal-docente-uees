document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('nav.sidenav a[href="#"]').forEach(link=>{
    const tipo=link.textContent.toLowerCase().includes('excel')?'xlsx':'pdf';
    link.href='asignatura.html?accion='+tipo;
    link.addEventListener('click',event=>{if(typeof window.descargarInformeCurso==='function'){event.preventDefault();window.descargarInformeCurso(tipo);}});
  });
});
