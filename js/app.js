/* =========================================================
   Missões — app do 1º ano
   ========================================================= */
(function(){
"use strict";

var Q=window.QUESTOES, U=Q.utils;
var shuffle=U.shuffle, pick=U.pick, rnd=U.rnd;
var NQ=8;                 /* perguntas por missão */
var MAX_REVISAO=3;        /* quantas dessas podem ser de revisão */
var LEMBRAR=70;           /* quantas perguntas recentes evitar repetir */
var META_PADRAO=2;        /* missões por dia, meta inicial */
var VERSAO="2.0";

function $(id){return document.getElementById(id);}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
/* monta um parágrafo com trechos em negrito sem passar por innerHTML:
   nome de criança e e-mail são digitados por quem usa o app e podem
   vir de outro aparelho pela sincronização */
function frase(){
  var p=el("p"), i;
  for(i=0;i<arguments.length;i++){
    var x=arguments[i];
    if(x==null||x==="") continue;
    if(typeof x==="object"&&x.b!=null) p.appendChild(el("b",null,String(x.b)));
    else if(typeof x==="object"&&x.i!=null) p.appendChild(el("em",null,String(x.i)));
    else p.appendChild(document.createTextNode(String(x)));
  }
  return p;
}
function neg(t){ return {b:t}; }
function ita(t){ return {i:t}; }
function hojeISO(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function fmtT(s){s=s||0;return s<60?(s+" segundos"):(Math.floor(s/60)+" min "+(s%60)+"s");}
function uid(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);}

/* ---------- som e voz ---------- */
var SOM=window.SOM||{ligar:function(){},toque:function(){},acerto:function(){},erro:function(){},
  fim:function(){},conquista:function(){},tique:function(){},suportado:function(){return false;}};

var MUSICA=window.MUSICA||{iniciar:function(){},parar:function(){},abaixar:function(){},
  levantar:function(){},tocando:function(){return false;}};

function somLigado(){ return dados.cfg.som!==false; }

/* O botão de ouvir a pergunta é uma muleta: com ele à mão, muita criança
   toca para escutar em vez de decifrar a frase. Em inglês é o contrário —
   ouvir a pronúncia é o próprio conteúdo da matéria. Por isso vem ligado
   só em inglês, e o adulto decide o resto em Adultos → Ajustes.
   Na leitura em voz alta ele nunca aparece. */
function narrador(){
  var n=dados.cfg.narrador;
  return (n==="sempre"||n==="nunca") ? n : "ingles";
}
function temNarrador(q){
  /* no ditado, ouvir a palavra é a própria pergunta: sem isso não há
     atividade. Não é muleta, é o enunciado. */
  if(q.narradorObrigatorio) return true;
  var n=narrador();
  if(n==="sempre") return true;
  if(n==="nunca") return false;
  return q.area==="ingles";
}
function musicaLigada(){ return somLigado() && dados.cfg.musica!==false; }

/* A música toca nas telas da criança. Sai de cena na leitura em voz alta
   (a criança lê e o adulto escuta: som de fundo atrapalha) e na área dos
   adultos. */
function ajustarMusica(tela){
  var naCrianca = ["tela-perfis","tela-home","tela-missao","tela-fim"].indexOf(tela)>=0;
  var lendoEmVozAlta = (tela==="tela-missao" && atual && atual.tipo==="voz");
  if(musicaLigada() && naCrianca && !lendoEmVozAlta) MUSICA.iniciar();
  else MUSICA.parar();
}

var temVoz = typeof window.speechSynthesis !== "undefined";
var vozes=[];
function carregarVozes(){
  if(!temVoz) return;
  try{ vozes=speechSynthesis.getVoices()||[]; }catch(e){ vozes=[]; }
}
if(temVoz){
  carregarVozes();
  try{ speechSynthesis.addEventListener("voiceschanged",carregarVozes); }catch(e){}
}
/* escolhe a melhor voz do aparelho para a língua pedida */
function melhorVoz(lang){
  if(!vozes.length) return null;
  var alvo = lang==="en" ? "en" : "pt";
  var exatas=vozes.filter(function(v){ return v.lang && v.lang.toLowerCase().replace("_","-")===(alvo==="en"?"en-us":"pt-br"); });
  if(exatas.length) return exatas[0];
  var parecidas=vozes.filter(function(v){ return v.lang && v.lang.toLowerCase().indexOf(alvo)===0; });
  return parecidas.length?parecidas[0]:null;
}
function falar(txt,lang){
  if(!temVoz||!txt||!somLigado()) return;
  try{
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(txt);
    u.lang = lang==="en" ? "en-US" : "pt-BR";
    var v=melhorVoz(lang);
    if(v) u.voice=v;
    u.rate = lang==="en" ? 0.82 : 0.92;
    u.pitch = 1.05;
    /* a música abaixa enquanto a voz fala, senão o enunciado fica embolado */
    MUSICA.abaixar();
    u.onend=function(){ MUSICA.levantar(); };
    u.onerror=function(){ MUSICA.levantar(); };
    speechSynthesis.speak(u);
    /* rede de segurança: em alguns aparelhos o onend não dispara */
    clearTimeout(timerVoz);
    timerVoz=setTimeout(function(){ MUSICA.levantar(); }, Math.min(20000, 2500+txt.length*90));
  }catch(e){ MUSICA.levantar(); }
}
var timerVoz=null;
function calarVoz(){
  if(temVoz) try{ speechSynthesis.cancel(); }catch(e){}
  clearTimeout(timerVoz);
  MUSICA.levantar();
}

/* =========================================================
   dados
   ========================================================= */
var CHAVE="missoes.dados.v2";
var dados={perfis:[],sessoes:[],cfg:{pin:"1234",ultimo:null,som:true,musica:true,narrador:"ingles"}};
var erroAoSalvar=false;

function carregar(){
  try{
    var r=localStorage.getItem(CHAVE);
    if(r){
      var p=JSON.parse(r);
      if(p&&typeof p==="object"){
        dados.perfis=Array.isArray(p.perfis)?p.perfis:[];
        dados.sessoes=Array.isArray(p.sessoes)?p.sessoes:[];
        dados.cfg=Object.assign({pin:"1234",ultimo:null,som:true,musica:true,narrador:"ingles"},p.cfg||{});
      }
    }
  }catch(e){}
}
function salvar(){
  try{
    localStorage.setItem(CHAVE,JSON.stringify(dados));
    erroAoSalvar=false;
  }catch(e){
    /* memória do navegador cheia ou bloqueada: o adulto precisa saber,
       senão a criança estuda e o histórico some sem ninguém perceber */
    erroAoSalvar=true;
    mostrarAvisoSalvar();
  }
  agendarSync();
}
function mostrarAvisoSalvar(){
  var a=$("arq-aviso");
  if(a && !$("tela-pais").hidden){
    a.textContent="Atenção: não consegui gravar neste aparelho (memória do navegador cheia ou bloqueada). Salve o histórico em arquivo antes de fechar.";
    a.style.color="var(--quase)";
  }
  var b=$("aviso-global");
  if(b){ b.hidden=false; b.textContent="⚠️ Não estou conseguindo gravar o progresso neste aparelho."; }
}
function perfisAtivos(){ return dados.perfis.filter(function(p){return !p.removido;}); }
function acharPerfil(id){ for(var i=0;i<dados.perfis.length;i++) if(dados.perfis[i].id===id) return dados.perfis[i]; return null; }
/* sessões apagadas continuam na lista como marca, para que o "apagar
   histórico" também valha nos outros aparelhos em vez de voltar no sync */
function sessoesVivas(){ return dados.sessoes.filter(function(s){return !s.removido;}); }
function sessoesDe(id){ return dados.sessoes.filter(function(s){return s.perfil===id && !s.removido;}); }

/* =========================================================
   revisão espaçada
   Ideia emprestada do Anki e do sistema de caixas de Leitner:
   o que a criança errou volta logo; o que ela acerta demora
   cada vez mais para voltar, até sair da fila. É o que faz o
   erro virar aprendizado em vez de só passar batido.
   ========================================================= */
var ESPERA=[0,0,1,3,7,16];   /* dias até a próxima revisão, por caixa */

function filaRevisao(p){ if(!p.revisao||typeof p.revisao!=="object") p.revisao={}; return p.revisao; }

function anotarErro(p,tag){
  var f=filaRevisao(p);
  f[tag]={caixa:1,prox:Date.now()};
  p.atualizado=Date.now();
}
function anotarAcerto(p,tag){
  var f=filaRevisao(p), r=f[tag];
  if(!r) return;
  r.caixa=(r.caixa||1)+1;
  if(r.caixa>=ESPERA.length){ delete f[tag]; }      /* acertou várias vezes: dominou */
  else r.prox=Date.now()+ESPERA[r.caixa]*864e5;
  p.atualizado=Date.now();
}
var ATRASO_OUTRA_AREA=3*864e5;  /* só depois disso uma revisão invade outra matéria */

/* Habilidades cuja hora de revisar já chegou, as mais atrasadas na frente.
   Com `area`, devolve só as daquela matéria — uma missão de Números não
   deve virar de repente uma pergunta de leitura — mas deixa passar as que
   estão atrasadas há dias, para nada ficar esquecido na fila. */
function revisoesVencidas(p,area){
  var f=filaRevisao(p), agora=Date.now(), out=[], limpou=false;
  Object.keys(f).forEach(function(tag){
    var t=Q.porTag[tag];
    if(!t){ delete f[tag]; limpou=true; return; }   /* habilidade que não existe mais */
    var prox=f[tag].prox||0;
    if(prox>agora) return;
    if(area && t.area!==area && (agora-prox)<ATRASO_OUTRA_AREA) return;
    out.push({tag:tag,area:t.area,prox:prox});
  });
  if(limpou) p.atualizado=Date.now();
  out.sort(function(a,b){
    var pa=(a.area===area?0:1), pb=(b.area===area?0:1);
    return pa!==pb ? pa-pb : a.prox-b.prox;
  });
  return out;
}
function totalRevisoes(p){ return revisoesVencidas(p,null).length; }

/* ---------- memória de perguntas recentes (para não repetir) ---------- */
function assinatura(q){
  var extra = q.formato==="digitar" ? q.resposta
            : q.formato==="ordenar" ? (q.certo||[]).join(",")
            : q.formato==="ligar"   ? (q.pares||[]).map(function(x){return x.join(">");}).sort().join(",")
            : "";
  return (q.tag||"")+"|"+(q.txt||"")+"|"+(q.fig||"")+"|"+(q.conta||"")+"|"+(q.frase||"")+"|"+extra;
}
function recentesDe(p){ if(!Array.isArray(p.recentes)) p.recentes=[]; return p.recentes; }
function lembrar(p,qs){
  var r=recentesDe(p);
  qs.forEach(function(q){ r.push(assinatura(q)); });
  if(r.length>LEMBRAR) p.recentes=r.slice(r.length-LEMBRAR);
  p.atualizado=Date.now();
}

/* ---------- sincronização ---------- */
var timerSync=null, sincronizando=false;
function agendarSync(){
  if(!window.SYNC || SYNC.estado()!=="ok") return;
  clearTimeout(timerSync);
  timerSync=setTimeout(sincronizarAgora,1500);
}
function sincronizarAgora(){
  if(!window.SYNC || SYNC.estado()!=="ok" || sincronizando) return Promise.resolve();
  sincronizando=true;
  return SYNC.sincronizar({perfis:dados.perfis,sessoes:dados.sessoes}).then(function(remoto){
    juntar(remoto);
    try{ localStorage.setItem(CHAVE,JSON.stringify(dados)); }catch(e){}
    pintarTudo();
  }).catch(function(e){
    var a=$("sync-aviso"); if(a&&!$("tela-pais").hidden){ a.textContent="Não consegui sincronizar agora: "+e.message; a.style.color="var(--quase)"; }
  }).then(function(){ sincronizando=false; });
}
/* Campos que existem só neste aparelho e não trafegam na sincronização.
   Sem isto, uma volta ao servidor apagaria a marca da gravação e o áudio
   ficaria órfão no IndexedDB, sem nada apontando para ele. */
var SO_LOCAL=["temAudio","recentes","revisao","revisoesFeitas","escudos","escudosGanhos","escudoUsado","meta"];

function juntar(remoto){
  ["perfis","sessoes"].forEach(function(chave){
    var mapa={};
    dados[chave].forEach(function(x){ mapa[x.id]=x; });
    (remoto[chave]||[]).forEach(function(r){
      var atual=mapa[r.id];
      if(!atual || (r.atualizado||0) > (atual.atualizado||0)){
        if(atual) SO_LOCAL.forEach(function(k){
          if(atual[k]!==undefined && r[k]===undefined) r[k]=atual[k];
        });
        mapa[r.id]=r;
      }
    });
    dados[chave]=Object.keys(mapa).map(function(k){return mapa[k];});
  });
  dados.sessoes.sort(function(a,b){return a.ts-b.ts;});
}

/* =========================================================
   níveis adaptativos
   ========================================================= */
function nivelDe(perfil,tag){
  var n=perfil.niveis&&perfil.niveis[tag];
  return (n===2||n===3)?n:1;
}
function recalcularNiveis(perfil){
  var hist={};
  sessoesDe(perfil.id).slice(-14).forEach(function(s){
    Object.keys(s.tags||{}).forEach(function(tag){
      hist[tag]=hist[tag]||{c:0,e:0};
      hist[tag].c+=s.tags[tag].c||0;
      hist[tag].e+=s.tags[tag].e||0;
    });
  });
  perfil.niveis=perfil.niveis||{};
  var mudou=[];
  Object.keys(hist).forEach(function(tag){
    var h=hist[tag], tot=h.c+h.e;
    if(tot<4) return;
    var pc=h.c/tot, nv=nivelDe(perfil,tag);
    if(pc>=0.85 && nv<3){ perfil.niveis[tag]=nv+1; mudou.push({tag:tag,dir:1}); }
    else if(pc<0.5 && nv>1){ perfil.niveis[tag]=nv-1; mudou.push({tag:tag,dir:-1}); }
  });
  perfil.atualizado=Date.now();
  return mudou;
}
function nivelDaArea(perfil,area){
  var tipos=Q.tiposDaArea(area);
  if(!tipos.length) return 1;
  var soma=0; tipos.forEach(function(t){ soma+=nivelDe(perfil,t.tag); });
  return Math.round(soma/tipos.length*10)/10;
}

/* =========================================================
   recompensas
   ========================================================= */
var FOGUETES=["🛴","🚲","🛵","🚗","🏎️","✈️","🚀","🛸"];
var NOME_VEIC=["patinete","bicicleta","motoca","carro","carro de corrida","avião","foguete","nave espacial"];
var POR_NIVEL=20;
function estrelasDe(perfil){ var t=0; sessoesDe(perfil.id).forEach(function(s){t+=s.estrelas||0;}); return t; }
function nivelFoguete(estrelas){ return Math.min(FOGUETES.length, Math.floor(estrelas/POR_NIVEL)+1); }
function diasComAtividade(perfil){
  var dias={}; sessoesDe(perfil.id).forEach(function(s){ dias[s.dia]=1; });
  return dias;
}
/* A sequência conta os dias seguidos de estudo. Um dia perdido pode ser
   coberto por um escudo, que a criança ganha a cada 5 dias seguidos —
   ideia emprestada do "streak freeze" do Duolingo: perder a sequência
   por um dia de imprevisto desanima mais do que ensina. */
function sequenciaDias(perfil){
  var dias=diasComAtividade(perfil);
  var cobertos=(perfil.escudoUsado&&typeof perfil.escudoUsado==="object")?perfil.escudoUsado:{};
  var n=0, d=new Date();
  if(!dias[hojeISO(d)]) d.setDate(d.getDate()-1);
  while(true){
    var iso=hojeISO(d);
    if(dias[iso]) n++;
    else if(cobertos[iso]) { /* dia protegido pelo escudo: não conta, mas não quebra */ }
    else break;
    d.setDate(d.getDate()-1);
  }
  return n;
}
function escudosDe(perfil){ return Math.max(0, Math.min(2, perfil.escudos||0)); }

/* Chamado ao abrir o perfil e ao terminar uma missão:
   gasta um escudo se ontem ficou em branco, e concede um novo
   a cada 5 dias de sequência. */
function atualizarEscudos(perfil){
  var dias=diasComAtividade(perfil);
  if(!Object.keys(dias).length) return;
  perfil.escudoUsado=(perfil.escudoUsado&&typeof perfil.escudoUsado==="object")?perfil.escudoUsado:{};

  /* protege os dias em branco entre o último estudo e hoje */
  var d=new Date(); d.setDate(d.getDate()-1);
  var guarda=0;
  while(guarda++<3){
    var iso=hojeISO(d);
    if(dias[iso]||perfil.escudoUsado[iso]) break;
    if(escudosDe(perfil)<=0) break;
    /* só vale a pena gastar se havia sequência antes desse buraco */
    var ontem=new Date(d); ontem.setDate(ontem.getDate()-1);
    if(!dias[hojeISO(ontem)] && !perfil.escudoUsado[hojeISO(ontem)]) break;
    perfil.escudos=escudosDe(perfil)-1;
    perfil.escudoUsado[iso]=1;
    perfil.atualizado=Date.now();
    d.setDate(d.getDate()-1);
  }

  /* concede escudo a cada 5 dias de sequência, no máximo 2 guardados */
  var seq=sequenciaDias(perfil);
  var merecidos=Math.floor(seq/5);
  if(merecidos>(perfil.escudosGanhos||0)){
    perfil.escudos=Math.min(2, escudosDe(perfil)+(merecidos-(perfil.escudosGanhos||0)));
    perfil.escudosGanhos=merecidos;
    perfil.atualizado=Date.now();
  }
}

/* ---------- meta do dia ---------- */
function metaDe(perfil){ var m=perfil.meta; return (m>=1&&m<=6)?m:META_PADRAO; }
function feitasHoje(perfil){
  var hoje=hojeISO();
  return sessoesDe(perfil.id).filter(function(s){return s.dia===hoje;}).length;
}
var MEDALHAS=[
  {e:"🌱",nome:"Primeira missão",tem:function(ss){return ss.length>=1;}},
  {e:"🔥",nome:"3 dias seguidos",tem:function(ss,p){return sequenciaDias(p)>=3;}},
  {e:"📚",nome:"10 missões",tem:function(ss){return ss.length>=10;}},
  {e:"🎯",nome:"Acertou tudo numa missão",tem:function(ss){return ss.some(function(s){return s.total>0&&s.acertos===s.total;});}},
  {e:"🗣️",nome:"Leu em voz alta 5 vezes",tem:function(ss){return ss.filter(function(s){return s.tipo==="voz";}).length>=5;}},
  {e:"🌎",nome:"Todas as matérias",tem:function(ss){var a={};ss.forEach(function(s){a[s.area]=1;});return ["leitura","mat","racio","ingles","ciencias"].every(function(k){return a[k];});}},
  {e:"⭐",nome:"100 estrelas",tem:function(ss,p){return estrelasDe(p)>=100;}},
  {e:"🏆",nome:"30 missões",tem:function(ss){return ss.length>=30;}},
  {e:"🔁",nome:"Revisou o que errou",tem:function(ss,p){return (p.revisoesFeitas||0)>=10;}},
  {e:"🛡️",nome:"7 dias seguidos",tem:function(ss,p){return sequenciaDias(p)>=7;}},
  {e:"🌟",nome:"3 estrelas 5 vezes",tem:function(ss){return ss.filter(function(s){return s.estrelas>=3;}).length>=5;}},
  {e:"🧠",nome:"100 missões",tem:function(ss){return ss.length>=100;}}
];
function medalhasConquistadas(p){
  var ss=sessoesDe(p.id);
  return MEDALHAS.filter(function(m){ try{ return m.tem(ss,p); }catch(e){ return false; } })
                 .map(function(m){ return m.nome; });
}

/* =========================================================
   telas
   ========================================================= */
var TELAS=["tela-perfis","tela-home","tela-missao","tela-fim","tela-aval","tela-pin","tela-pais","tela-crianca"];
var atualPerfil=null;

var telaAtual="tela-perfis";
function mostrar(id){
  telaAtual=id;
  TELAS.forEach(function(t){ var e=$(t); if(e) e.hidden=(t!==id); });
  var naCrianca = ["tela-home","tela-missao","tela-fim","tela-aval"].indexOf(id)>=0;
  /* durante a missão a barra de cima some: menos coisa para distrair */
  var emMissao = (id==="tela-missao");
  $("kid").hidden = !naCrianca;
  $("btn-trocar").hidden = !naCrianca || emMissao;
  $("btn-letra").hidden = !naCrianca || emMissao;
  $("btn-som").hidden = (id==="tela-pais"||id==="tela-pin"||id==="tela-crianca");
  $("btn-pais").hidden = emMissao;
  $("btn-pais").classList.toggle("on", id==="tela-pais");
  $("btn-pais").firstChild.className = "sinal" + (window.SYNC&&SYNC.estado()==="ok"?" ok":(window.SYNC&&SYNC.configurado?" off":""));
  ajustarMusica(id);
  window.scrollTo(0,0);
}

/* ---------- escolher criança ---------- */
function pintarPerfis(){
  var host=$("perfis"); host.innerHTML="";
  var lista=perfisAtivos();
  lista.forEach(function(p){
    var b=el("button","perfil"); b.type="button";
    b.appendChild(el("span","av",p.avatar||"🚀"));
    b.appendChild(el("span","nm",p.nome||"Sem nome"));
    var ss=sessoesDe(p.id);
    var seq=sequenciaDias(p);
    b.appendChild(el("span","sub", ss.length? (estrelasDe(p)+" estrelas"+(seq>1?" · "+seq+" dias seguidos":"")) : "vamos começar!"));
    b.addEventListener("click",function(){ abrirPerfil(p.id); });
    host.appendChild(b);
  });
  var novo=el("button","perfil novo"); novo.type="button";
  novo.appendChild(el("span","av","＋"));
  novo.appendChild(el("span","nm", lista.length?"Adicionar":"Criar perfil"));
  novo.addEventListener("click",function(){ editarCrianca(null); });
  host.appendChild(novo);
  $("perfis-sub").textContent = lista.length ? "Toque no seu foguete para começar." : "Crie o primeiro perfil para começar.";
}

function abrirPerfil(id){
  atualPerfil=acharPerfil(id);
  if(!atualPerfil) return;
  dados.cfg.ultimo=id;
  atualizarEscudos(atualPerfil);
  salvar();
  $("kid").classList.toggle("bastao", (atualPerfil.letra||"bastao")==="bastao");
  $("btn-letra").textContent = (atualPerfil.letra||"bastao")==="bastao" ? "AA letra bastão" : "Aa letra escolar";
  pintarHome();
  mostrar("tela-home");
}

/* ---------- home da criança ---------- */
var DIA_AREAS={0:["leitura"],1:["leitura","mat"],2:["mat","ingles"],3:["racio","leitura"],4:["ingles","ciencias"],5:["racio","ciencias"],6:["ciencias","racio"]};
var DIA_NOME=["domingo","segunda","terça","quarta","quinta","sexta","sábado"];

function pintarHome(){
  if(!atualPerfil) return;
  var p=atualPerfil, ss=sessoesDe(p.id), hoje=hojeISO();
  var estrelas=estrelasDe(p), nvF=nivelFoguete(estrelas), seq=sequenciaDias(p);

  $("h-foguete").textContent=FOGUETES[nvF-1];
  $("h-ola").textContent="Oi, "+(p.nome||"")+"!";
  var dow=new Date().getDay(), sug=DIA_AREAS[dow]||["leitura"];
  $("h-hoje").textContent="Hoje é "+DIA_NOME[dow]+": dia de "+sug.map(function(k){return Q.areas[k].nome;}).join(" e ");

  var noNivel=estrelas % POR_NIVEL, falta=POR_NIVEL-noNivel;
  $("h-fill").style.width = (nvF>=FOGUETES.length?100:(noNivel/POR_NIVEL*100))+"%";
  $("h-nivel").textContent="Nível "+nvF+" · "+NOME_VEIC[nvF-1];
  $("h-prox").textContent = nvF>=FOGUETES.length ? "no máximo!" : ("faltam "+falta+" estrelas");

  var med=$("h-medalhas"); med.innerHTML="";
  MEDALHAS.forEach(function(m){
    var s=el("span",null,m.e);
    s.title=m.nome;
    if(m.tem(ss,p)) s.className="tem";
    med.appendChild(s);
  });

  var hojeN=ss.filter(function(s){return s.dia===hoje;}).length;
  $("k-hoje").textContent=hojeN;
  $("k-estrelas").textContent=estrelas;
  $("k-seq").textContent=seq+(escudosDe(p)?" 🛡️":"");
  $("k-total").textContent=ss.length;

  /* meta do dia: regularidade rende mais que uma sessão longa */
  var meta=metaDe(p), pronto=hojeN>=meta;
  $("h-meta-fill").style.width=Math.min(100,hojeN/meta*100)+"%";
  $("h-meta-txt").textContent = pronto
    ? ("Meta do dia cumprida! "+hojeN+" de "+meta+" 🎉")
    : ("Meta de hoje: "+hojeN+" de "+meta+" missõe"+(meta>1?"s":"")+"");
  $("h-meta").classList.toggle("pronto",pronto);

  /* quantas revisões estão esperando */
  var nrev=totalRevisoes(p);
  var avisoRev=$("h-revisao");
  if(nrev){
    avisoRev.hidden=false;
    avisoRev.textContent="🔁 "+nrev+(nrev===1?" coisa":" coisas")+" para revisar — entram sozinhas nas próximas missões.";
  }else avisoRev.hidden=true;

  var host=$("missoes"); host.innerHTML="";
  var jaFez={}, revPorArea={};
  ss.forEach(function(s){ if(s.dia===hoje) jaFez[s.area]=1; });
  revisoesVencidas(p,null).forEach(function(r){ revPorArea[r.area]=(revPorArea[r.area]||0)+1; });
  Q.ordem.forEach(function(k){
    var a=Q.areas[k];
    var b=el("button","mcard m-"+k); b.type="button";
    b.appendChild(el("span","emo",a.emo));
    var box=el("span","txt");
    box.appendChild(el("span","nm kt",a.nome));
    box.appendChild(el("span","ds kt",a.ds));
    b.appendChild(box);
    b.appendChild(el("span","go kt", k==="voz"?"Ler agora →":"Começar →"));
    if(jaFez[k]) b.appendChild(el("span","feito","✅"));
    else if(sug.indexOf(k)>=0) b.appendChild(el("span","tag","hoje"));
    if(k!=="voz"){
      b.appendChild(el("span","nv","nível "+nivelDaArea(p,k)));
      if(revPorArea[k]) b.appendChild(el("span","rev","🔁 "+revPorArea[k]));
    }
    b.addEventListener("click",function(){ if(somLigado()) SOM.toque(); k==="voz"?abrirVoz():abrirMissao(k); });
    host.appendChild(b);
  });

  pintarTurma(p);
}

/* =========================================================
   A turma
   Mostra as outras crianças — irmãos, primos — com o veículo e a
   sequência de cada uma, mais o total que o grupo fez junto.

   De propósito NÃO existe classificação: ninguém é primeiro nem
   último. Com 6 anos, um ranking motiva quem já vai bem e desanima
   justamente quem mais precisa. Cada um vê o próprio veículo crescer
   e vê o placar do grupo, que só sobe quando alguém estuda.
   ========================================================= */
function inicioDaSemana(){
  var d=new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()-d.getDay());   /* volta para domingo */
  return d.getTime();
}

function pintarTurma(eu){
  var host=$("turma");
  host.innerHTML="";
  var lista=perfisAtivos();
  if(lista.length<2){ host.hidden=true; return; }   /* sozinho não há turma */
  host.hidden=false;

  var corte=inicioDaSemana();
  var totalSemana=0;
  lista.forEach(function(p){
    totalSemana+=sessoesDe(p.id).filter(function(s){ return s.ts>=corte; }).length;
  });

  var topo=el("div","turma-topo");
  topo.appendChild(el("h2","kt","A turma"));
  var placar=el("div","turma-placar kt");
  placar.textContent = totalSemana
    ? ("Juntos, a turma já fez "+totalSemana+" missõe"+(totalSemana>1?"s":"")+" esta semana! 🎉")
    : "Ninguém começou esta semana ainda. Seja o primeiro! 🚀";
  topo.appendChild(placar);
  host.appendChild(topo);

  var grade=el("div","turma-grade");
  /* ordem por nome, nunca por desempenho: ordenar por pontos seria um
     ranking disfarçado */
  lista.slice().sort(function(a,b){
    return String(a.nome||"").localeCompare(String(b.nome||""),"pt");
  }).forEach(function(p){
    var estrelas=estrelasDe(p), nv=nivelFoguete(estrelas), seq=sequenciaDias(p);
    var naSemana=sessoesDe(p.id).filter(function(s){ return s.ts>=corte; }).length;

    var c=el("div","amigo"+(p.id===eu.id?" eu":""));
    c.appendChild(el("span","av",p.avatar||"🚀"));
    var box=el("span","txt");
    box.appendChild(el("span","nm kt",(p.nome||"")+(p.id===eu.id?" (você)":"")));
    box.appendChild(el("span","vei",FOGUETES[nv-1]+" "+NOME_VEIC[nv-1]));
    var quando=el("span","quando");
    quando.textContent = naSemana
      ? (naSemana+" esta semana"+(seq>1?" · "+seq+" dias seguidos":""))
      : "ainda não começou esta semana";
    box.appendChild(quando);
    c.appendChild(box);
    if(seq>=3) c.appendChild(el("span","fogo","🔥"));
    grade.appendChild(c);
  });
  host.appendChild(grade);
}

/* =========================================================
   missão
   ========================================================= */
var atual=null;

/* Monta as 8 perguntas da missão:
   - começa pelas revisões vencidas (o que ela errou antes), no máximo 3;
   - completa com perguntas novas da área, no nível atual de cada habilidade;
   - evita as perguntas que ela acabou de ver, para não decorar a resposta. */
function montarMissao(area,perfil){
  var out=[], usados={};
  var recentes={}; recentesDe(perfil).forEach(function(a){ recentes[a]=1; });

  function tentarAdicionar(tag,nv,ehRevisao,aceitarRepetida){
    var q=Q.gerar(tag,nv);
    if(!q) return false;
    var chave=assinatura(q);
    if(usados[chave]) return false;
    if(!aceitarRepetida && recentes[chave]) return false;
    usados[chave]=1;
    q.revisao=!!ehRevisao;
    out.push(q);
    return true;
  }

  /* 1. revisões (elas vêm primeiro, então out.length é quantas já entraram) */
  var fila=revisoesVencidas(perfil,area);
  for(var k=0;k<fila.length && out.length<Math.min(MAX_REVISAO,NQ);k++){
    var tagR=fila[k].tag, nvR=nivelDe(perfil,tagR), tent=0;
    while(tent++<25 && !tentarAdicionar(tagR,nvR,true,tent>15)){}
  }

  /* 2. perguntas novas da área */
  var tipos=Q.tiposDaArea(area);
  if(!tipos.length) return out;
  var ordem=shuffle(tipos), i=0, voltas=0;
  while(out.length<NQ && voltas++<400){
    var t=ordem[i % ordem.length]; i++;
    /* depois de dar muitas voltas, aceita repetir uma pergunta recente
       em vez de devolver uma missão curta */
    tentarAdicionar(t.tag, nivelDe(perfil,t.tag), false, voltas>200);
  }
  return shuffle(out);
}

/* Missão de treino: 8 perguntas só de uma habilidade, aberta pelo adulto
   a partir do painel. Vale como atividade normal no histórico. */
function abrirTreino(tag,perfilId){
  var p=acharPerfil(perfilId), t=Q.porTag[tag];
  if(!p||!t) return;
  atualPerfil=p;
  dados.cfg.ultimo=p.id;
  $("kid").classList.toggle("bastao",(p.letra||"bastao")==="bastao");
  $("btn-letra").textContent = (p.letra||"bastao")==="bastao" ? "AA letra bastão" : "Aa letra escolar";

  pararAvanco(); pararContagem();
  var nv=nivelDe(p,tag), qs=[], usados={}, voltas=0;
  while(qs.length<NQ && voltas++<400){
    var q=Q.gerar(tag,nv);
    if(!q) break;
    var chave=assinatura(q);
    /* depois de muitas voltas aceita repetir: algumas habilidades têm
       poucas perguntas distintas e é melhor treinar do que desistir */
    if(usados[chave] && voltas<200) continue;
    usados[chave]=1;
    qs.push(q);
  }
  if(!qs.length){ pintarPais(); mostrar("tela-pais"); return; }
  atual={area:t.area,tipo:"treino",treino:tag,qs:qs,i:0,acertos:0,tags:{},inicio:Date.now()};
  $("tela-missao").style.setProperty("--acc","var(--"+t.area+")");
  mostrar("tela-missao");
  pintarQuestao();
}

function abrirMissao(area){
  pararAvanco(); pararContagem(); largarMicrofone();
  var qs=montarMissao(area,atualPerfil);
  if(!qs.length){ pintarHome(); mostrar("tela-home"); return; }
  atual={area:area,tipo:"quiz",qs:qs,i:0,acertos:0,tags:{},inicio:Date.now()};
  $("tela-missao").style.setProperty("--acc","var(--"+area+")");
  mostrar("tela-missao");
  pintarQuestao();
}

function pintarDots(){
  var d=$("dots"); d.innerHTML="";
  atual.qs.forEach(function(q,i){
    var t=el("i");
    if(q.resultado===true)t.className="ok";
    else if(q.resultado===false)t.className="no";
    else if(i===atual.i)t.className="cur";
    d.appendChild(t);
  });
  $("cnt").textContent=(atual.i+1)+"/"+atual.qs.length;
}

function pintarQuestao(){
  pintarDots();
  var q=atual.qs[atual.i], card=$("qcard");
  card.innerHTML="";
  if(q.preview && !q.previewFeito) return pintarPreview(q,card);
  cabecalho(q,card);
  switch(q.formato){
    case "digitar": return pintarDigitar(q,card);
    case "escrever": return pintarEscrever(q,card);
    case "ordenar": return pintarOrdenar(q,card);
    case "ligar":   return pintarLigar(q,card);
    default:        return pintarEscolha(q,card);
  }
}

/* parte de cima do cartão, igual em todos os formatos */
function cabecalho(q,card){
  var tag=el("div","qtag");
  tag.appendChild(el("span",null,q.tag));
  if(q.revisao) tag.appendChild(el("em","rev","🔁 revisão"));
  if(q.nivel>1) tag.appendChild(el("em",null,"nível "+q.nivel));
  card.appendChild(tag);

  var row=el("div","qrow");
  row.appendChild(el("div","qtxt kt",q.txt));
  if(temNarrador(q)){
    var sp=el("button","speak","🔊"); sp.type="button"; sp.setAttribute("aria-label","Ouvir a pergunta");
    sp.addEventListener("click",function(){ falar(q.fala||q.txt,q.falaLang); });
    row.appendChild(sp);
  }
  card.appendChild(row);

  if(q.frase) card.appendChild(el("div","frase kt",q.frase));
  if(q.conta) card.appendChild(el("div","contas",q.conta));
  if(q.svg){ var sv=el("div","figura"); sv.innerHTML=q.svg; card.appendChild(sv); }
  if(q.fig) card.appendChild(el("div","figura"+(q.figGrande?" grande":""),q.fig));
}

/* ---------- formato 1: escolher entre alternativas ---------- */
function pintarEscolha(q,card){
  var ops=el("div","ops col"+(q.cols||3)+(q.emoji?" emo":""));
  q.ops.forEach(function(o){
    var b=el("button","op"+(q.emoji?" emoji":""),o.t);
    b.type="button";
    if(!q.emoji) b.classList.add("kt");
    if(q.opsLang==="en") b.lang="en";
    b.addEventListener("click",function(){
      Array.prototype.forEach.call(ops.children,function(c,idx){
        c.disabled=true;
        if(q.ops[idx].ok) c.classList.add("certa");
        else if(c===b) c.classList.add("errada");
        else c.classList.add("apagada");
      });
      concluir(q,!!o.ok,card);
    });
    ops.appendChild(b);
  });
  card.appendChild(ops);
}

/* ---------- formato 2: digitar números ---------- */
function pintarDigitar(q,card){
  var max=q.resposta.length+1, digitado="", respondido=false;
  var visor=el("div","visor");
  var valor=el("span","v","");
  visor.appendChild(valor);
  visor.setAttribute("aria-live","polite");
  card.appendChild(visor);

  var teclado=el("div","teclado");
  function atualizar(){
    if(respondido) return;   /* depois de conferir, o teclado fica travado */
    valor.textContent=digitado;
    visor.classList.toggle("vazio",!digitado);
    ok.disabled=!digitado;
  }
  function tecla(rot,acao,cls){
    var b=el("button","tecla"+(cls?" "+cls:""),rot); b.type="button";
    b.addEventListener("click",function(){ if(somLigado()) SOM.toque(); acao(); atualizar(); });
    teclado.appendChild(b);
    return b;
  }
  ["1","2","3","4","5","6","7","8","9"].forEach(function(n){
    tecla(n,function(){ if(digitado.length<max) digitado+=n; });
  });
  tecla("←",function(){ digitado=digitado.slice(0,-1); },"apaga");
  tecla("0",function(){ if(digitado.length<max) digitado+="0"; });
  var ok=tecla("✓",function(){
    if(!digitado||respondido) return;
    respondido=true;
    Array.prototype.forEach.call(teclado.children,function(c){ c.disabled=true; });
    var certo = digitado===q.resposta;
    visor.classList.add(certo?"certa":"errada");
    if(!certo) visor.appendChild(el("span","gabarito",q.resposta));
    concluir(q,certo,card);
  },"ok");
  card.appendChild(teclado);
  atualizar();
}

/* ---------- formato 3: escrever com o teclado de letras ----------
   O alfabeto vem em ordem alfabética, não em QWERTY: com 6 anos a
   criança conhece a ordem do ABC, não a do teclado do computador. */
var ALFABETO="ABCDEFGHIJKLMNOPQRSTUVWXYZÇ".split("");

function pintarEscrever(q,card){
  var escrito="", respondido=false;
  var alvo=q.resposta;

  /* uma casinha para cada letra: a criança vê de quantas precisa */
  var linha=el("div","casas");
  linha.setAttribute("aria-live","polite");
  card.appendChild(linha);

  var teclado=el("div","letras");
  var confirmar=null;

  function desenharCasas(){
    linha.innerHTML="";
    for(var i=0;i<alvo.length;i++){
      var c=el("span","casa"+(escrito[i]?" cheia":""), escrito[i]||"");
      if(i===escrito.length && !respondido) c.classList.add("agora");
      linha.appendChild(c);
    }
  }
  function atualizar(){
    if(respondido) return;
    desenharCasas();
    if(confirmar) confirmar.disabled = escrito.length!==alvo.length;
  }

  function tecla(rot,cls,acao){
    var b=el("button","letra"+(cls?" "+cls:""),rot); b.type="button";
    b.addEventListener("click",function(){
      if(respondido) return;
      if(somLigado()) SOM.toque();
      acao(); atualizar();
    });
    teclado.appendChild(b);
    return b;
  }

  ALFABETO.forEach(function(L){
    tecla(L,null,function(){ if(escrito.length<alvo.length) escrito+=L; });
  });
  tecla("←","apaga",function(){ escrito=escrito.slice(0,-1); });
  confirmar=tecla("✓","ok",function(){
    if(escrito.length!==alvo.length) return;
    respondido=true;
    Array.prototype.forEach.call(teclado.children,function(c){ c.disabled=true; });
    var certo = escrito===alvo;
    linha.classList.add(certo?"certa":"errada");
    desenharCasas();
    if(!certo){
      var g=el("div","casas gabarito");
      alvo.split("").forEach(function(L){ g.appendChild(el("span","casa cheia",L)); });
      card.insertBefore(g,teclado);
    }
    concluir(q,certo,card);
  });

  card.appendChild(teclado);
  atualizar();

  /* no ditado a palavra é dita assim que a pergunta aparece */
  if(q.falaResposta) setTimeout(function(){ falar(q.fala,q.falaLang); },350);
}

/* ---------- formato 4: colocar na ordem certa ---------- */
function pintarOrdenar(q,card){
  var montado=[];
  var tira=el("div","tira"+(q.cola?" cola":""));
  tira.setAttribute("aria-live","polite");
  var banca=el("div","banca");
  var acao=el("div","acoes-q");
  var conferir=el("button","btn wide","Conferir"); conferir.type="button";
  acao.appendChild(conferir);

  function desenhar(){
    tira.innerHTML=""; banca.innerHTML="";
    if(!montado.length) tira.appendChild(el("span","placeholder","toque nas peças abaixo"));
    montado.forEach(function(idx,pos){
      var b=el("button","peca posta kt",q.pecas[idx]); b.type="button";
      b.setAttribute("aria-label","Tirar "+q.pecas[idx]);
      b.addEventListener("click",function(){
        if(somLigado()) SOM.toque();
        montado.splice(pos,1); desenhar();
      });
      tira.appendChild(b);
    });
    q.pecas.forEach(function(txt,idx){
      if(montado.indexOf(idx)>=0) return;
      var b=el("button","peca kt",txt); b.type="button";
      b.addEventListener("click",function(){
        if(somLigado()) SOM.toque();
        montado.push(idx); desenhar();
      });
      banca.appendChild(b);
    });
    conferir.disabled = montado.length!==q.pecas.length;
  }

  conferir.addEventListener("click",function(){
    var resposta=montado.map(function(i){ return q.pecas[i]; });
    var certo = resposta.join("\u0001")===q.certo.join("\u0001");
    Array.prototype.forEach.call(tira.children,function(c){ c.disabled=true; });
    Array.prototype.forEach.call(banca.children,function(c){ c.disabled=true; });
    conferir.disabled=true;
    tira.classList.add(certo?"certa":"errada");
    if(!certo){
      var g=el("div","tira gabarito"+(q.cola?" cola":""));
      q.certo.forEach(function(t){ g.appendChild(el("span","peca posta kt",t)); });
      card.insertBefore(g,acao);
    }
    concluir(q,certo,card);
  });

  card.appendChild(tira);
  card.appendChild(banca);
  card.appendChild(acao);
  desenhar();
}

/* ---------- formato 5: ligar os pares ---------- */
function pintarLigar(q,card){
  var esq=shuffle(q.pares.map(function(x,i){ return {i:i,t:String(x[0])}; }));
  var dir=shuffle(q.pares.map(function(x,i){ return {i:i,t:String(x[1])}; }));
  var sel=null, feitos=0, erros=0;
  var grade=el("div","ligar");
  var colE=el("div","lado"), colD=el("div","lado");
  var botoesE={}, botoesD={};

  function criar(item,lado,emoji){
    var b=el("button","liga"+(emoji?" emoji":" kt"),item.t); b.type="button";
    b.addEventListener("click",function(){ tocar(item,lado,b); });
    (lado==="e"?botoesE:botoesD)[item.i]=b;
    (lado==="e"?colE:colD).appendChild(b);
  }
  function tocar(item,lado,b){
    if(b.disabled) return;
    if(somLigado()) SOM.toque();
    if(!sel || sel.lado===lado){
      /* trocou de ideia dentro do mesmo lado */
      if(sel) (sel.lado==="e"?botoesE:botoesD)[sel.item.i].classList.remove("sel");
      sel={item:item,lado:lado,btn:b};
      b.classList.add("sel");
      return;
    }
    var a=sel; sel=null;
    a.btn.classList.remove("sel");
    if(a.item.i===item.i){
      a.btn.classList.add("ligado"); b.classList.add("ligado");
      a.btn.disabled=true; b.disabled=true;
      feitos++;
      if(somLigado()) SOM.acerto();
      if(feitos===q.pares.length){
        /* um engano de toque não estraga a questão; dois já mostram que não sabia */
        concluir(q,erros<=1,card,{extra: erros?("Você ligou tudo, com "+erros+" tentativa"+(erros>1?"s":"")+" errada"+(erros>1?"s":"")+"."):null});
      }
    }else{
      erros++;
      if(somLigado()) SOM.erro();
      a.btn.classList.add("errou"); b.classList.add("errou");
      setTimeout(function(){ a.btn.classList.remove("errou"); b.classList.remove("errou"); },420);
    }
  }
  esq.forEach(function(x){ criar(x,"e",q.emojiEsq); });
  dir.forEach(function(x){ criar(x,"d",q.emojiDir); });
  grade.appendChild(colE); grade.appendChild(colD);
  card.appendChild(grade);
}

/* ---------- o que acontece depois de responder, em qualquer formato ---------- */
var ELOGIOS=["Muito bem!","É isso aí!","Acertou!","Boa!","Mandou bem!","Perfeito!"];
function concluir(q,certo,card,op){
  op=op||{};
  q.resultado=certo;
  atual.tags[q.tag]=atual.tags[q.tag]||{c:0,e:0};
  if(certo){ atual.acertos++; atual.tags[q.tag].c++; } else atual.tags[q.tag].e++;

  /* alimenta a fila de revisão na hora */
  if(atualPerfil){
    if(certo){
      anotarAcerto(atualPerfil,q.tag);
      if(q.revisao) atualPerfil.revisoesFeitas=(atualPerfil.revisoesFeitas||0)+1;
    }else anotarErro(atualPerfil,q.tag);
  }

  var ret=el("div","retorno "+(certo?"bom":"quase"));
  ret.appendChild(el("span","kt", certo?pick(ELOGIOS):(op.extra||"Quase! Olha a resposta certa.")));
  card.appendChild(ret);
  pintarDots();

  if(certo){
    if(somLigado()) SOM.acerto();
    falar(pick(["Muito bem","Isso","Boa"]));
    pararAvanco();
    timerAvanco=setTimeout(function(){ timerAvanco=null; avancar(); },1100);
  }else{
    if(somLigado()) SOM.erro();
    /* errar sem entender não ensina nada: aqui aparece o porquê */
    if(q.porque){
      var pq=el("div","porque");
      pq.appendChild(el("b",null,"Por quê: "));
      pq.appendChild(el("span","kt",q.porque));
      var sp2=el("button","speak mini","🔊"); sp2.type="button"; sp2.setAttribute("aria-label","Ouvir a explicação");
      sp2.addEventListener("click",function(){ falar(q.porque); });
      pq.appendChild(sp2);
      /* a explicação vem antes do botão Continuar, senão a criança
         clica em seguir sem chegar a ler o porquê */
      card.insertBefore(pq,ret);
      falar(q.porque);
    }
    var b=el("button","btn","Continuar"); b.type="button";
    b.addEventListener("click",avancar);
    ret.appendChild(b);
    b.focus();
  }
}

function pintarPreview(q,card){
  card.appendChild(el("div","qtag",q.tag));
  var row=el("div","qrow");
  row.appendChild(el("div","qtxt kt",q.preview.txt));
  /* a tela de memorização segue a mesma regra do resto: senão o botão
     de ouvir reaparecia aqui mesmo com o narrador desligado */
  if(temNarrador(q)){
    var sp=el("button","speak","🔊"); sp.type="button"; sp.setAttribute("aria-label","Ouvir");
    sp.addEventListener("click",function(){ falar(q.preview.txt); });
    row.appendChild(sp);
  }
  card.appendChild(row);
  card.appendChild(el("div","figura",q.preview.fig));
  var c=el("div","contagem",String(q.preview.seg));
  card.appendChild(c);
  var n=q.preview.seg;
  pararContagem();
  timerPreview=setInterval(function(){
    n--;
    if(n<=0){
      pararContagem();
      q.previewFeito=true;
      /* só repinta se a criança continua nesta mesma pergunta */
      if(!$("tela-missao").hidden && atual && atual.qs[atual.i]===q) pintarQuestao();
    }else{
      c.textContent=String(n);
      if(somLigado()) SOM.tique();
    }
  },1000);
}
var timerPreview=null;
function pararContagem(){ if(timerPreview){ clearInterval(timerPreview); timerPreview=null; } }

/* o antigo responder() virou pintarEscolha() + concluir(), compartilhados
   por todos os formatos de resposta. */
var timerAvanco=null;
function pararAvanco(){ if(timerAvanco){ clearTimeout(timerAvanco); timerAvanco=null; } }
/* nunca deixar o microfone aberto ao sair de uma leitura pela metade */
function largarMicrofone(){
  if(atual && atual.encerrarGravacao){ atual.encerrarGravacao(); atual.encerrarGravacao=null; }
  else if(window.GRAVADOR && GRAVADOR.gravando()) GRAVADOR.cancelar();
}
function avancar(){
  pararAvanco();
  atual.i++;
  if(atual.i>=atual.qs.length) terminar(); else pintarQuestao();
}

/* ---------- ler em voz alta ---------- */
function abrirVoz(){
  pararAvanco(); pararContagem(); calarVoz();
  var feitas=sessoesDe(atualPerfil.id).filter(function(s){return s.tipo==="voz";}).length;
  var nv=nivelDe(atualPerfil,"Leitura em voz alta");
  var texto=Q.textoVoz(nv,feitas);
  atual={area:"voz",tipo:"voz",texto:texto,inicio:Date.now(),acertos:0,qs:[],tags:{},nivel:nv,gravacao:null};
  $("tela-missao").style.setProperty("--acc","var(--voz)");
  mostrar("tela-missao");
  $("dots").innerHTML=""; $("cnt").textContent="";

  var card=$("qcard"); card.innerHTML="";
  card.appendChild(el("div","qtag","Leitura em voz alta"));
  /* Aqui não existe botão de ouvir: quem tem de ler é a criança.
     Se o app lesse primeiro, ela repetiria de cor em vez de decifrar. */
  card.appendChild(el("div","qtxt kt","Leia em voz alta. Grave para o adulto ouvir depois:"));
  card.appendChild(el("div","frase kt",texto));

  var dica=el("div","retorno"); dica.style.color="var(--ink-soft)";
  dica.appendChild(el("span",null,"Leia devagar. Se travar numa palavra, respire e tente de novo."));
  card.appendChild(dica);

  montarGravador(card,texto);
}

/* ---------- gravar a leitura ---------- */
function montarGravador(card,texto){
  var G=window.GRAVADOR;
  var caixa=el("div","gravador");
  card.appendChild(caixa);

  var acoes=el("div","acoes-q");
  var concluir=el("button","btn wide","Já li! ✓"); concluir.type="button";
  concluir.style.setProperty("--acc","var(--voz)");
  /* se a criança tocar aqui no meio da gravação, encerra e guarda o áudio
     antes de terminar — perder a leitura em silêncio seria pior */
  concluir.addEventListener("click",function(){
    if(somLigado()) SOM.toque();
    if(typeof encerrarAgora==="function" && encerrarAgora.gravando()){
      concluir.disabled=true;
      encerrarAgora().then(function(){ concluir.disabled=false; terminar(); });
      return;
    }
    terminar();
  });
  var encerrarAgora=null;
  acoes.appendChild(concluir);
  card.appendChild(acoes);

  /* aparelho sem microfone: o fluxo antigo continua valendo */
  if(!G || !G.suportado()){
    var aviso=el("div","gravador-aviso");
    aviso.textContent="Neste aparelho não dá para gravar ("+((G&&G.porQueNao())||"sem suporte")+"). Leia em voz alta para o adulto escutar ao vivo.";
    caixa.appendChild(aviso);
    return;
  }

  var estado=el("div","grav-estado kt","Toque no microfone e leia o texto.");
  var cronometro=el("div","grav-tempo","0:00");
  cronometro.hidden=true;
  var botao=el("button","grav-botao"); botao.type="button";
  botao.setAttribute("aria-label","Começar a gravar");
  botao.appendChild(el("span","ico","🎙️"));
  botao.appendChild(el("span","rot","Gravar"));

  var player=el("audio"); player.controls=true; player.className="grav-player"; player.hidden=true;
  var refazer=el("button","chip","Gravar de novo"); refazer.type="button"; refazer.hidden=true;

  caixa.appendChild(estado);
  caixa.appendChild(botao);
  caixa.appendChild(cronometro);
  caixa.appendChild(player);
  caixa.appendChild(refazer);

  var gravando=false, t0=0, timer=null, urlAtual=null;
  var LIMITE=120;   /* dois minutos é bem mais que qualquer texto daqui */

  function tempo(){
    var s=Math.floor((Date.now()-t0)/1000);
    cronometro.textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
    if(s>=LIMITE) encerrar();
  }
  /* soltar o endereço do áudio enquanto o tocador ainda aponta para ele
     faz o navegador tentar carregar um endereço morto. Primeiro desliga
     o tocador, depois solta. */
  function limparUrl(){
    if(!urlAtual) return;
    var antigo=urlAtual; urlAtual=null;
    try{ player.pause(); }catch(e){}
    try{ player.removeAttribute("src"); player.load(); }catch(e){}
    setTimeout(function(){ try{ URL.revokeObjectURL(antigo); }catch(e){} },0);
  }

  function comecar(){
    if(somLigado()) SOM.toque();
    MUSICA.parar();
    estado.textContent="Preparando o microfone...";
    botao.disabled=true;
    G.iniciar().then(function(){
      gravando=true; t0=Date.now();
      botao.disabled=false;
      botao.classList.add("gravando");
      botao.firstChild.textContent="⏹️";
      botao.lastChild.textContent="Parei";
      botao.setAttribute("aria-label","Parar de gravar");
      estado.textContent="Gravando... pode ler!";
      cronometro.hidden=false; cronometro.textContent="0:00";
      player.hidden=true; refazer.hidden=true;
      timer=setInterval(tempo,250);
    }).catch(function(e){
      botao.disabled=false;
      estado.textContent = /denied|not allowed/i.test(e&&e.name+" "+e.message)
        ? "O navegador não liberou o microfone. Dá para ler em voz alta assim mesmo e tocar em “Já li”."
        : "Não consegui usar o microfone. Dá para ler em voz alta assim mesmo.";
    });
  }

  function encerrar(){
    if(!gravando) return Promise.resolve();
    gravando=false;
    clearInterval(timer); timer=null;
    botao.classList.remove("gravando");
    botao.firstChild.textContent="🎙️";
    botao.lastChild.textContent="Gravar";
    botao.setAttribute("aria-label","Começar a gravar");
    estado.textContent="Guardando...";
    return G.parar().then(function(blob){
      var seg=Math.round((Date.now()-t0)/1000);
      atual.gravacao={blob:blob,seg:seg};
      limparUrl();
      urlAtual=URL.createObjectURL(blob);
      player.src=urlAtual;
      player.hidden=false;
      refazer.hidden=false;
      botao.hidden=true;
      cronometro.hidden=true;
      estado.textContent="Pronto! Escute como ficou e toque em “Já li”.";
      concluir.textContent="Já li! ✓";
    }).catch(function(){
      estado.textContent="A gravação não saiu. Tente de novo, ou toque em “Já li” assim mesmo.";
      cronometro.hidden=true;
    });
  }

  botao.addEventListener("click",function(){ gravando?encerrar():comecar(); });
  encerrarAgora=function(){ return encerrar(); };
  encerrarAgora.gravando=function(){ return gravando; };
  refazer.addEventListener("click",function(){
    atual.gravacao=null;
    limparUrl();
    player.hidden=true;
    refazer.hidden=true; botao.hidden=false;
    estado.textContent="Toque no microfone e leia o texto.";
  });

  /* sair no meio não pode deixar o microfone ligado */
  atual.encerrarGravacao=function(){
    if(timer){ clearInterval(timer); timer=null; }
    if(gravando){ G.cancelar(); gravando=false; }
    limparUrl();
  };
}

/* ---------- fim ---------- */
function terminar(){
  var seg=Math.round((Date.now()-atual.inicio)/1000);
  var total=atual.qs.length;
  var estrelas = atual.tipo==="voz" ? 2 : (atual.acertos>=total-1?3:(atual.acertos>=Math.ceil(total*0.6)?2:1));
  var s={
    id:uid(), perfil:atualPerfil.id, ts:Date.now(), dia:hojeISO(),
    area:atual.area, tipo:atual.tipo, treino:atual.treino||"", acertos:atual.acertos, total:total, seg:seg,
    estrelas:estrelas, tags:atual.tags, texto:atual.texto||"", nivel:atual.nivel||1,
    autonomia:null, foco:null, fluencia:null, obs:"", avaliador:"",
    atualizado:Date.now()
  };
  dados.sessoes.push(s);
  atual.sessao=s;

  /* o áudio vai para o IndexedDB, não para os dados sincronizados */
  if(atual.gravacao && window.GRAVADOR){
    s.temAudio=true;
    GRAVADOR.salvar(s.id,atualPerfil.id,atual.gravacao.blob,atual.gravacao.seg).then(function(deu){
      if(!deu){ s.temAudio=false; salvar(); }
    });
  }
  if(atual.encerrarGravacao) atual.encerrarGravacao();

  var medalhasAntes = atual.tipo==="voz" ? [] : medalhasConquistadas(atualPerfil);
  if(atual.qs.length) lembrar(atualPerfil,atual.qs);
  var mudou = atual.tipo==="voz" ? [] : recalcularNiveis(atualPerfil);
  atualizarEscudos(atualPerfil);
  salvar();
  var medalhasDepois = atual.tipo==="voz" ? [] : medalhasConquistadas(atualPerfil);
  var novaMedalha = medalhasDepois.filter(function(m){ return medalhasAntes.indexOf(m)<0; });

  $("f-estrelas").textContent="★★★☆☆☆".slice(3-estrelas,6-estrelas);
  var msg,placar;
  if(atual.tipo==="voz"){
    msg="Você leu tudo!"; placar="Agora chame um adulto para dizer como foi.";
  }else{
    msg = atual.acertos>=total-1?"Uau, quase tudo certo!":(atual.acertos>=Math.ceil(total*0.6)?"Muito bem!":"Bom trabalho! Vamos treinar mais.");
    placar=(atual.treino?("Treino de "+atual.treino.toLowerCase()+" · "):"")+
      "Você acertou "+atual.acertos+" de "+total+" · "+fmtT(seg);
  }
  $("f-msg").textContent=msg;
  $("f-placar").textContent=placar;

  var subiu=mudou.filter(function(m){return m.dir>0;});
  var box=$("f-subiu");
  box.innerHTML="";
  var avisos=[];
  if(subiu.length) avisos.push("Ficou mais difícil: "+subiu.map(function(m){return m.tag.toLowerCase();}).join(", ")+" 🎉");
  novaMedalha.forEach(function(nome){ avisos.push("Medalha nova: "+nome+" 🏅"); });
  if(avisos.length){
    box.hidden=false;
    avisos.forEach(function(t){ box.appendChild(el("div",null,t)); });
  } else box.hidden=true;

  if(somLigado()){
    if(subiu.length||novaMedalha.length) SOM.conquista();
    else SOM.fim(estrelas);
  }
  if(estrelas>=3) confete();
  falar(msg);
  mostrar("tela-fim");
}

/* ---------- confete simples, só com CSS ---------- */
function confete(){
  if(typeof document==="undefined") return;
  var host=$("confete"); if(!host) return;
  host.innerHTML="";
  var cores=["#F5B301","#2559C9","#0E8F63","#D2650B","#C0357A","#7431D4"];
  for(var i=0;i<26;i++){
    var p=el("i");
    p.style.left=(Math.random()*100)+"%";
    p.style.background=cores[i%cores.length];
    p.style.animationDelay=(Math.random()*0.5).toFixed(2)+"s";
    p.style.animationDuration=(1.6+Math.random()*1.2).toFixed(2)+"s";
    host.appendChild(p);
  }
  setTimeout(function(){ if(host) host.innerHTML=""; },3400);
}

/* =========================================================
   avaliação
   ========================================================= */
var avalAtual=null, avalVals={autonomia:null,foco:null,fluencia:null};
function grupoEscolha(id,campo){
  var host=$(id);
  Array.prototype.forEach.call(host.children,function(b){
    b.addEventListener("click",function(){
      Array.prototype.forEach.call(host.children,function(x){x.setAttribute("aria-pressed","false");});
      b.setAttribute("aria-pressed","true");
      avalVals[campo]=Number(b.getAttribute("data-v"));
    });
  });
}
function abrirAval(s){
  avalAtual=s;
  ["e-autonomia","e-foco","e-fluencia"].forEach(function(id){
    Array.prototype.forEach.call($(id).children,function(x){x.setAttribute("aria-pressed","false");});
  });
  avalVals={autonomia:null,foco:null,fluencia:null};
  $("obs").value="";
  var p=acharPerfil(s.perfil), nome=p?p.nome:"";
  var area=Q.areas[s.area]?Q.areas[s.area].nome:s.area;
  $("aval-ctx").textContent = s.tipo==="voz"
    ? (nome+" · leitura em voz alta · texto: “"+s.texto+"”")
    : (nome+" · "+area+" · acertou "+s.acertos+" de "+s.total+" em "+fmtT(s.seg));
  $("campo-fluencia").hidden = s.tipo!=="voz";
  montarAudioDaAvaliacao(s);
  mostrar("tela-aval");
}
/* tocador para o adulto ouvir a leitura antes de dar a nota */
var urlAval=null;
function montarAudioDaAvaliacao(s){
  var campo=$("campo-audio"), host=$("aval-audio");
  host.innerHTML="";   /* tira o tocador antigo antes de soltar o endereço dele */
  if(urlAval){
    var anterior=urlAval; urlAval=null;
    setTimeout(function(){ try{ URL.revokeObjectURL(anterior); }catch(e){} },0);
  }
  if(s.tipo!=="voz" || !s.temAudio || !window.GRAVADOR){ campo.hidden=true; return; }
  campo.hidden=false;
  host.appendChild(el("div","vazio","Carregando a gravação..."));
  GRAVADOR.buscar(s.id).then(function(g){
    host.innerHTML="";
    if(!g||!g.blob){
      host.appendChild(el("div","vazio","A gravação não está mais neste aparelho. O app guarda apenas as últimas "+GRAVADOR.guardarPorCrianca+" de cada criança, e o áudio não vai junto na sincronização."));
      return;
    }
    urlAval=URL.createObjectURL(g.blob);
    var a=el("audio"); a.controls=true; a.className="grav-player"; a.src=urlAval;
    host.appendChild(a);
    var pe=el("div","vazio","Ouça acompanhando o texto acima antes de marcar como foi a leitura.");
    host.appendChild(pe);
  });
}

function salvarAval(){
  if(!avalAtual) return;
  avalAtual.autonomia=avalVals.autonomia;
  avalAtual.foco=avalVals.foco;
  avalAtual.fluencia=avalVals.fluencia;
  avalAtual.obs=$("obs").value.slice(0,400);
  avalAtual.avaliador=(window.SYNC&&SYNC.email())||"";
  avalAtual.atualizado=Date.now();
  if(avalAtual.tipo==="voz" && avalVals.fluencia!=null){
    var p=acharPerfil(avalAtual.perfil);
    if(p){
      p.niveis=p.niveis||{};
      var nv=nivelDe(p,"Leitura em voz alta");
      if(avalVals.fluencia===3 && nv<3) p.niveis["Leitura em voz alta"]=nv+1;
      else if(avalVals.fluencia===1 && nv>1) p.niveis["Leitura em voz alta"]=nv-1;
      p.atualizado=Date.now();
    }
  }
  salvar();
  pintarPais();
  mostrar("tela-pais");
}

/* =========================================================
   área dos adultos
   ========================================================= */
var abaAtual="todos";
var NOME_AREA={};
Object.keys(Q.areas).forEach(function(k){ NOME_AREA[k]=Q.areas[k].nome; });

function pintarPais(){
  pintarAbas();
  pintarPendentes();
  pintarConteudo();
  pintarRelatorio();
  pintarListaPerfis();
  pintarSync();
  $("cfg-pin").value=dados.cfg.pin||"1234";
  $("cfg-musica").checked = dados.cfg.musica!==false;
  $("cfg-musica").disabled = !somLigado();
  $("cfg-narrador").value = narrador();
  pintarEspacoAudio();
  $("versao").textContent="versão "+VERSAO;
}

function pintarAbas(){
  var host=$("abas-criancas"); host.innerHTML="";
  var lista=perfisAtivos();
  if(lista.length>1){
    var t=el("button","chip"+(abaAtual==="todos"?" on":""),"Todos"); t.type="button";
    t.addEventListener("click",function(){ abaAtual="todos"; pintarPais(); });
    host.appendChild(t);
  } else if(lista.length===1) abaAtual=lista[0].id;
  lista.forEach(function(p){
    var b=el("button","chip"+(abaAtual===p.id?" on":""),(p.avatar||"🚀")+" "+p.nome); b.type="button";
    b.addEventListener("click",function(){ abaAtual=p.id; pintarPais(); });
    host.appendChild(b);
  });
}

function sessoesDaAba(){
  var ss = abaAtual==="todos" ? sessoesVivas() : sessoesDe(abaAtual);
  return ss.sort(function(a,b){return b.ts-a.ts;});
}

function pintarPendentes(){
  var host=$("pendentes"); host.innerHTML="";
  var pend=sessoesDaAba().filter(function(s){return s.autonomia==null;});
  if(!pend.length) return;
  var box=el("div","pend");
  box.appendChild(el("div","h",pend.length===1?"1 atividade esperando avaliação":(pend.length+" atividades esperando avaliação")));
  pend.slice(0,8).forEach(function(s){
    var p=acharPerfil(s.perfil);
    var b=el("button","chip mini",(p?p.avatar+" ":"")+(NOME_AREA[s.area]||s.area)+" · "+new Date(s.ts).toLocaleDateString("pt-BR")+" · avaliar");
    b.type="button"; b.style.marginRight="6px"; b.style.marginBottom="6px";
    b.addEventListener("click",function(){ abrirAval(s); });
    box.appendChild(b);
  });
  host.appendChild(box);
}

function pintarConteudo(){
  var host=$("conteudo-crianca"); host.innerHTML="";
  var ss=sessoesDaAba(), quiz=ss.filter(function(s){return s.tipo!=="voz";});

  /* kpis */
  var totQ=0,totA=0,totSeg=0;
  quiz.forEach(function(s){ totQ+=s.total; totA+=s.acertos; });
  ss.forEach(function(s){ totSeg+=s.seg||0; });
  var seteDias=Date.now()-7*864e5;
  var pct=totQ?Math.round(totA/totQ*100):0;
  var kp=el("div","kpis");
  [[ss.length,"atividades"],[ss.filter(function(s){return s.ts>=seteDias;}).length,"nos 7 dias"],
   [pct+"%","de acerto"],[(totSeg<60?totSeg+" s":Math.round(totSeg/60)+" min"),"de tempo"]]
   .forEach(function(p){ var d=el("div","kpi"); d.appendChild(el("b",null,String(p[0]))); d.appendChild(el("span",null,p[1])); kp.appendChild(d); });
  host.appendChild(el("h3",null,"Resumo"));
  host.appendChild(kp);

  /* por área */
  host.appendChild(el("h3",null,"Acerto por área"));
  var ha=el("div","areas");
  ["leitura","mat","racio","ingles","ciencias"].forEach(function(a){
    var sub=quiz.filter(function(s){return s.area===a;});
    var q=0,c=0; sub.forEach(function(s){q+=s.total;c+=s.acertos;});
    var pc=q?Math.round(c/q*100):0;
    var row=el("div","arow"); row.style.setProperty("--acc","var(--"+a+")");
    var lbl=el("div","lbl");
    lbl.appendChild(el("span",null,NOME_AREA[a]));
    var right=el("span");
    right.innerHTML = q ? ('<em>'+sub.length+' atividade'+(sub.length>1?'s':'')+'</em> <b>'+pc+'%</b>') : '<em>ainda sem dados</em>';
    lbl.appendChild(right);
    row.appendChild(lbl);
    var tr=el("div","track"); var i=el("i"); i.style.width=pc+"%"; tr.appendChild(i); row.appendChild(tr);
    ha.appendChild(row);
  });
  host.appendChild(ha);

  /* reforçar */
  host.appendChild(el("h3",null,"O que reforçar"));
  var lista=habilidades(quiz);
  var fracos=lista.filter(function(x){return x.pc<75;}).slice(0,6);
  var fortes=lista.slice().reverse().filter(function(x){return x.pc>=90;}).slice(0,3);
  if(!lista.length){
    host.appendChild(el("div","vazio","Depois de 3 ou 4 atividades aparece aqui exatamente qual habilidade está travando — sílabas, subtração, memória, cores em inglês e assim por diante."));
  }else{
    var g=el("div","reforcar");
    var alvo = abaAtual==="todos" ? null : acharPerfil(abaAtual);
    /* sem nada fraco, o que aparece são os pontos fortes — e isso precisa
       estar escrito, senão parece que 100% de acerto é problema */
    if(!fracos.length && fortes.length)
      host.appendChild(el("div","vazio","Nada abaixo de 75%: não há o que reforçar agora. O nível das questões já sobe sozinho conforme ele acerta. Onde ele está mais firme:"));
    (fracos.length?fracos:fortes).forEach(function(x){
      var d=el("div","rf"+(x.pc>=75?" bom":""));
      d.appendChild(el("b",null,x.nome));
      var s=el("span");
      s.appendChild(el("span","pc",x.pc+"%"));
      s.appendChild(document.createTextNode(" de acerto · "+x.tot+" tentativas · "+(NOME_AREA[x.area]||"")));
      d.appendChild(s);
      /* fecha o ciclo: saber o que está travando só ajuda se der para treinar aquilo */
      if(alvo && Q.porTag[x.nome]){
        var b=el("button","chip mini treinar",fracos.length?"Treinar isso ▸":"Treinar mesmo assim ▸"); b.type="button";
        b.title="Abrir uma missão só de "+x.nome+" para "+alvo.nome;
        b.addEventListener("click",function(){ abrirTreino(x.nome,alvo.id); });
        d.appendChild(b);
      }
      g.appendChild(d);
    });
    host.appendChild(g);
    if(!alvo && (fracos.length||fortes.length))
      host.appendChild(el("div","vazio","Escolha uma criança nas abas acima para poder treinar uma habilidade direto daqui."));
  }

  /* como trabalha */
  host.appendChild(el("h3",null,"Como trabalha"));
  var av=ss.filter(function(s){return s.autonomia!=null;});
  var hn=el("div","kpis");
  [[rot(media(av.map(function(s){return s.autonomia;})),["muita ajuda","uma ajudinha","sozinho"]),"autonomia"],
   [rot(media(av.map(function(s){return s.foco;})),["muito disperso","oscilando","focado"]),"concentração"],
   [rot(media(ss.filter(function(s){return s.fluencia!=null;}).map(function(s){return s.fluencia;})),["travando","soletrando","corrido"]),"leitura em voz alta"],
   [String(av.length),"avaliações"]]
   .forEach(function(p){ var d=el("div","kpi"); var b=el("b","txt",p[0]); d.appendChild(b); d.appendChild(el("span",null,p[1])); hn.appendChild(d); });
  host.appendChild(hn);

  /* evolução ao longo das semanas */
  host.appendChild(el("h3",null,"Está melhorando?"));
  pintarEvolucao(host,quiz,ss);

  /* tabela */
  host.appendChild(el("h3",null,"Últimas atividades"));
  var sc=el("div","scroller");
  var tb=el("table","tabela");
  var thead=el("thead"), trh=el("tr");
  var cols=["Quando","Criança","Atividade","Acerto","Tempo","Sozinho","Foco","Observação"];
  if(abaAtual!=="todos") cols.splice(1,1);
  cols.forEach(function(h){ trh.appendChild(el("th",null,h)); });
  thead.appendChild(trh); tb.appendChild(thead);
  var tbody=el("tbody");
  if(!ss.length){
    var tr0=el("tr"), td0=el("td",null,"Nenhuma atividade ainda.");
    td0.colSpan=cols.length; td0.style.color="var(--ink-faint)";
    tr0.appendChild(td0); tbody.appendChild(tr0);
  }
  ss.slice(0,15).forEach(function(s){
    var tr=el("tr"), d=new Date(s.ts), p=acharPerfil(s.perfil);
    tr.appendChild(td(d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),true));
    if(abaAtual==="todos") tr.appendChild(td(p?(p.avatar+" "+p.nome):"—"));
    tr.appendChild(td(s.treino ? ("treino: "+s.treino) : (NOME_AREA[s.area]||s.area)));
    tr.appendChild(td(s.tipo==="voz"?"—":(s.acertos+"/"+s.total),true));
    tr.appendChild(td(Math.floor(s.seg/60)+":"+String(s.seg%60).padStart(2,"0"),true));
    tr.appendChild(td(s.autonomia?["","muita ajuda","ajudinha","sozinho"][s.autonomia]:"—"));
    tr.appendChild(td(s.foco?["","disperso","oscilou","focado"][s.foco]:"—"));
    tr.appendChild(td(s.obs||"—"));
    tbody.appendChild(tr);
  });
  tb.appendChild(tbody); sc.appendChild(tb); host.appendChild(sc);
}
/* =========================================================
   Evolução por semana
   A pergunta que todo pai faz é "está melhorando?", e até agora o painel
   só mostrava fotos do momento. Uma coluna por semana, uma série só —
   acerto — porque misturar duas medidas de escalas diferentes no mesmo
   gráfico é a maneira mais fácil de enganar quem lê. O número de
   atividades vai escrito embaixo de cada semana, para uma semana de
   100% com uma atividade só não parecer um triunfo.
   ========================================================= */
