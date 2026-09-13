/* =========================================================
   Música de fundo.

   Não existe arquivo de música: as notas são geradas na hora
   pelo navegador, como os efeitos sonoros. Isso mantém o app
   leve, funcionando offline e sem nenhuma questão de licença.

   A música é feita para não cansar nem atrapalhar o estudo:
   - escala pentatônica, onde nenhuma combinação soa errada;
   - lenta, baixinha e com pausas, sem melodia marcante para
     a criança ficar cantarolando em vez de pensar;
   - as notas são sorteadas dentro do acorde, então nunca se
     repete igual — não é um loop de poucos segundos;
   - abaixa sozinha quando o app fala, e para na leitura em
     voz alta, para não competir com a voz.
   ========================================================= */
(function(){
"use strict";

/* dó ré mi sol lá — pentatônica maior, em semitons.
   A melodia fica SEMPRE nesta escala, sem acompanhar o acorde: essas
   cinco notas caem bem em cima de dó, lá menor, fá e sol, então nunca
   sai do tom. Transpor junto com o acorde traria sustenidos e daria
   aquela sensação de música mudando de lugar. */
var ESCALA=[0,2,4,7,9,12,14,16];
/* volta harmônica lenta: dó, lá menor, fá, sol */
var ACORDES=[0,9,5,7];
var BASE=130.81;              /* dó3 */
var OITAVA_MELODIA=12;        /* a melodia canta uma oitava acima da base */
var PASSO=0.75;               /* uma nota a cada 0,75 s */
var COMPASSO=8;               /* notas por acorde */
var VOL_MELODIA=0.045;
var VOL_PAD=0.028;

var tocando=false, timer=null, proxima=0, passo=0, abaixado=false;
var grauAtual=2;              /* posição da melodia dentro da escala */
var mestre=null, filtro=null;

function ctx(){ return (window.SOM && window.SOM.contexto) ? window.SOM.contexto() : null; }

function freq(semitom){ return BASE*Math.pow(2,semitom/12); }

function montarSaida(c){
  if(mestre) return true;
  try{
    filtro=c.createBiquadFilter();
    filtro.type="lowpass";
    filtro.frequency.value=1400;   /* tira o brilho: fica macio, de fundo */
    mestre=c.createGain();
    mestre.gain.value=1;
    filtro.connect(mestre);
    mestre.connect(c.destination);
    return true;
  }catch(e){ return false; }
}

function nota(c,f,quando,duracao,volume,forma){
  try{
    var osc=c.createOscillator(), g=c.createGain();
    osc.type=forma||"sine";
    osc.frequency.setValueAtTime(f,quando);
    g.gain.setValueAtTime(0.0001,quando);
    g.gain.exponentialRampToValueAtTime(volume,quando+0.08);
    g.gain.exponentialRampToValueAtTime(0.0001,quando+duracao);
    osc.connect(g); g.connect(filtro);
    osc.start(quando);
    osc.stop(quando+duracao+0.05);
  }catch(e){}
}

function tocarPasso(c,quando){
  var acorde=ACORDES[Math.floor(passo/COMPASSO)%ACORDES.length];

  /* base longa a cada troca de acorde: tônica e quinta, bem embaixo */
  if(passo%COMPASSO===0){
    nota(c,freq(acorde),quando,COMPASSO*PASSO*0.95,VOL_PAD,"sine");
    nota(c,freq(acorde+7),quando,COMPASSO*PASSO*0.95,VOL_PAD*0.7,"sine");
  }

  /* melodia com pausas: o silêncio é o que impede de enjoar */
  if(Math.random()<0.38){ passo++; return; }

  /* Caminhada pela escala em vez de sorteio solto: a melodia anda
     de nota vizinha em nota vizinha, com um salto de vez em quando.
     Sorteio puro repete a mesma nota e soa de máquina. */
  var r=Math.random(), salto;
  if(r<0.30) salto=1;
  else if(r<0.60) salto=-1;
  else if(r<0.73) salto=2;
  else if(r<0.86) salto=-2;
  else if(r<0.93) salto=3;
  else salto=-3;
  var novo=grauAtual+salto;
  if(novo<0) novo=1;
  if(novo>ESCALA.length-1) novo=ESCALA.length-2;
  if(novo===grauAtual) novo=(grauAtual+1)%ESCALA.length;
  grauAtual=novo;

  var oitava=Math.random()<0.12?12:0;   /* de vez em quando sobe, sem exagerar */
  nota(c,freq(OITAVA_MELODIA+ESCALA[grauAtual]+oitava),quando,PASSO*(Math.random()<0.3?1.8:1.1),VOL_MELODIA,"triangle");
  passo++;
}

/* agenda um pouco à frente, para a música não engasgar quando a tela trava */
function agendar(){
  var c=ctx();
  if(!tocando||!c){ return; }
  while(proxima < c.currentTime+0.5){
    if(proxima < c.currentTime) proxima=c.currentTime+0.05;
    tocarPasso(c,proxima);
    proxima+=PASSO;
  }
  timer=setTimeout(agendar,150);
}

function iniciar(){
  if(tocando) return;
  var c=ctx(); if(!c) return;
  if(!montarSaida(c)) return;
  tocando=true;
  proxima=c.currentTime+0.15;
  agendar();
}

function parar(){
  tocando=false;
  if(timer){ clearTimeout(timer); timer=null; }
}

/* abaixa enquanto o app fala, para a voz ficar limpa */
function volume(v){
  var c=ctx();
  if(!mestre||!c) return;
  try{
    mestre.gain.cancelScheduledValues(c.currentTime);
    mestre.gain.setTargetAtTime(v,c.currentTime,0.12);
  }catch(e){}
}

window.MUSICA={
  tocando:function(){ return tocando; },
  iniciar:iniciar,
  parar:parar,
  abaixar:function(){ if(!abaixado){ abaixado=true; volume(0.18); } },
  levantar:function(){ if(abaixado){ abaixado=false; volume(1); } }
};

/* se a criança sai do app, a música não pode continuar tocando no bolso */
if(typeof document!=="undefined"){
  document.addEventListener("visibilitychange",function(){
    if(document.hidden){ if(tocando){ parar(); window.MUSICA.__retomar=true; } }
    else if(window.MUSICA.__retomar){ window.MUSICA.__retomar=false; iniciar(); }
  });
}

})();
