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
var MIN_VARIEDADE=10;  /* mínimo de questões distintas por habilidade/nível */
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

/* ---------- 1b. duas palavras não podem dividir a mesma figura ----------
   Se 🧊 valesse para "gelo" e "geladeira", a criança olharia a figura,
   escreveria a palavra certa e seria marcada como errada — e "quantas
   sílabas tem?" teria duas respostas certas. */
(function(){
  var vistos={}, repetidos=[];
  ["Ler palavra","Escrever a palavra","Contar sílabas"].forEach(function(){});
  /* percorre as figuras que as habilidades de leitura realmente usam */
  var porFigura={};
  var t=Q.porTag["Ler palavra"];
  if(t){
    for(var i=0;i<20000;i++){
      var q=t.fn(3);
      if(!q.fig) continue;
      var certa=q.ops.filter(function(o){return o.ok;})[0].t;
      porFigura[q.fig]=porFigura[q.fig]||{};
      porFigura[q.fig][certa]=1;
    }
  }
  Object.keys(porFigura).forEach(function(fig){
    var palavras=Object.keys(porFigura[fig]);
    if(palavras.length>1) repetidos.push(fig+" → "+palavras.join(", "));
  });
  if(repetidos.length)
    falha("figuras usadas por mais de uma palavra (a criança acerta e é marcada errada): "+repetidos.join(" | "));
})();

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
      if(!Q.jogavel(q)){ falha(onde+": o app não consegue desenhar esta questão — "+JSON.stringify(q).slice(0,200)); return; }

      var chave;
      if(q.formato==="digitar"){
        /* a resposta tem de ser um número inteiro que caiba no tecladinho */
        if(!/^[0-9]{1,4}$/.test(q.resposta)) falha(onde+": resposta impossível de digitar — "+q.resposta);
        if(!q.conta && !q.fig) falha(onde+": questão de digitar sem conta nem figura — "+q.txt);
        chave="d|"+q.txt+"|"+(q.conta||"")+"|"+q.resposta;

      }else if(q.formato==="ordenar"){
        if(q.pecas.length<2||q.pecas.length>8) falha(onde+": "+q.pecas.length+" peças para ordenar — fora do que cabe na tela");
        /* as peças embaralhadas têm de ser exatamente as mesmas da resposta */
        var a1=q.pecas.slice().sort().join("\u0001"), a2=q.certo.slice().sort().join("\u0001");
        if(a1!==a2) falha(onde+": as peças não batem com a resposta — "+JSON.stringify(q.pecas)+" vs "+JSON.stringify(q.certo));
        q.certo.forEach(function(x){ if(!x||!String(x).trim()) falha(onde+": peça vazia em "+JSON.stringify(q.certo)); });
        if(q.certo.length>1 && q.pecas.join("\u0001")===q.certo.join("\u0001") && new Set(q.certo).size>1)
          falha(onde+": as peças vieram já na ordem certa");
        chave="o|"+q.txt+"|"+q.certo.join(",");

      }else if(q.formato==="escrever"){
        if(!/^[A-ZÇ]{1,12}$/.test(q.resposta))
          falha(onde+": resposta impossível de escrever no teclado — "+q.resposta);
        if(!q.fig && !q.frase && !q.falaResposta)
          falha(onde+": questão de escrever sem figura, sem palavra e sem áudio — a criança não tem pista nenhuma");
        chave="e|"+q.txt+"|"+(q.fig||"")+"|"+(q.frase||"")+"|"+q.resposta;

      }else if(q.formato==="ligar"){
        if(q.pares.length<2||q.pares.length>5) falha(onde+": "+q.pares.length+" pares — fora do que cabe na tela");
        var esq=q.pares.map(function(x){return String(x[0]);});
        var dir=q.pares.map(function(x){return String(x[1]);});
        /* se um lado repetir, existe mais de uma ligação certa e o jogo trava */
        if(new Set(esq).size!==esq.length) falha(onde+": lado esquerdo repetido — "+JSON.stringify(esq));
        if(new Set(dir).size!==dir.length) falha(onde+": lado direito repetido — "+JSON.stringify(dir));
        chave="l|"+q.txt+"|"+q.pares.map(function(x){return x.join(">");}).sort().join(",");

      }else{
        var certas=q.ops.filter(function(o){return o.ok;}).length;
        if(certas!==1){ falha(onde+": "+certas+" respostas certas — "+q.txt+" "+JSON.stringify(q.ops.map(function(o){return o.t;}))); return; }
        var txts=q.ops.map(function(o){return String(o.t);});
        txts.forEach(function(x){
          if(!x || x==="undefined" || x==="NaN" || x==="null")
            falha(onde+": resposta vazia ou inválida — "+JSON.stringify(txts));
        });
        if(new Set(txts).size!==txts.length)
          falha(onde+": respostas repetidas — "+q.txt+" "+JSON.stringify(txts));
        chave=(q.txt||"")+"|"+(q.fig||"")+"|"+(q.conta||"")+"|"+(q.frase||"")+"|"+txts.filter(function(_,k){return q.ops[k].ok;});
      }

      [q.txt,q.fala,q.porque,q.conta,q.frase].forEach(function(campo){
        if(campo && /undefined|NaN|\[object/.test(campo))
          falha(onde+": texto quebrado — "+campo);
      });
      if(q.preview && (!q.preview.fig || !(q.preview.seg>0)))
        falha(onde+": tela de memorização mal formada");

      distintas[chave]=1;
      n++;
    }
    var v=Object.keys(distintas).length;
    if(n && v<MIN_VARIEDADE)
      falha(onde+": só "+v+" questão(ões) diferente(s) em "+SORTEIOS+" sorteios — a criança decora em pouco tempo");
    if(n && v<16) aviso(onde+": só "+v+" questões diferentes — vale acrescentar mais");
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
var porFormato={};
Q.tipos.forEach(function(t){
  [1,2,3].forEach(function(nv){
    var q; try{ q=t.fn(nv); }catch(e){ return; }
    var f=(q&&q.formato)||"escolha";
    porFormato[f]=(porFormato[f]||0)+1;
  });
});
console.log("Habilidades testadas: "+total+"  ("+SORTEIOS+" sorteios em cada nível)");
console.log("Formatos de resposta: "+Object.keys(porFormato).map(function(f){return f+" ("+porFormato[f]+" habilidade-níveis)";}).join(", "));
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