var SEMANAS_GRAFICO=8;

function semanasDe(quiz,todas){
  var fim=inicioDaSemana(), out=[], i;
  for(i=SEMANAS_GRAFICO-1;i>=0;i--){
    var ini=fim-i*7*864e5, fimSem=ini+7*864e5;
    var doPeriodo=quiz.filter(function(s){ return s.ts>=ini && s.ts<fimSem; });
    var todasNo=todas.filter(function(s){ return s.ts>=ini && s.ts<fimSem; });
    var perguntas=0, acertos=0;
    doPeriodo.forEach(function(s){ perguntas+=s.total; acertos+=s.acertos; });
    out.push({
      ini:ini,
      rotulo:new Date(ini).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}),
      pc: perguntas ? Math.round(acertos/perguntas*100) : null,
      atividades: todasNo.length
    });
  }
  return out;
}

/* coluna com o topo arredondado e a base reta, assente na linha de base */
function colunaSVG(x,y,w,h,r){
  r=Math.min(r, w/2, h);
  var b=y+h;
  return "M"+x+" "+b+" L"+x+" "+(y+r)+" Q"+x+" "+y+" "+(x+r)+" "+y+
         " L"+(x+w-r)+" "+y+" Q"+(x+w)+" "+y+" "+(x+w)+" "+(y+r)+" L"+(x+w)+" "+b+" Z";
}

