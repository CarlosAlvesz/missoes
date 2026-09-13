/* =========================================================
   Sons do jogo.
   Tudo é gerado na hora pelo próprio navegador (Web Audio),
   sem nenhum arquivo de áudio — o app continua leve e funciona
   offline. Se o aparelho não tiver suporte, o jogo segue igual,
   só sem som.
   ========================================================= */
(function(){
"use strict";

var ctx=null, ligado=true, suportado=(typeof window.AudioContext!=="undefined"||typeof window.webkitAudioContext!=="undefined");

function contexto(){
  if(!suportado||!ligado) return null;
  try{
    if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
    /* o navegador só libera áudio depois de um toque da criança */
    if(ctx.state==="suspended") ctx.resume();
    return ctx;
  }catch(e){ suportado=false; return null; }
}

/* uma nota simples */
function nota(freq,inicio,duracao,volume,forma){
  var c=contexto(); if(!c) return;
  try{
    var osc=c.createOscillator(), g=c.createGain();
    osc.type=forma||"sine";
    osc.frequency.setValueAtTime(freq,c.currentTime+inicio);
    g.gain.setValueAtTime(0.0001,c.currentTime+inicio);
    g.gain.exponentialRampToValueAtTime(volume,c.currentTime+inicio+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+inicio+duracao);
    osc.connect(g); g.connect(c.destination);
    osc.start(c.currentTime+inicio);
    osc.stop(c.currentTime+inicio+duracao+0.02);
  }catch(e){}
}

function melodia(notas,volume,forma){
  notas.forEach(function(n){ nota(n[0],n[1],n[2],volume||0.16,forma); });
}

function vibrar(padrao){
  if(!ligado) return;
  try{ if(navigator.vibrate) navigator.vibrate(padrao); }catch(e){}
}

window.SOM={
  get ligado(){ return ligado; },
  ligar:function(v){
    ligado=!!v;
    if(ligado) contexto();
  },
  suportado:function(){ return suportado; },
  /* o mesmo contexto de áudio é emprestado para a música de fundo:
     o navegador limita quantos contextos uma página pode abrir */
  contexto:function(){ return contexto(); },
  /* toque em qualquer botão */
  toque:function(){ nota(660,0,0.05,0.05,"triangle"); },
  /* acertou */
  acerto:function(){
    melodia([[784,0,0.11],[988,0.09,0.11],[1319,0.18,0.2]],0.13,"triangle");
    vibrar(30);
  },
  /* errou — nada de som feio: dois tons graves e curtos, sem drama */
  erro:function(){
    melodia([[392,0,0.12],[330,0.11,0.18]],0.11,"sine");
    vibrar([20,60,20]);
  },
  /* terminou a missão */
  fim:function(estrelas){
    var base=[[523,0,0.14],[659,0.12,0.14],[784,0.24,0.14]];
    if(estrelas>=3) base.push([1047,0.36,0.3]);
    melodia(base,0.15,"triangle");
    vibrar([40,50,40,50,80]);
  },
  /* subiu de nível / ganhou medalha */
  conquista:function(){
    melodia([[523,0,0.1],[784,0.08,0.1],[1047,0.16,0.1],[1319,0.24,0.36]],0.16,"triangle");
    vibrar([50,40,50,40,120]);
  },
  /* contagem da tela de memorização */
  tique:function(){ nota(880,0,0.04,0.05,"square"); }
};

})();
