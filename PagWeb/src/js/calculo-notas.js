// El navegador y el backend usan exactamente la misma regla académica.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CalculoNotas = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const campos = ['nota1', 'nota2', 'nota3', 'reposicion'];
  function notaValida(v) {
    return v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10 && Math.abs(v*100-Math.round(v*100))<1e-8);
  }
  function evaluar(notas) {
    const n = Object.fromEntries(campos.map(k => [k, notas[k] ?? null]));
    const salida = {notaFinal:null, notaAcumulada:null, notaFinalOrdinaria:null, puedeReponer:false, errorReposicion:null, aprobado:null};
    if (!campos.every(k => notaValida(n[k]))) {
      salida.errorReposicion = 'Las notas deben estar entre 0 y 10, con hasta dos decimales, o quedar vacías.';
      return salida;
    }
    // Las notas admiten centésimas, como los campos numeric(5,2) de PostgreSQL.
    // Escalar a enteros evita errores binarios; no se redondean promedios intermedios.
    const centesimas = v => Math.round(v * 100);
    // Avance provisional: solo sumamos los aportes conocidos, sin modificar
    // los null ni redistribuir el peso de los registros todavía vacíos.
    const pesos=[3,3,4];
    const acumulada=[n.nota1,n.nota2,n.nota3].reduce((s,v,i)=>s+(v===null?0:centesimas(v)*pesos[i]),0);
    salida.notaAcumulada=Math.floor((acumulada+5)/10)/100;
    if ([n.nota1,n.nota2,n.nota3].some(v => v === null)) {
      if (n.reposicion !== null) salida.errorReposicion = 'La reposición requiere las tres notas ordinarias completas. Borra la reposición para guardar notas incompletas.';
      return salida;
    }
    const a=centesimas(n.nota1), b=centesimas(n.nota2), c=centesimas(n.nota3);
    const ordinaria = a*3 + b*3 + c*4;
    salida.notaFinalOrdinaria = ordinaria/1000;
    salida.puedeReponer = ordinaria < 6000 && a+b >= 1000;
    if (n.reposicion !== null && !salida.puedeReponer) {
      salida.errorReposicion = ordinaria >= 6000
        ? 'La reposición requiere una final ordinaria menor que 6.00. Borra la reposición antes de guardar estos cambios.'
        : 'La reposición requiere que nota1 + nota2 sea al menos 10. Borra la reposición antes de guardar estos cambios.';
      return salida;
    }
    const ponderada = n.reposicion === null ? ordinaria : a*3 + b*3 + centesimas(n.reposicion)*4;
    // Único redondeo de la final, después de aplicar las tres ponderaciones.
    salida.notaFinal = Math.floor((ponderada + 5)/10)/100;
    salida.aprobado = salida.notaFinal >= 6;
    return salida;
  }
  return {evaluar, notaValida};
});