function pintarEvolucao(host,quiz,todas){
  var semanas=semanasDe(quiz,todas);
  var comDados=semanas.filter(function(w){ return w.pc!=null; });

  if(comDados.length<2){
    host.appendChild(el("div","vazio","Depois de duas semanas de atividades aparece aqui um gráfico do acerto semana a semana — dá para ver de relance se está subindo, estável ou caindo."));
    return;
  }

  /* manchete: primeira semana com dados contra a última */
  var pri=comDados[0], ult=comDados[comDados.length-1], dif=ult.pc-pri.pc;
  var manchete=el("p","evolucao-manchete");
  if(dif>=5) manchete.appendChild(el("b",null,"Subiu "+dif+" pontos"));
  else if(dif<=-5) manchete.appendChild(el("b",null,"Caiu "+Math.abs(dif)+" pontos"));
  else manchete.appendChild(el("b",null,"Estável"));
  manchete.appendChild(document.createTextNode(
    " — de "+pri.pc+"% em "+pri.rotulo+" para "+ult.pc+"% em "+ult.rotulo+"."));
  host.appendChild(manchete);

  /* medidas do desenho */
  var L=34, R=10, T=22, B=40, W=340, A=190;
  var largura=W-L-R, alturaPlot=A-T-B, base=T+alturaPlot;
  var passo=largura/semanas.length;
  var barra=Math.min(24, passo-8);

  var svg='<svg viewBox="0 0 '+W+' '+A+'" width="100%" role="img" '+
    'aria-label="Acerto por semana nas últimas '+semanas.length+' semanas">';

  /* linhas de apoio discretas, em 0, 50 e 100% */
  [0,50,100].forEach(function(v){
    var y=base-(v/100)*alturaPlot;
    svg+='<line x1="'+L+'" y1="'+y.toFixed(1)+'" x2="'+(W-R)+'" y2="'+y.toFixed(1)+
         '" stroke="currentColor" stroke-width="1" opacity=".18"/>';
    svg+='<text x="'+(L-7)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" '+
         'font-size="10" fill="currentColor" opacity=".55">'+v+'%</text>';
  });

  semanas.forEach(function(w,i){
    var cx=L+passo*i+passo/2, x=cx-barra/2;
    if(w.pc==null){
      /* semana em branco aparece como vazio, não como zero: a diferença importa */
      svg+='<rect x="'+x.toFixed(1)+'" y="'+(base-4)+'" width="'+barra.toFixed(1)+
           '" height="4" rx="2" fill="currentColor" opacity=".14"/>';
    }else{
      var h=Math.max(3,(w.pc/100)*alturaPlot), y=base-h;
      svg+='<path d="'+colunaSVG(x,y,barra,h,4)+'" fill="var(--grafico)">'+
           '<title>'+w.rotulo+": "+w.pc+'% de acerto em '+w.atividades+
           (w.atividades===1?' atividade':' atividades')+'</title></path>';
      /* só a última semana ganha o número em cima: rótulo em tudo vira ruído */
      if(i===semanas.length-1)
        svg+='<text x="'+cx.toFixed(1)+'" y="'+(y-7).toFixed(1)+'" text-anchor="middle" '+
             'font-size="12" font-weight="700" fill="currentColor">'+w.pc+'%</text>';
    }
    svg+='<text x="'+cx.toFixed(1)+'" y="'+(base+15)+'" text-anchor="middle" '+
         'font-size="9.5" fill="currentColor" opacity=".6">'+w.rotulo+'</text>';
    svg+='<text x="'+cx.toFixed(1)+'" y="'+(base+29)+'" text-anchor="middle" '+
         'font-size="9.5" fill="currentColor" opacity=".45">'+
         (w.atividades?(w.atividades+"×"):"—")+'</text>';
  });
  svg+='</svg>';

  var caixa=el("div","evolucao");
  caixa.innerHTML=svg;   /* só números e datas gerados aqui, nada digitado por pessoa */
  host.appendChild(caixa);
  host.appendChild(el("div","evolucao-nota","A altura é o acerto da semana; o número embaixo é quantas atividades ela fez. Uma semana de 100% com uma atividade só diz pouco."));
}

