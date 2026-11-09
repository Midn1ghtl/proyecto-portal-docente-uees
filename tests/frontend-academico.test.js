const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../PagWeb/src/js/asignatura.js'),'utf8');
const tick=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);};

async function pagina({search='?cursoId=1',fallanNotas=false,fallanEstudiantes=false,fallarPublicacion=false,storage=new Map()}={}) {
  const elementos=new Map(),llamadas=[],descargas=[],avisos=[];
  const el=id=>{
    if(!elementos.has(id))elementos.set(id,{id,innerHTML:'',textContent:'',value:'',disabled:false,handlers:{},addEventListener(tipo,fn){this.handlers[tipo]=fn;},focus(){this.enfocado=true;}});
    return elementos.get(id);
  };
  let notas=[{calificacionId:10,matriculaId:7,nota1:6,nota2:null,nota3:null,reposicion:null,registrosPublicados:{registro1:false,registro2:false,registro3:false}}];
  const api={
    async json(ruta,opciones={}) {
      llamadas.push({ruta,...opciones});
      if(ruta.includes('/profesor/'))return {data:[{id_curso:1,nombre_asignatura:'Materia'}]};
      if(ruta==='/cursos/1')return {id_curso:1,nombre_asignatura:'Materia',edicionDisponible:true,publicacionDisponible:true};
      if(ruta.endsWith('/estudiantes')){if(fallanEstudiantes)throw Error('HTTP 503 matrícula');return {data:[{matriculaId:7,nombre:'Alumna existente',cif:'0007'}]};}
      if(opciones.method==='POST') {
        if(ruta.endsWith('/publicacion')&&fallarPublicacion)throw Error('Registro 2: falta nota; no se guardó ni publicó ninguna parte');
        for(const entrada of opciones.body.calificaciones){const {matriculaId,...campos}=entrada;Object.assign(notas.find(n=>n.matriculaId===matriculaId),campos);}
        if(ruta.endsWith('/publicacion'))return {data:{calificaciones:structuredClone(notas),registros:[1]}};
        return {data:structuredClone(notas)};
      }
      if(fallanNotas)throw Error('HTTP 500 calificaciones');
      return {data:structuredClone(notas)};
    },
    async descargar(id,tipo){descargas.push({id,tipo});}
  };
  const contexto={APIAcademica:api,Portal:{esc:String,listo:Promise.resolve({profesorId:'001'})},
    document:{getElementById:el,querySelectorAll:()=>[]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    location:{search},history:{replaceState(){}},URLSearchParams,confirm:mensaje=>{avisos.push(mensaje);return true;},addEventListener(){}};
  contexto.window=contexto;vm.runInNewContext(script,contexto);await tick();
  function editar(campo,valor){
    const inputs=['nota1','nota2','nota3','reposicion'].map(c=>({dataset:{campo:c},value:String(notas[0][c]??''),validity:{badInput:false},classList:{toggle(){}}}));
    inputs.find(i=>i.dataset.campo===campo).value=valor;
    const tr={dataset:{m:'7'},querySelectorAll:()=>inputs,querySelector:()=>({textContent:''}),classList:{toggle(){}}};
    el('cuerpoNotas').handlers.input({target:{closest:()=>({closest:()=>tr})}});
  }
  return {el,llamadas,descargas,avisos,storage,editar,contexto};
}

test('sin selección no elige ni descarga una asignatura arbitraria',async()=>{
  const p=await pagina({search:'?accion=pdf'});
  assert.equal(p.llamadas.length,1);assert.match(p.el('cuerpoNotas').innerHTML,/Selecciona una asignatura/);
  await p.contexto.descargarInformeCurso('pdf');assert.equal(p.descargas.length,0);assert.equal(p.el('selCurso').enfocado,true);
});

test('fallo paralelo de notas mantiene visibles los estudiantes y bloquea edición',async()=>{
  const p=await pagina({fallanNotas:true});assert.match(p.el('cuerpoNotas').innerHTML,/Alumna existente/);
  assert.match(p.el('mensaje').textContent,/Los estudiantes sí se cargaron.*HTTP 500/);
  assert.equal(p.el('btnEnviar').disabled,true);assert.equal(p.el('btnPublicar').disabled,true);
  const error=await pagina({fallanEstudiantes:true});assert.match(error.el('mensaje').textContent,/Estudiantes: HTTP 503/);
  assert.doesNotMatch(error.el('cuerpoNotas').innerHTML,/Esta asignatura no tiene estudiantes/);
});

test('borrador envía notas parciales al servidor y recuperación usa las notas leídas',async()=>{
  const p=await pagina();p.editar('nota1','8');assert.equal(p.el('btnEnviar').disabled,false);
  await p.el('btnEnviar').handlers.click();
  const envio=p.llamadas.find(l=>l.method==='POST');assert.equal(envio.ruta,'/cursos/1/calificaciones');
  assert.deepEqual(JSON.parse(JSON.stringify(envio.body)),{calificaciones:[{matriculaId:7,nota1:8}]});
  assert.match(p.el('mensaje').textContent,/guardado en PostgreSQL/);assert.equal(p.storage.size,0);
  assert.match(p.el('cuerpoNotas').innerHTML,/value="8"/);
});

test('publicar usa una solicitud masiva y conserva las ediciones si falla',async()=>{
  const p=await pagina({fallarPublicacion:true});p.editar('nota1','9');
  await p.el('btnPublicar').handlers.click();
  const envios=p.llamadas.filter(l=>l.method==='POST');assert.equal(envios.length,1);assert.equal(envios[0].ruta,'/cursos/1/calificaciones/publicacion');
  assert.match(p.el('mensaje').textContent,/Registro 2/);assert.equal(p.el('btnEnviar').disabled,false);assert.equal(p.storage.size,1);
  const vuelta=await pagina({storage:p.storage});assert.match(vuelta.el('cuerpoNotas').innerHTML,/value="9"/);
  const correcto=await pagina();correcto.editar('nota1','9');await correcto.el('btnPublicar').handlers.click();
  assert.match(correcto.el('mensaje').textContent,/guardados y publicados/);assert.equal(correcto.storage.size,0);
});

test('informes avisan de pendientes y utilizan la asignatura seleccionada',async()=>{
  const p=await pagina();p.editar('nota1','8');await p.contexto.descargarInformeCurso('pdf');
  assert.match(p.avisos[0],/notas guardadas en PostgreSQL/);assert.deepEqual(p.descargas,[{id:1,tipo:'pdf'}]);assert.equal(p.storage.size,1);
  await p.el('btnExcel').handlers.click();assert.equal(p.descargas[1].tipo,'xlsx');
  assert.match(p.el('mensaje').textContent,/Excel descargado/);
});

test('HTML y frontend no ofrecen incorporación de estudiantes ni paneles por registro',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../PagWeb/asignatura.html'),'utf8');
  for(const texto of ['archivoEstudiantes','btnImportar','estadoRegistro1','publicar1','data-guardar'])assert.ok(!html.includes(texto)&&!script.includes(texto));
  assert.ok(html.includes('id="btnPublicar"'));assert.ok(!script.includes('/estudiantes/cargaMasiva'));
});

test('barra lateral dirige a selección o delega la descarga de la materia activa',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../PagWeb/src/js/navegacion-academica.js'),'utf8');
  const enlaces=['Imprimir','Exportar a Excel'].map(textContent=>({textContent,addEventListener(_,fn){this.click=fn;}}));
  const contexto={document:{addEventListener(_,fn){fn();},querySelectorAll:()=>enlaces},window:{}};
  vm.runInNewContext(source,contexto);
  assert.equal(enlaces[0].href,'asignatura.html?accion=pdf');assert.equal(enlaces[1].href,'asignatura.html?accion=xlsx');
  let evitada=false;enlaces[0].click({preventDefault(){evitada=true;}});assert.equal(evitada,false);
  const tipos=[];contexto.window.descargarInformeCurso=tipo=>tipos.push(tipo);
  enlaces[0].click({preventDefault(){evitada=true;}});enlaces[1].click({preventDefault(){}});
  assert.equal(evitada,true);assert.deepEqual(tipos,['pdf','xlsx']);
});
