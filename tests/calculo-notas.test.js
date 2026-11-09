const {test}=require('node:test');
const assert=require('node:assert/strict');
const {evaluar}=require('../PagWeb/src/js/calculo-notas');

test('ejemplos acordados, cero explícito y eliminación de reposición',()=>{
  for(const [reposicion,final,aprobado] of [[null,4.6,false],[8,6.2,true],[7.5,6,true],[0,3,false],[10,7,true]]){
    const resultado=evaluar({nota1:5,nota2:5,nota3:4,reposicion});
    assert.equal(resultado.notaFinal,final);assert.equal(resultado.aprobado,aprobado);assert.equal(resultado.errorReposicion,null);
  }
});

test('elegibilidad usa la ordinaria original sin redondearla antes',()=>{
  const resultado=evaluar({nota1:6.6,nota2:5.8,nota3:5.69,reposicion:8});
  assert.equal(resultado.notaFinalOrdinaria,5.996);assert.equal(resultado.puedeReponer,true);
  assert.equal(resultado.notaFinal,6.92);
  assert.match(evaluar({nota1:6,nota2:6,nota3:6,reposicion:8}).errorReposicion,/menor que 6/);
  assert.match(evaluar({nota1:4.99,nota2:5,nota3:4,reposicion:8}).errorReposicion,/al menos 10/);
});

test('notas incompletas son pendientes y cero no se interpreta como vacío',()=>{
  for(const nota of ['nota1','nota2','nota3']){
    const notas={nota1:5,nota2:5,nota3:4,reposicion:null,[nota]:null};
    assert.equal(evaluar(notas).notaFinal,null);assert.equal(evaluar(notas).errorReposicion,null);
    assert.match(evaluar({...notas,reposicion:0}).errorReposicion,/completas/);
  }
  assert.equal(evaluar({nota1:0,nota2:0,nota3:0,reposicion:null}).notaFinal,0);
});

test('avance ponderado desde el primer registro sin redistribuir porcentajes',()=>{
  for(const [notas,acumulada,final] of [
    [{},0,null],
    [{nota1:8},2.4,null],
    [{nota1:8,nota2:7},4.5,null],
    [{nota1:8,nota2:7,nota3:9},8.1,8.1],
    [{nota3:9},3.6,null]
  ]){
    const c=evaluar(notas);assert.equal(c.notaAcumulada,acumulada);assert.equal(c.notaFinal,final);
    if(final===null){assert.equal(c.aprobado,null);assert.equal(c.puedeReponer,false);}
  }
});