function td(txt,num){ return el("td",num?"n":null,txt); }
function media(a){ var v=a.filter(function(x){return typeof x==="number";}); if(!v.length) return null; return v.reduce(function(s,x){return s+x;},0)/v.length; }
function rot(m,rr){ if(m==null) return "—"; return rr[Math.min(2,Math.max(0,Math.round(m)-1))]; }

function habilidades(quiz){
  var agg={};
  quiz.forEach(function(s){
    Object.keys(s.tags||{}).forEach(function(nome){
      agg[nome]=agg[nome]||{c:0,e:0,area:s.area};
      agg[nome].c+=s.tags[nome].c||0;
      agg[nome].e+=s.tags[nome].e||0;
    });
  });
  return Object.keys(agg).map(function(n){
    var a=agg[n], tot=a.c+a.e;
    return {nome:n,tot:tot,pc:tot?Math.round(a.c/tot*100):0,area:a.area};
  }).filter(function(x){return x.tot>=3;}).sort(function(a,b){return a.pc-b.pc;});
}

/* ---------- relatório da semana ---------- */
function pintarRelatorio(){
  var host=$("relatorio"); host.innerHTML="";
  var lista = abaAtual==="todos" ? perfisAtivos() : [acharPerfil(abaAtual)].filter(Boolean);
  var corte=Date.now()-7*864e5, corteAnt=Date.now()-14*864e5;
  var box=el("div","relato"), algo=false;

  lista.forEach(function(p){
    var ss=sessoesDe(p.id);
    var semana=ss.filter(function(s){return s.ts>=corte;});
    if(!semana.length){
      box.appendChild(frase(neg(p.nome)," não fez nenhuma atividade nos últimos 7 dias."));
      algo=true; return;
    }
    algo=true;
    var quiz=semana.filter(function(s){return s.tipo!=="voz";});
    var q=0,c=0; quiz.forEach(function(s){q+=s.total;c+=s.acertos;});
    var pc=q?Math.round(c/q*100):0;
    var ant=ss.filter(function(s){return s.ts>=corteAnt&&s.ts<corte&&s.tipo!=="voz";});
    var qa=0,ca=0; ant.forEach(function(s){qa+=s.total;ca+=s.acertos;});
    var pca=qa?Math.round(ca/qa*100):null;
    var dias={}; semana.forEach(function(s){dias[s.dia]=1;});
    var nDias=Object.keys(dias).length;
    var fracos=habilidades(quiz).filter(function(x){return x.pc<75;}).slice(0,2);
    var focoM=media(semana.map(function(s){return s.foco;}));

    var comparacao = pca==null ? "." :
      (pc>pca+4 ? " — subiu "+(pc-pca)+" pontos em relação à semana passada." :
      (pc<pca-4 ? " — caiu "+(pca-pc)+" pontos em relação à semana passada." :
                  " — estável em relação à semana passada."));
    box.appendChild(frase(neg(p.nome)," fez ",neg(semana.length)," atividade"+(semana.length>1?"s":""),
      " em ",neg(nDias)," dia"+(nDias>1?"s":"")+" desta semana, com ",neg(pc+"%")," de acerto",comparacao));

    if(fracos.length){
      var p2=el("p");
      p2.appendChild(document.createTextNode("Para reforçar nos próximos dias: "));
      fracos.forEach(function(x,i){
        if(i) p2.appendChild(document.createTextNode(" e "));
        p2.appendChild(el("b",null,x.nome.toLowerCase()+" ("+x.pc+"%)"));
      });
      p2.appendChild(document.createTextNode("."));
      box.appendChild(p2);
    }else{
      box.appendChild(frase("Nenhuma habilidade travando esta semana. Dá para puxar um pouco mais o tempo dos blocos."));
    }

    var nrev=totalRevisoes(p);
    if(nrev) box.appendChild(frase("Na fila de revisão: ",neg(nrev),
      nrev===1?" habilidade que ele errou e vai reaparecer nas próximas missões."
             :" habilidades que ele errou e vão reaparecer nas próximas missões."));

    if(focoM!=null){
      box.appendChild(frase("Concentração pelas suas avaliações: ",
        neg(rot(focoM,["muito disperso","oscilando","focado até o fim"])),".",
        focoM<2 ? " Vale encurtar os blocos e garantir a pausa de movimento no meio." : ""));
    }

    if(nDias<3){
      box.appendChild(frase("A regularidade é o que mais pesa nessa idade: ",
        neg("3 a 5 dias por semana")," rende mais que uma sessão longa só."));
    }
  });

  if(!algo) box.appendChild(el("p","","Ainda não há atividades para resumir."));
  host.appendChild(box);
}

