/* =========================================================
   Testes do banco de questões — sem nenhuma dependência.
   Rode com:  node testes/testar.js
   Ele sorteia milhares de questões de cada habilidade, em
   cada nível, e confere que todas são jogáveis.
   ========================================================= */
"use strict";
var fs=require("fs"), path=require("path");
var raiz=path.join(__dirname,"..");

global.window={};
eval(fs.readFileSync(path.join(raiz,"js/questoes.js"),"utf8"));
var Q=window.QUESTOES;

var SORTEIOS=2000;
var MIN_VARIEDADE=4;   /* mínimo de questões distintas por habilidade/nível */
var falhas=[], avisos=[];
function falha(m){ falhas.push(m); }
function aviso(m){ avisos.push(m); }

/* ---------- 1. estrutura geral ---------- */
if(!Q) falha("window.QUESTOES não foi exportado");
["areas","ordem","tipos","porTag","tiposDaArea","gerar","textoVoz","utils"].forEach(function(k){
  if(!Q[k]) falha("QUESTOES."+k+" está faltando");
});
Q.ordem.forEach(function(a){
  if(!Q.areas[a]) falha("área '"+a+"' está em ordem mas não em areas");
});
Object.keys(Q.areas).forEach(function(a){
  if(Q.ordem.indexOf(a)<0) falha("área '"+a+"' existe mas não aparece em ordem");
  if(a!=="voz" && !Q.tiposDaArea(a).length) falha("área '"+a+"' não tem nenhuma habilidade");
});

/* tags precisam ser únicas: são a chave do histórico de nível de cada criança */
var vistas={};
Q.tipos.forEach(function(t){
  if(vistas[t.tag]) falha("tag repetida: '"+t.tag+"' (o nível da criança ficaria misturado)");
  vistas[t.tag]=1;
  if(!Q.areas[t.area]) falha("habilidade '"+t.tag+"' aponta para a área inexistente '"+t.area+"'");
  if(typeof t.fn!=="function") falha("habilidade '"+t.tag+"' não tem função geradora");
});

/* ---------- 2. cada questão precisa ser jogável ---------- */
Q.tipos.forEach(function(t){
  [1,2,3].forEach(function(nv){
    var onde=t.tag+" (nível "+nv+")", distintas={}, n=0;
    for(var i=0;i<SORTEIOS;i++){
      var q;
      try{ q=t.fn(nv); }
      catch(e){ falha(onde+": estourou erro — "+e.message); return; }

      if(!q){ falha(onde+": não devolveu questão"); return; }
      if(!q.txt){ falha(onde+": questão sem enunciado"); return; }
      if(!Array.isArray(q.ops)){ falha(onde+": questão sem lista de respostas"); return; }
      if(q.ops.length<2){ falha(onde+": só "+q.ops.length+" resposta(s) — "+q.txt); return; }

      var certas=q.ops.filter(function(o){return o.ok;}).length;
      if(certas!==1){ falha(onde+": "+certas+" respostas certas — "+q.txt+" "+JSON.stringify(q.ops.map(function(o){return o.t;}))); return; }

      var txts=q.ops.map(function(o){return String(o.t);});
      txts.forEach(function(x){
        if(!x || x==="undefined" || x==="NaN" || x==="null")
          falha(onde+": resposta vazia ou inválida — "+JSON.stringify(txts));
      });
      if(new Set(txts).size!==txts.length)
        falha(onde+": respostas repetidas — "+q.txt+" "+JSON.stringify(txts));

      [q.txt,q.fala,q.porque,q.conta,q.frase].forEach(function(campo){
        if(campo && /undefined|NaN|\[object/.test(campo))
          falha(onde+": texto quebrado — "+campo);
      });
      if(q.preview && (!q.preview.fig || !(q.preview.seg>0)))
        falha(onde+": tela de memorização mal formada");

      distintas[(q.txt||"")+"|"+(q.fig||"")+"|"+(q.conta||"")+"|"+(q.frase||"")+"|"+txts.filter(function(_,k){return q.ops[k].ok;})]=1;
      n++;
    }
    var v=Object.keys(distintas).length;
    if(n && v<MIN_VARIEDADE)
      falha(onde+": só "+v+" questão(ões) diferente(s) em "+SORTEIOS+" sorteios — a criança decora em pouco tempo");
    if(n && v<10) aviso(onde+": só "+v+" questões diferentes — vale acrescentar mais");
  });
});

/* ---------- 3. explicações no erro ---------- */
var semPorque=[];
Q.tipos.forEach(function(t){
  var tem=false;
  for(var i=0;i<80;i++){ var q=t.fn(rndNv()); if(q&&q.porque) {tem=true;break;} }
  if(!tem) semPorque.push(t.tag);
});
function rndNv(){ return 1+Math.floor(Math.random()*3); }
if(semPorque.length) falha("habilidades sem explicação de erro: "+semPorque.join(", "));

/* ---------- 4. gerar() por tag, usado pela revisão ---------- */
Q.tipos.forEach(function(t){
  var q=Q.gerar(t.tag,2);
  if(!q) falha("QUESTOES.gerar('"+t.tag+"') devolveu vazio");
  else if(q.tag!==t.tag || q.area!==t.area) falha("QUESTOES.gerar('"+t.tag+"') não marcou tag/área");
});
if(Q.gerar("habilidade que não existe",1)!==null) falha("gerar() deveria devolver null para tag desconhecida");

/* ---------- 5. textos de leitura em voz alta ---------- */
[1,2,3].forEach(function(nv){
  for(var i=0;i<30;i++){
    var t=Q.textoVoz(nv,i);
    if(!t || typeof t!=="string" || t.length<10) falha("textoVoz("+nv+","+i+") devolveu algo estranho: "+t);
  }
});

/* ---------- resultado ---------- */
var total=Q.tipos.length;
console.log("Habilidades testadas: "+total+"  ("+SORTEIOS+" sorteios em cada nível)");
Q.ordem.forEach(function(a){
  if(a==="voz") return;
  console.log("  "+Q.areas[a].nome+": "+Q.tiposDaArea(a).length+" habilidades");
});
if(avisos.length){
  console.log("\nAvisos (não quebram nada):");
  avisos.slice(0,15).forEach(function(m){ console.log("  · "+m); });
  if(avisos.length>15) console.log("  · ... e mais "+(avisos.length-15));
}
if(falhas.length){
  console.log("\n"+falhas.length+" PROBLEMA(S):");
  falhas.slice(0,40).forEach(function(m){ console.log("  ✗ "+m); });
  if(falhas.length>40) console.log("  ✗ ... e mais "+(falhas.length-40));
  process.exit(1);
}
console.log("\nTudo certo ✓");
