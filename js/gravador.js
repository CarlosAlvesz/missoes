/* =========================================================
   Gravação da leitura em voz alta.

   A criança grava a si mesma lendo; o adulto ouve depois, com
   calma, e dá a nota de fluência. Também serve para a própria
   criança se ouvir — perceber que travou numa palavra ensina
   mais do que alguém dizer que ela travou.

   Onde fica: só neste aparelho, no IndexedDB do navegador.
   O áudio NUNCA é enviado para lugar nenhum, nem entra na
   sincronização nem no arquivo de histórico. É voz de criança.

   Para não encher a memória do aparelho, guardamos apenas as
   últimas gravações de cada criança; as antigas são apagadas
   sozinhas.
   ========================================================= */
(function(){
"use strict";

var BANCO="missoes-audio", LOJA="gravacoes", VERSAO=1;
var GUARDAR_POR_CRIANCA=12;

var temMic = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
var temGravador = (typeof window.MediaRecorder !== "undefined");
var temBanco = (typeof indexedDB !== "undefined");
var suportado = temMic && temGravador && temBanco;

/* ---------- formato de áudio que este aparelho aceita ---------- */
function formato(){
  if(!temGravador) return "";
  var tentativas=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus",""];
  for(var i=0;i<tentativas.length;i++){
    try{
      if(tentativas[i]==="" || MediaRecorder.isTypeSupported(tentativas[i])) return tentativas[i];
    }catch(e){}
  }
  return "";
}

/* ---------- IndexedDB ---------- */
var bd=null;
function abrir(){
  if(bd) return Promise.resolve(bd);
  if(!temBanco) return Promise.reject(new Error("sem IndexedDB"));
  return new Promise(function(ok,erro){
    var req=indexedDB.open(BANCO,VERSAO);
    req.onupgradeneeded=function(){
      var d=req.result;
      if(!d.objectStoreNames.contains(LOJA)){
        var loja=d.createObjectStore(LOJA,{keyPath:"id"});
        loja.createIndex("perfil","perfil",{unique:false});
      }
    };
    req.onsuccess=function(){ bd=req.result; ok(bd); };
    req.onerror=function(){ erro(req.error||new Error("não consegui abrir o banco de áudio")); };
  });
}
function transacao(modo){
  return abrir().then(function(d){ return d.transaction(LOJA,modo).objectStore(LOJA); });
}
function pedido(req){
  return new Promise(function(ok,erro){
    req.onsuccess=function(){ ok(req.result); };
    req.onerror=function(){ erro(req.error); };
  });
}

/* ---------- gravar ---------- */
var gravador=null, fluxo=null, pedacos=[];

function iniciar(){
  if(!suportado) return Promise.reject(new Error("este aparelho não grava áudio"));
  if(gravador) return Promise.reject(new Error("já está gravando"));
  return navigator.mediaDevices.getUserMedia({audio:true}).then(function(f){
    fluxo=f; pedacos=[];
    var tipo=formato();
    /* 32 kbps é de sobra para voz falada e deixa a gravação três vezes
       menor, o que importa num celular com pouca memória */
    var opcoes={audioBitsPerSecond:32000};
    if(tipo) opcoes.mimeType=tipo;
    try{ gravador=new MediaRecorder(f,opcoes); }
    catch(e){
      try{ gravador = tipo ? new MediaRecorder(f,{mimeType:tipo}) : new MediaRecorder(f); }
      catch(e2){ gravador = new MediaRecorder(f); }
    }
    gravador.ondataavailable=function(ev){ if(ev.data && ev.data.size) pedacos.push(ev.data); };
    gravador.start();
    return true;
  });
}

function soltarMicrofone(){
  if(fluxo){
    try{ fluxo.getTracks().forEach(function(t){ t.stop(); }); }catch(e){}
    fluxo=null;
  }
}

function parar(){
  return new Promise(function(ok,erro){
    if(!gravador){ soltarMicrofone(); return erro(new Error("não estava gravando")); }
    var g=gravador;
    g.onstop=function(){
      gravador=null;
      soltarMicrofone();
      var tipo=(g.mimeType||"audio/webm").split(";")[0];
      var blob=new Blob(pedacos,{type:tipo});
      pedacos=[];
      if(!blob.size) return erro(new Error("a gravação saiu vazia"));
      ok(blob);
    };
    try{ g.stop(); }catch(e){ gravador=null; soltarMicrofone(); erro(e); }
  });
}

function cancelar(){
  if(gravador){ try{ gravador.stop(); }catch(e){} gravador=null; }
  pedacos=[]; soltarMicrofone();
}
function gravando(){ return !!gravador; }

/* ---------- guardar e recuperar ---------- */
function salvar(id,perfil,blob,segundos){
  if(!temBanco||!blob) return Promise.resolve(false);
  return transacao("readwrite").then(function(loja){
    return pedido(loja.put({id:id,perfil:perfil,ts:Date.now(),seg:segundos||0,blob:blob}));
  }).then(function(){ return arrumar(perfil); })
    .then(function(){ return true; })
    .catch(function(){ return false; });
}

function buscar(id){
  if(!temBanco) return Promise.resolve(null);
  return transacao("readonly").then(function(loja){ return pedido(loja.get(id)); })
    .then(function(r){ return r||null; })
    .catch(function(){ return null; });
}

function apagar(id){
  if(!temBanco) return Promise.resolve();
  return transacao("readwrite").then(function(loja){ return pedido(loja.delete(id)); })
    .catch(function(){});
}

function listar(perfil){
  if(!temBanco) return Promise.resolve([]);
  return transacao("readonly").then(function(loja){ return pedido(loja.getAll()); })
    .then(function(todas){
      todas=(todas||[]).filter(function(g){ return !perfil || g.perfil===perfil; });
      todas.sort(function(a,b){ return b.ts-a.ts; });
      return todas;
    }).catch(function(){ return []; });
}

/* apaga as gravações mais antigas desta criança */
function arrumar(perfil){
  return listar(perfil).then(function(todas){
    var sobrando=todas.slice(GUARDAR_POR_CRIANCA);
    return Promise.all(sobrando.map(function(g){ return apagar(g.id); }));
  }).catch(function(){});
}

function apagarTudo(){
  if(!temBanco) return Promise.resolve();
  return transacao("readwrite").then(function(loja){ return pedido(loja.clear()); })
    .catch(function(){});
}

/* quanto espaço as gravações estão ocupando */
function tamanho(){
  return listar(null).then(function(todas){
    var bytes=0;
    todas.forEach(function(g){ if(g.blob) bytes+=g.blob.size; });
    return {quantidade:todas.length, bytes:bytes};
  });
}

window.GRAVADOR={
  suportado:function(){ return suportado; },
  porQueNao:function(){
    if(!temMic) return "este navegador não dá acesso ao microfone";
    if(!temGravador) return "este navegador não sabe gravar áudio";
    if(!temBanco) return "este navegador não deixa guardar a gravação";
    return "";
  },
  guardarPorCrianca:GUARDAR_POR_CRIANCA,
  iniciar:iniciar, parar:parar, cancelar:cancelar, gravando:gravando,
  salvar:salvar, buscar:buscar, apagar:apagar, listar:listar,
  apagarTudo:apagarTudo, tamanho:tamanho
};

})();