/* ---------- lista de crianças ---------- */
function pintarListaPerfis(){
  var host=$("lista-perfis"); host.innerHTML="";
  perfisAtivos().forEach(function(p){
    var row=el("div","lp");
    row.appendChild(el("span","av",p.avatar||"🚀"));
    var nm=el("span","nm",p.nome); row.appendChild(nm);
    var ss=sessoesDe(p.id);
    row.appendChild(el("span","meta",ss.length+" atividades · "+estrelasDe(p)+" estrelas"));
    var b=el("button","chip mini","Editar"); b.type="button";
    b.addEventListener("click",function(){ editarCrianca(p.id); });
    row.appendChild(b);
    host.appendChild(row);
  });
  if(!perfisAtivos().length) host.appendChild(el("div","vazio","Nenhuma criança cadastrada ainda."));
}

/* ---------- editar criança ---------- */
var AVATARES=["🚀","🦊","🐯","🐼","🦁","🐨","🐸","🦄","🐙","🦋","🐢","🦖","🐧","🐝","🦉","🐬"];
var editando=null, avatarSel="🚀";

function editarCrianca(id){
  editando=id?acharPerfil(id):null;
  $("cr-titulo").textContent = editando ? ("Editar "+editando.nome) : "Nova criança";
  $("cr-nome").value = editando?editando.nome:"";
  $("cr-letra").value = editando?(editando.letra||"bastao"):"bastao";
  $("cr-meta").value = String(editando?metaDe(editando):META_PADRAO);
  avatarSel = editando?(editando.avatar||"🚀"):"🚀";
  $("cr-apagar").hidden = !editando;
  var host=$("cr-avatares"); host.innerHTML="";
  AVATARES.forEach(function(a){
    var b=el("button",null,a); b.type="button";
    b.setAttribute("aria-pressed", a===avatarSel ? "true":"false");
    b.addEventListener("click",function(){
      avatarSel=a;
      Array.prototype.forEach.call(host.children,function(x){x.setAttribute("aria-pressed","false");});
      b.setAttribute("aria-pressed","true");
    });
    host.appendChild(b);
  });
  mostrar("tela-crianca");
}
function salvarCrianca(){
  var nome=$("cr-nome").value.trim().slice(0,18);
  if(!nome){ $("cr-nome").focus(); return; }
  if(editando){
    editando.nome=nome; editando.avatar=avatarSel; editando.letra=$("cr-letra").value;
    editando.meta=Number($("cr-meta").value)||META_PADRAO;
    editando.atualizado=Date.now();
  }else{
    dados.perfis.push({id:uid(),nome:nome,avatar:avatarSel,letra:$("cr-letra").value,
      meta:Number($("cr-meta").value)||META_PADRAO,
      niveis:{},revisao:{},recentes:[],escudos:0,escudosGanhos:0,escudoUsado:{},
      estrelas:0,removido:false,atualizado:Date.now()});
  }
  salvar();
  voltarDeCrianca();
}
function voltarDeCrianca(){
  if(!$("tela-pais").hidden || dados.cfg.entrouPais){ pintarPais(); mostrar("tela-pais"); }
  else { pintarPerfis(); mostrar("tela-perfis"); }
}

/* ---------- sincronização (interface) ---------- */
function pintarSync(){
  var txt=$("sync-txt"), area=$("sync-area");
  area.innerHTML=""; $("sync-aviso").textContent="";
  if(!window.SYNC || !SYNC.configurado){
    txt.textContent="Sincronização não configurada. Tudo funciona normalmente, mas os dados ficam só neste aparelho. O arquivo LEIA-ME explica, passo a passo, como ligar a sincronização entre os aparelhos da família.";
    return;
  }
  botaoDiagnostico(area);
  var est=SYNC.estado();
  if(est==="deslogado"){
    txt.textContent="Entre com seu e-mail para ligar a sincronização. Você recebe um link, clica nele e pronto — não tem senha.";
    var campo=el("div","campo");
    var inp=el("input"); inp.type="email"; inp.id="sync-email"; inp.placeholder="seu@email.com"; inp.autocomplete="email";
    campo.appendChild(inp);
    area.appendChild(campo);
    var b=el("button","btn","Receber link de acesso"); b.type="button"; b.style.setProperty("--acc","var(--voz)");
    b.addEventListener("click",function(){
      var e=inp.value.trim();
      if(!e){ inp.focus(); return; }
      b.disabled=true; $("sync-aviso").textContent="Enviando...";
      SYNC.enviarLink(e).then(function(){
        $("sync-aviso").textContent="Link enviado para "+e+". Abra o e-mail neste aparelho e clique no link.";
        $("sync-aviso").style.color="var(--ok)";
      }).catch(function(err){
        $("sync-aviso").textContent="Não deu certo: "+err.message;
        $("sync-aviso").style.color="var(--quase)";
      }).then(function(){ b.disabled=false; });
    });
    area.appendChild(b);
    return;
  }
  if(est==="sem-grupo"){
    var convite=SYNC.conviteGuardado?SYNC.conviteGuardado():"";
    txt.textContent="Você entrou como "+SYNC.email()+".";

    /* quem chegou por um link de convite não deveria ter de digitar nada */
    if(convite){
      var cxC=el("div","caixa"); cxC.style.marginTop="0";
      cxC.appendChild(el("h4",null,"Você foi convidado"));
      cxC.appendChild(frase("O link que você abriu é da família ",neg(convite),
        ". Toque abaixo para entrar nela e passar a ver as mesmas crianças."));
      var bC=el("button","btn","Entrar nesta família"); bC.type="button";
      bC.style.setProperty("--acc","var(--voz)");
      bC.addEventListener("click",function(){
        bC.disabled=true;
        $("sync-aviso").textContent="Entrando...";
        SYNC.entrarGrupo(convite).then(function(){
          SYNC.esquecerConvite();
          pintarPais(); sincronizarAgora();
        }).catch(function(){
          $("sync-aviso").textContent="Esse convite não vale mais. Peça o código para quem te chamou.";
          $("sync-aviso").style.color="var(--quase)";
          bC.disabled=false;
        });
      });
      cxC.appendChild(bC);
      var bIgnorar=el("button","chip mini","Não era isso, quero criar a minha"); bIgnorar.type="button";
      bIgnorar.style.marginTop="10px";
      bIgnorar.addEventListener("click",function(){ SYNC.esquecerConvite(); pintarSync(); });
      cxC.appendChild(bIgnorar);
      area.appendChild(cxC);
      return;
    }

    txt.textContent="Você entrou como "+SYNC.email()+". Agora crie a família ou entre na de alguém com o código.";
    var c1=el("div","campo");
    var i1=el("input"); i1.type="text"; i1.placeholder="Nome da família (ex.: Alves)";
    c1.appendChild(i1); area.appendChild(c1);
    var b1=el("button","btn","Criar minha família"); b1.type="button"; b1.style.setProperty("--acc","var(--voz)");
    b1.addEventListener("click",function(){
      b1.disabled=true;
      SYNC.criarGrupo(i1.value.trim()||"Família").then(function(){ pintarPais(); sincronizarAgora(); })
        .catch(function(e){ $("sync-aviso").textContent="Erro: "+e.message; b1.disabled=false; });
    });
    area.appendChild(b1);
    var c2=el("div","campo"); c2.style.marginTop="14px";
    c2.appendChild(el("label",null,"Ou entre com o código que te passaram"));
    var i2=el("input"); i2.type="text"; i2.placeholder="ABCD-1234"; i2.style.textTransform="uppercase";
    c2.appendChild(i2); area.appendChild(c2);
    var b2=el("button","chip","Entrar na família"); b2.type="button";
    b2.addEventListener("click",function(){
      b2.disabled=true;
      SYNC.entrarGrupo(i2.value).then(function(){ pintarPais(); sincronizarAgora(); })
        .catch(function(e){ $("sync-aviso").textContent="Código não encontrado."; b2.disabled=false; });
    });
    area.appendChild(b2);
    return;
  }
  var g=SYNC.grupo();
  txt.textContent="";
  txt.appendChild(frase("Sincronizando como ",neg(SYNC.email())," na família ",neg(g?g.nome:""),
    ". Tudo o que as crianças fizerem aparece nos outros aparelhos."));
  var cod=el("div","caixa"); cod.style.marginTop="0";
  cod.appendChild(el("h4",null,"Convidar o resto da família"));
  cod.appendChild(el("p",null,"Mande este link para os outros pais. Quem abrir já entra na família certa, sem precisar digitar código nenhum — basta entrar com o próprio e-mail."));

  var link=SYNC.linkDeConvite?SYNC.linkDeConvite():"";
  if(link){
    var cxLink=el("div","convite");
    cxLink.appendChild(el("code",null,link));
    cod.appendChild(cxLink);
    var bl=el("button","btn","Copiar o link do convite"); bl.type="button";
    bl.style.setProperty("--acc","var(--voz)");
    bl.addEventListener("click",function(){ copiar(link,bl,"Copiar o link do convite"); });
    cod.appendChild(bl);
  }

  cod.appendChild(el("p","dica","Se preferir passar só o código, é este:"));
  var codigo=el("div","contas"); codigo.style.fontSize="1.6rem"; codigo.textContent=g?g.codigo:"";
  cod.appendChild(codigo);
  var bc=el("button","chip","Copiar o código"); bc.type="button";
  bc.addEventListener("click",function(){ copiar(g?g.codigo:"",bc,"Copiar o código"); });
  cod.appendChild(bc);
  area.appendChild(cod);
  var linha=el("div","acoes"); linha.style.marginTop="12px";
  var bs=el("button","chip","Sincronizar agora"); bs.type="button";
  bs.addEventListener("click",function(){
    $("sync-aviso").textContent="Sincronizando...";
    sincronizarAgora().then(function(){ $("sync-aviso").textContent="Tudo em dia."; $("sync-aviso").style.color="var(--ok)"; });
  });
  linha.appendChild(bs);
  var bo=el("button","chip","Sair desta conta"); bo.type="button";
  bo.addEventListener("click",function(){ SYNC.sair(); pintarPais(); });
  linha.appendChild(bo);
  area.appendChild(linha);
}

/* Quando a sincronização não funciona, quem vai resolver não é programador:
   precisa de uma frase que diga o que fazer, não de um código de erro. */
function botaoDiagnostico(area){
  if(!SYNC.diagnosticar) return;
  var linha=el("div","acoes"); linha.style.marginBottom="12px";
  var b=el("button","chip","Testar a conexão"); b.type="button";
  b.addEventListener("click",function(){
    b.disabled=true;
    var av=$("sync-aviso");
    av.textContent="Testando..."; av.style.color="var(--ink-soft)";
    SYNC.diagnosticar().then(function(r){
      av.textContent=r.texto;
      av.style.color = r.ok ? "var(--ok)" : "var(--quase)";
      b.disabled=false;
    });
  });
  linha.appendChild(b);
  area.appendChild(linha);
}

/* ---------- copiar para a área de transferência ---------- */
function copiar(texto,botao,rotuloOriginal){
  function feito(){
    botao.textContent="Copiado ✓";
    setTimeout(function(){ botao.textContent=rotuloOriginal; },2200);
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(feito).catch(function(){ manual(); });
  } else manual();

  function manual(){
    /* navegador antigo ou sem permissão: seleciona para a pessoa copiar à mão */
    var campo=document.createElement("textarea");
    campo.value=texto;
    campo.style.position="fixed"; campo.style.opacity="0";
    document.body.appendChild(campo);
    campo.select();
    var deu=false;
    try{ deu=document.execCommand("copy"); }catch(e){}
    campo.remove();
    if(deu) feito();
    else { botao.textContent="Copie à mão: "+texto; }
  }
}

/* ---------- arquivo ---------- */
function baixarArquivo(nome,texto){
  var a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([texto],{type:"application/json"}));
  a.download=nome; document.body.appendChild(a); a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);
}

/* =========================================================
   ligações
   ========================================================= */
function pintarTudo(){
  if(!$("tela-perfis").hidden) pintarPerfis();
  if(!$("tela-home").hidden) pintarHome();
  if(!$("tela-pais").hidden) pintarPais();
}

$("btn-letra").addEventListener("click",function(){
  if(!atualPerfil) return;
  atualPerfil.letra = (atualPerfil.letra||"bastao")==="bastao" ? "imprensa" : "bastao";
  atualPerfil.atualizado=Date.now();
  $("kid").classList.toggle("bastao", atualPerfil.letra==="bastao");
  $("btn-letra").textContent = atualPerfil.letra==="bastao" ? "AA letra bastão" : "Aa letra escolar";
  salvar();
});
function pintarBotaoSom(){
  var b=$("btn-som"), on=somLigado();
  b.textContent = on ? "🔊" : "🔇";
  b.setAttribute("aria-pressed", on?"true":"false");
  b.setAttribute("aria-label", on?"Sons ligados. Toque para desligar":"Sons desligados. Toque para ligar");
  SOM.ligar(on);
}
$("btn-som").addEventListener("click",function(){
  dados.cfg.som = !somLigado();
  if(!somLigado()) calarVoz();
  salvar();
  pintarBotaoSom();
  ajustarMusica(telaAtual);
  if(somLigado()) SOM.toque();
});
$("btn-trocar").addEventListener("click",function(){ calarVoz(); pararContagem(); pararAvanco(); largarMicrofone(); atualPerfil=null; pintarPerfis(); mostrar("tela-perfis"); });
$("btn-pais").addEventListener("click",function(){
  largarMicrofone();
  if(!$("tela-pais").hidden){ dados.cfg.entrouPais=false; pintarPerfis(); mostrar("tela-perfis"); return; }
  $("pin-in").value=""; $("pin-aviso").textContent="";
  mostrar("tela-pin");
  setTimeout(function(){ $("pin-in").focus(); },50);
});
var tentativasPin=0;
function tentarPin(){
  if($("pin-in").value===String(dados.cfg.pin||"1234")){
    tentativasPin=0;
    dados.cfg.entrouPais=true;
    pintarPais(); mostrar("tela-pais");
    if(window.SYNC&&SYNC.estado()==="ok") sincronizarAgora();
  }else{
    tentativasPin++;
    $("pin-aviso").textContent = tentativasPin>=3
      ? "PIN errado. Se você é o adulto e esqueceu, o LEIA-ME explica como recuperar."
      : "PIN errado.";
    $("pin-aviso").style.color="var(--quase)";
    $("pin-in").value="";
    /* uma pausa curta depois de várias tentativas: a criança desiste
       de tentar na sorte sem que o adulto fique travado de verdade */
    if(tentativasPin>=4){
      $("pin-ok").disabled=true; $("pin-in").disabled=true;
      setTimeout(function(){ $("pin-ok").disabled=false; $("pin-in").disabled=false; $("pin-in").focus(); },3000);
    }
  }
}
$("pin-ok").addEventListener("click",tentarPin);
$("pin-in").addEventListener("keydown",function(e){ if(e.key==="Enter") tentarPin(); });
$("pin-volta").addEventListener("click",function(){
  if(atualPerfil){ pintarHome(); mostrar("tela-home"); } else { pintarPerfis(); mostrar("tela-perfis"); }
});
$("sair").addEventListener("click",function(){ calarVoz(); pararContagem(); pararAvanco(); largarMicrofone(); pintarHome(); mostrar("tela-home"); });
$("f-voltar").addEventListener("click",function(){ pintarHome(); mostrar("tela-home"); });
$("f-pai").addEventListener("click",function(){ abrirAval(atual.sessao); });
$("aval-pular").addEventListener("click",function(){
  if(dados.cfg.entrouPais){ pintarPais(); mostrar("tela-pais"); }
  else { pintarHome(); mostrar("tela-home"); }
});
$("aval-salvar").addEventListener("click",salvarAval);
grupoEscolha("e-autonomia","autonomia");
grupoEscolha("e-foco","foco");
grupoEscolha("e-fluencia","fluencia");

$("add-crianca").addEventListener("click",function(){ editarCrianca(null); });
$("cr-salvar").addEventListener("click",salvarCrianca);
$("cr-voltar").addEventListener("click",voltarDeCrianca);
var apagarArmado=false;
$("cr-apagar").addEventListener("click",function(){
  var b=this;
  if(!apagarArmado){ apagarArmado=true; b.textContent="Confirmar remoção"; setTimeout(function(){apagarArmado=false;b.textContent="Remover esta criança";},4000); return; }
  if(editando){ editando.removido=true; editando.atualizado=Date.now(); salvar(); }
  apagarArmado=false; b.textContent="Remover esta criança";
  voltarDeCrianca();
});

$("cfg-musica").addEventListener("change",function(){
  dados.cfg.musica=this.checked;
  salvar();
  ajustarMusica(telaAtual);
});

function pintarEspacoAudio(){
  var txt=$("audio-espaco"), bt=$("audio-apagar");
  if(!window.GRAVADOR || !GRAVADOR.suportado()){
    txt.textContent="Este aparelho não grava áudio ("+((window.GRAVADOR&&GRAVADOR.porQueNao())||"sem suporte")+").";
    bt.hidden=true; return;
  }
  bt.hidden=false;
  GRAVADOR.tamanho().then(function(t){
    if(!t.quantidade){
      txt.textContent="Nenhuma gravação guardada ainda. Elas ficam só neste aparelho: não vão para a sincronização nem para o arquivo de histórico.";
      bt.hidden=true;
      return;
    }
    var mb=(t.bytes/1048576);
    txt.textContent=t.quantidade+" gravaç"+(t.quantidade>1?"ões":"ão")+" ocupando "+
      (mb<0.1?(Math.round(t.bytes/1024)+" KB"):(mb.toFixed(1)+" MB"))+
      ". O app guarda as últimas "+GRAVADOR.guardarPorCrianca+" de cada criança e apaga as antigas sozinho. "+
      "Ficam só neste aparelho: não vão para a sincronização nem para o arquivo de histórico.";
  });
}

var apagarAudioArmado=false;
$("audio-apagar").addEventListener("click",function(){
  var b=this;
  if(!apagarAudioArmado){
    apagarAudioArmado=true; b.textContent="Tem certeza? Clique de novo";
    setTimeout(function(){ apagarAudioArmado=false; b.textContent="Apagar todas as gravações"; },4000);
    return;
  }
  apagarAudioArmado=false; b.textContent="Apagar todas as gravações";
  if(!window.GRAVADOR) return;
  GRAVADOR.apagarTudo().then(function(){
    dados.sessoes.forEach(function(s){ if(s.temAudio){ s.temAudio=false; s.atualizado=Date.now(); } });
    salvar();
    pintarEspacoAudio();
  });
});

$("cfg-narrador").addEventListener("change",function(){
  dados.cfg.narrador=this.value;
  salvar();
});

$("cfg-pin").addEventListener("input",function(){
  var v=this.value.replace(/\D/g,"").slice(0,4);
  this.value=v;
  if(v.length===4){ dados.cfg.pin=v; salvar(); }
});

$("exp").addEventListener("click",function(){
  baixarArquivo("missoes-"+hojeISO()+".json",JSON.stringify({app:"missoes",versao:3,perfis:dados.perfis,sessoes:dados.sessoes},null,1));
  $("arq-aviso").textContent="Arquivo salvo nos downloads.";
  $("arq-aviso").style.color="var(--ok)";
});
$("imp").addEventListener("change",function(e){
  var f=e.target.files&&e.target.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(){
    try{
      var d=JSON.parse(r.result);
      var antes=dados.sessoes.length+dados.perfis.length;
      juntar({perfis:d.perfis||[],sessoes:d.sessoes||[]});
      salvar(); pintarPais();
      var novos=dados.sessoes.length+dados.perfis.length-antes;
      $("arq-aviso").textContent = novos? ("Pronto: "+novos+" registro"+(novos>1?"s":"")+" adicionado"+(novos>1?"s":"")+"."):"Esse arquivo não trouxe nada novo.";
      $("arq-aviso").style.color = novos?"var(--ok)":"var(--ink-soft)";
    }catch(err){
      $("arq-aviso").textContent="Não consegui ler esse arquivo.";
      $("arq-aviso").style.color="var(--quase)";
    }
    e.target.value="";
  };
  r.readAsText(f);
});

var limparArmado=false;
$("limpar").addEventListener("click",function(){
  var b=this;
  if(!limparArmado){ limparArmado=true; b.textContent="Tem certeza? Clique de novo"; setTimeout(function(){limparArmado=false;b.textContent="Apagar todo o histórico";},4000); return; }
  limparArmado=false; b.textContent="Apagar todo o histórico";
  /* marca como apagado em vez de sumir com o registro: assim a exclusão
     também chega aos outros aparelhos, em vez de voltar no próximo sync */
  var agora=Date.now();
  dados.sessoes.forEach(function(s){
    s.removido=true; s.tags={}; s.obs=""; s.texto=""; s.atualizado=agora;
  });
  dados.perfis.forEach(function(p){
    p.niveis={}; p.revisao={}; p.recentes=[]; p.revisoesFeitas=0;
    p.escudos=0; p.escudosGanhos=0; p.escudoUsado={}; p.atualizado=agora;
  });
  if(window.GRAVADOR) GRAVADOR.apagarTudo().then(pintarEspacoAudio);
  salvar(); pintarPais();
});

/* =========================================================
   início
   ========================================================= */
carregar();
pintarBotaoSom();
if(window.SYNC && SYNC.guardarConviteDaURL) SYNC.guardarConviteDaURL();
if(window.SYNC){
  SYNC.aoMudar(function(){ if(!$("tela-pais").hidden) pintarSync(); });
  var voltou=SYNC.processarRetorno();
  if(SYNC.estado()==="ok") sincronizarAgora();
  if(voltou){
    dados.cfg.entrouPais=true;
    setTimeout(function(){ pintarPais(); mostrar("tela-pais"); },300);
  }
}
pintarPerfis();
mostrar("tela-perfis");
if(!perfisAtivos().length){ editarCrianca(null); }

window.addEventListener("online",function(){ agendarSync(); });

/* Gancho para os testes automatizados de interface. Só existe quando a
   página é aberta com ?teste=1 — no uso normal do app não é criado, então
   não há como chamar sem querer. Serve para abrir uma habilidade e um nível
   específicos, já que esperar a criança chegar no nível 3 levaria dezenas
   de missões. */
if(/(?:^|[?&])teste=1(?:&|$)/.test(location.search)){
  window.__teste=function(tag,nivel){
    pararAvanco(); pararContagem();
    var q=Q.gerar(tag,nivel||1);
    if(!q) throw new Error("habilidade desconhecida: "+tag);
    atual={area:q.area,tipo:"quiz",qs:[q],i:0,acertos:0,tags:{},inicio:Date.now()};
    $("tela-missao").style.setProperty("--acc","var(--"+q.area+")");
    mostrar("tela-missao");
    pintarQuestao();
    return q;
  };
  window.__q=function(){ return atual && atual.qs[atual.i]; };
}

})();
