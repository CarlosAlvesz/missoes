/* =========================================================
   Missões — app do 1º ano
   ========================================================= */
(function(){
"use strict";

var Q=window.QUESTOES, U=Q.utils;
var shuffle=U.shuffle, pick=U.pick, rnd=U.rnd;
var NQ=8;
var VERSAO="1.0";

function $(id){return document.getElementById(id);}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function hojeISO(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function fmtT(s){s=s||0;return s<60?(s+" segundos"):(Math.floor(s/60)+" min "+(s%60)+"s");}
function uid(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);}

/* ---------- voz ---------- */
var temVoz = typeof window.speechSynthesis !== "undefined";
function falar(txt,lang){
  if(!temVoz||!txt) return;
  try{
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(txt);
    u.lang = lang==="en" ? "en-US" : "pt-BR";
    u.rate = lang==="en" ? 0.82 : 0.92;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }catch(e){}
}

/* =========================================================
   dados
   ========================================================= */
var CHAVE="missoes.dados.v2";
var dados={perfis:[],sessoes:[],cfg:{pin:"1234",ultimo:null}};

function carregar(){
  try{
    var r=localStorage.getItem(CHAVE);
    if(r){
      var p=JSON.parse(r);
      if(p&&typeof p==="object"){
        dados.perfis=Array.isArray(p.perfis)?p.perfis:[];
        dados.sessoes=Array.isArray(p.sessoes)?p.sessoes:[];
        dados.cfg=Object.assign({pin:"1234",ultimo:null},p.cfg||{});
      }
    }
  }catch(e){}
}
function salvar(){
  try{ localStorage.setItem(CHAVE,JSON.stringify(dados)); }catch(e){}
  agendarSync();
}
function perfisAtivos(){ return dados.perfis.filter(function(p){return !p.removido;}); }
function acharPerfil(id){ for(var i=0;i<dados.perfis.length;i++) if(dados.perfis[i].id===id) return dados.perfis[i]; return null; }
function sessoesDe(id){ return dados.sessoes.filter(function(s){return s.perfil===id;}); }

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
function juntar(remoto){
  ["perfis","sessoes"].forEach(function(chave){
    var mapa={};
    dados[chave].forEach(function(x){ mapa[x.id]=x; });
    (remoto[chave]||[]).forEach(function(r){
      var atual=mapa[r.id];
      if(!atual || (r.atualizado||0) > (atual.atualizado||0)) mapa[r.id]=r;
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
function sequenciaDias(perfil){
  var dias={}; sessoesDe(perfil.id).forEach(function(s){ dias[s.dia]=1; });
  var n=0, d=new Date();
  if(!dias[hojeISO(d)]) d.setDate(d.getDate()-1);
  while(dias[hojeISO(d)]){ n++; d.setDate(d.getDate()-1); }
  return n;
}
var MEDALHAS=[
  {e:"🌱",nome:"Primeira missão",tem:function(ss){return ss.length>=1;}},
  {e:"🔥",nome:"3 dias seguidos",tem:function(ss,p){return sequenciaDias(p)>=3;}},
  {e:"📚",nome:"10 missões",tem:function(ss){return ss.length>=10;}},
  {e:"🎯",nome:"Acertou tudo numa missão",tem:function(ss){return ss.some(function(s){return s.total>0&&s.acertos===s.total;});}},
  {e:"🗣️",nome:"Leu em voz alta 5 vezes",tem:function(ss){return ss.filter(function(s){return s.tipo==="voz";}).length>=5;}},
  {e:"🌎",nome:"Todas as matérias",tem:function(ss){var a={};ss.forEach(function(s){a[s.area]=1;});return ["leitura","mat","racio","ingles","ciencias"].every(function(k){return a[k];});}},
  {e:"⭐",nome:"100 estrelas",tem:function(ss,p){return estrelasDe(p)>=100;}},
  {e:"🏆",nome:"30 missões",tem:function(ss){return ss.length>=30;}}
];

/* =========================================================
   telas
   ========================================================= */
var TELAS=["tela-perfis","tela-home","tela-missao","tela-fim","tela-aval","tela-pin","tela-pais","tela-crianca"];
var atualPerfil=null;

function mostrar(id){
  TELAS.forEach(function(t){ var e=$(t); if(e) e.hidden=(t!==id); });
  var naCrianca = ["tela-home","tela-missao","tela-fim","tela-aval"].indexOf(id)>=0;
  /* durante a missão a barra de cima some: menos coisa para distrair */
  var emMissao = (id==="tela-missao");
  $("kid").hidden = !naCrianca;
  $("btn-trocar").hidden = !naCrianca || emMissao;
  $("btn-letra").hidden = !naCrianca || emMissao;
  $("btn-pais").hidden = emMissao;
  $("btn-pais").classList.toggle("on", id==="tela-pais");
  $("btn-pais").firstChild.className = "sinal" + (window.SYNC&&SYNC.estado()==="ok"?" ok":(window.SYNC&&SYNC.configurado?" off":""));
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
  dados.cfg.ultimo=id; salvar();
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

  $("k-hoje").textContent=ss.filter(function(s){return s.dia===hoje;}).length;
  $("k-estrelas").textContent=estrelas;
  $("k-seq").textContent=seq;
  $("k-total").textContent=ss.length;

  var host=$("missoes"); host.innerHTML="";
  var feitasHoje={}; ss.forEach(function(s){ if(s.dia===hoje) feitasHoje[s.area]=1; });
  Q.ordem.forEach(function(k){
    var a=Q.areas[k];
    var b=el("button","mcard m-"+k); b.type="button";
    b.appendChild(el("span","emo",a.emo));
    var box=el("span","txt");
    box.appendChild(el("span","nm kt",a.nome));
    box.appendChild(el("span","ds kt",a.ds));
    b.appendChild(box);
    b.appendChild(el("span","go kt", k==="voz"?"Ler agora →":"Começar →"));
    if(feitasHoje[k]) b.appendChild(el("span","feito","✅"));
    else if(sug.indexOf(k)>=0) b.appendChild(el("span","tag","hoje"));
    if(k!=="voz") b.appendChild(el("span","nv","nível "+nivelDaArea(p,k)));
    b.addEventListener("click",function(){ k==="voz"?abrirVoz():abrirMissao(k); });
    host.appendChild(b);
  });
}

/* =========================================================
   missão
   ========================================================= */
var atual=null;

function montarMissao(area,perfil){
  var tipos=Q.tiposDaArea(area), out=[], usados={}, g=0, i=0;
  var ordem=shuffle(tipos);
  while(out.length<NQ && g++<300){
    var t=ordem[i % ordem.length]; i++;
    var nv=nivelDe(perfil,t.tag);
    var q;
    try{ q=t.fn(nv); }catch(e){ continue; }
    if(!q||!q.ops) continue;
    q.tag=t.tag; q.area=area; q.nivel=nv;
    var chave=q.txt+"|"+(q.fig||"")+"|"+(q.conta||"")+"|"+(q.frase||"");
    if(usados[chave]) continue;
    usados[chave]=1;
    out.push(q);
  }
  return out;
}

function abrirMissao(area){
  atual={area:area,tipo:"quiz",qs:montarMissao(area,atualPerfil),i:0,acertos:0,tags:{},inicio:Date.now()};
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

  var tag=el("div","qtag");
  tag.appendChild(el("span",null,q.tag));
  if(q.nivel>1) tag.appendChild(el("em",null,"nível "+q.nivel));
  card.appendChild(tag);

  var row=el("div","qrow");
  row.appendChild(el("div","qtxt kt",q.txt));
  var sp=el("button","speak","🔊"); sp.type="button"; sp.setAttribute("aria-label","Ouvir a pergunta");
  sp.addEventListener("click",function(){ falar(q.fala||q.txt,q.falaLang); });
  row.appendChild(sp);
  card.appendChild(row);

  if(q.frase) card.appendChild(el("div","frase kt",q.frase));
  if(q.conta) card.appendChild(el("div","contas",q.conta));
  if(q.svg){ var sv=el("div","figura"); sv.innerHTML=q.svg; card.appendChild(sv); }
  if(q.fig) card.appendChild(el("div","figura"+(q.figGrande?" grande":""),q.fig));

  var ops=el("div","ops col"+(q.cols||3)+(q.emoji?" emo":""));
  q.ops.forEach(function(o){
    var b=el("button","op"+(q.emoji?" emoji":""),o.t);
    b.type="button";
    if(!q.emoji) b.classList.add("kt");
    b.addEventListener("click",function(){ responder(q,o,b,ops,card); });
    ops.appendChild(b);
  });
  card.appendChild(ops);
}

function pintarPreview(q,card){
  card.appendChild(el("div","qtag",q.tag));
  var row=el("div","qrow");
  row.appendChild(el("div","qtxt kt",q.preview.txt));
  var sp=el("button","speak","🔊"); sp.type="button"; sp.setAttribute("aria-label","Ouvir");
  sp.addEventListener("click",function(){ falar(q.preview.txt); });
  row.appendChild(sp);
  card.appendChild(row);
  card.appendChild(el("div","figura",q.preview.fig));
  var c=el("div","contagem",String(q.preview.seg));
  card.appendChild(c);
  var n=q.preview.seg;
  var t=setInterval(function(){
    n--;
    if(n<=0){ clearInterval(t); q.previewFeito=true; if(!$("tela-missao").hidden) pintarQuestao(); }
    else c.textContent=String(n);
  },1000);
}

var ELOGIOS=["Muito bem!","É isso aí!","Acertou!","Boa!","Mandou bem!","Perfeito!"];

function responder(q,o,btn,ops,card){
  Array.prototype.forEach.call(ops.children,function(c){ c.disabled=true; });
  var certo=!!o.ok;
  q.resultado=certo;
  atual.tags[q.tag]=atual.tags[q.tag]||{c:0,e:0};
  if(certo){ atual.acertos++; atual.tags[q.tag].c++; } else atual.tags[q.tag].e++;

  Array.prototype.forEach.call(ops.children,function(c,idx){
    if(q.ops[idx].ok) c.classList.add("certa");
    else if(c===btn) c.classList.add("errada");
    else c.classList.add("apagada");
  });

  var ret=el("div","retorno "+(certo?"bom":"quase"));
  ret.appendChild(el("span","kt",certo?pick(ELOGIOS):"Quase! Olha a resposta certa."));
  card.appendChild(ret);
  pintarDots();

  if(certo){
    falar(pick(["Muito bem","Isso","Boa"]));
    setTimeout(avancar,1100);
  }else{
    var b=el("button","btn","Continuar"); b.type="button";
    b.addEventListener("click",avancar);
    ret.appendChild(b);
    b.focus();
  }
}
function avancar(){
  atual.i++;
  if(atual.i>=atual.qs.length) terminar(); else pintarQuestao();
}

/* ---------- ler em voz alta ---------- */
function abrirVoz(){
  var feitas=sessoesDe(atualPerfil.id).filter(function(s){return s.tipo==="voz";}).length;
  var nv=nivelDe(atualPerfil,"Leitura em voz alta");
  var texto=Q.textoVoz(nv,feitas);
  atual={area:"voz",tipo:"voz",texto:texto,inicio:Date.now(),acertos:0,qs:[],tags:{},nivel:nv};
  $("tela-missao").style.setProperty("--acc","var(--voz)");
  mostrar("tela-missao");
  $("dots").innerHTML=""; $("cnt").textContent="";
  var card=$("qcard"); card.innerHTML="";
  card.appendChild(el("div","qtag","Leitura em voz alta"));
  var row=el("div","qrow");
  row.appendChild(el("div","qtxt kt","Leia em voz alta para o adulto ouvir:"));
  var sp=el("button","speak","🔊"); sp.type="button";
  sp.title="Só clique se travar de verdade"; sp.setAttribute("aria-label","Ouvir o texto");
  sp.addEventListener("click",function(){ falar(texto); });
  row.appendChild(sp);
  card.appendChild(row);
  card.appendChild(el("div","frase kt",texto));
  var dica=el("div","retorno"); dica.style.color="var(--ink-soft)";
  dica.appendChild(el("span",null,"Leia devagar. Se travar numa palavra, respire e tente de novo."));
  card.appendChild(dica);
  var b=el("button","btn wide","Já li! ✓"); b.type="button";
  b.style.setProperty("--acc","var(--voz)");
  b.addEventListener("click",terminar);
  card.appendChild(b);
}

/* ---------- fim ---------- */
function terminar(){
  var seg=Math.round((Date.now()-atual.inicio)/1000);
  var total=atual.qs.length;
  var estrelas = atual.tipo==="voz" ? 2 : (atual.acertos>=total-1?3:(atual.acertos>=Math.ceil(total*0.6)?2:1));
  var s={
    id:uid(), perfil:atualPerfil.id, ts:Date.now(), dia:hojeISO(),
    area:atual.area, tipo:atual.tipo, acertos:atual.acertos, total:total, seg:seg,
    estrelas:estrelas, tags:atual.tags, texto:atual.texto||"", nivel:atual.nivel||1,
    autonomia:null, foco:null, fluencia:null, obs:"", avaliador:"",
    atualizado:Date.now()
  };
  dados.sessoes.push(s);
  atual.sessao=s;

  var mudou = atual.tipo==="voz" ? [] : recalcularNiveis(atualPerfil);
  salvar();

  $("f-estrelas").textContent="★★★☆☆☆".slice(3-estrelas,6-estrelas);
  var msg,placar;
  if(atual.tipo==="voz"){
    msg="Você leu tudo!"; placar="Agora chame um adulto para dizer como foi.";
  }else{
    msg = atual.acertos>=total-1?"Uau, quase tudo certo!":(atual.acertos>=Math.ceil(total*0.6)?"Muito bem!":"Bom trabalho! Vamos treinar mais.");
    placar="Você acertou "+atual.acertos+" de "+total+" · "+fmtT(seg);
  }
  $("f-msg").textContent=msg;
  $("f-placar").textContent=placar;

  var subiu=mudou.filter(function(m){return m.dir>0;});
  var box=$("f-subiu");
  if(subiu.length){
    box.hidden=false;
    box.textContent="Ficou mais difícil: "+subiu.map(function(m){return m.tag.toLowerCase();}).join(", ")+" 🎉";
  } else box.hidden=true;

  falar(msg);
  mostrar("tela-fim");
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
  mostrar("tela-aval");
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
  var ss = abaAtual==="todos" ? dados.sessoes.slice() : sessoesDe(abaAtual);
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
    (fracos.length?fracos:fortes).forEach(function(x){
      var d=el("div","rf"+(x.pc>=75?" bom":""));
      d.appendChild(el("b",null,x.nome));
      var s=el("span");
      s.innerHTML='<span class="pc">'+x.pc+'%</span> de acerto · '+x.tot+' tentativas · '+(NOME_AREA[x.area]||"");
      d.appendChild(s);
      g.appendChild(d);
    });
    host.appendChild(g);
    if(!fracos.length) host.insertBefore(el("div","vazio","Nada abaixo de 75%. Está indo bem — o nível das questões já sobe sozinho conforme ele acerta."),g);
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
    tr.appendChild(td(NOME_AREA[s.area]||s.area));
    tr.appendChild(td(s.tipo==="voz"?"—":(s.acertos+"/"+s.total),true));
    tr.appendChild(td(Math.floor(s.seg/60)+":"+String(s.seg%60).padStart(2,"0"),true));
    tr.appendChild(td(s.autonomia?["","muita ajuda","ajudinha","sozinho"][s.autonomia]:"—"));
    tr.appendChild(td(s.foco?["","disperso","oscilou","focado"][s.foco]:"—"));
    tr.appendChild(td(s.obs||"—"));
    tbody.appendChild(tr);
  });
  tb.appendChild(tbody); sc.appendChild(tb); host.appendChild(sc);
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
      var vazio=el("p");
      vazio.innerHTML="<b>"+p.nome+"</b> não fez nenhuma atividade nos últimos 7 dias.";
      box.appendChild(vazio); algo=true; return;
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

    var p1=el("p");
    p1.innerHTML="<b>"+p.nome+"</b> fez <b>"+semana.length+"</b> atividade"+(semana.length>1?"s":"")+
      " em <b>"+nDias+"</b> dia"+(nDias>1?"s":"")+" desta semana, com <b>"+pc+"%</b> de acerto"+
      (pca!=null ? (pc>pca+4?" — subiu "+(pc-pca)+" pontos em relação à semana passada.":(pc<pca-4?" — caiu "+(pca-pc)+" pontos em relação à semana passada.":" — estável em relação à semana passada.")) : ".");
    box.appendChild(p1);

    var p2=el("p");
    if(fracos.length){
      p2.innerHTML="Para reforçar nos próximos dias: <b>"+fracos.map(function(x){return x.nome.toLowerCase()+" ("+x.pc+"%)";}).join("</b> e <b>")+"</b>.";
    }else{
      p2.innerHTML="Nenhuma habilidade travando esta semana. Dá para puxar um pouco mais o tempo dos blocos.";
    }
    box.appendChild(p2);

    if(focoM!=null){
      var p3=el("p");
      p3.innerHTML="Concentração pelas suas avaliações: <b>"+rot(focoM,["muito disperso","oscilando","focado até o fim"])+"</b>."+
        (focoM<2 ? " Vale encurtar os blocos e garantir a pausa de movimento no meio." : "");
      box.appendChild(p3);
    }

    if(nDias<3){
      var p4=el("p");
      p4.innerHTML="A regularidade é o que mais pesa nessa idade: <b>3 a 5 dias por semana</b> rende mais que uma sessão longa só.";
      box.appendChild(p4);
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
    editando.atualizado=Date.now();
  }else{
    dados.perfis.push({id:uid(),nome:nome,avatar:avatarSel,letra:$("cr-letra").value,
      niveis:{},estrelas:0,removido:false,atualizado:Date.now()});
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
    txt.textContent="Sincronização não configurada. Tudo funciona normalmente, mas os dados ficam só neste aparelho. O arquivo LEIA-ME explica como ligar a sincronização entre celular e computador.";
    return;
  }
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
  txt.innerHTML="Sincronizando como <b>"+SYNC.email()+"</b> na família <b>"+(g?g.nome:"")+"</b>. Tudo o que as crianças fizerem aparece nos outros aparelhos.";
  var cod=el("div","caixa"); cod.style.marginTop="0";
  cod.innerHTML="<h4>Código para convidar</h4><p>Passe este código para os outros pais entrarem na mesma família:</p>";
  var codigo=el("div","contas"); codigo.style.fontSize="1.6rem"; codigo.textContent=g?g.codigo:"";
  cod.appendChild(codigo);
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
$("btn-trocar").addEventListener("click",function(){ atualPerfil=null; pintarPerfis(); mostrar("tela-perfis"); });
$("btn-pais").addEventListener("click",function(){
  if(!$("tela-pais").hidden){ dados.cfg.entrouPais=false; pintarPerfis(); mostrar("tela-perfis"); return; }
  $("pin-in").value=""; $("pin-aviso").textContent="";
  mostrar("tela-pin");
  setTimeout(function(){ $("pin-in").focus(); },50);
});
function tentarPin(){
  if($("pin-in").value===String(dados.cfg.pin||"1234")){
    dados.cfg.entrouPais=true;
    pintarPais(); mostrar("tela-pais");
    if(window.SYNC&&SYNC.estado()==="ok") sincronizarAgora();
  }else{
    $("pin-aviso").textContent="PIN errado. O padrão é 1234, e dá para trocar dentro da área dos adultos.";
    $("pin-aviso").style.color="var(--quase)";
    $("pin-in").value="";
  }
}
$("pin-ok").addEventListener("click",tentarPin);
$("pin-in").addEventListener("keydown",function(e){ if(e.key==="Enter") tentarPin(); });
$("pin-volta").addEventListener("click",function(){
  if(atualPerfil){ pintarHome(); mostrar("tela-home"); } else { pintarPerfis(); mostrar("tela-perfis"); }
});
$("sair").addEventListener("click",function(){ pintarHome(); mostrar("tela-home"); });
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

$("cfg-pin").addEventListener("input",function(){
  var v=this.value.replace(/\D/g,"").slice(0,4);
  this.value=v;
  if(v.length===4){ dados.cfg.pin=v; salvar(); }
});

$("exp").addEventListener("click",function(){
  baixarArquivo("missoes-"+hojeISO()+".json",JSON.stringify({app:"missoes",versao:2,perfis:dados.perfis,sessoes:dados.sessoes},null,1));
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
  dados.sessoes=[];
  dados.perfis.forEach(function(p){ p.niveis={}; p.atualizado=Date.now(); });
  salvar(); pintarPais();
});

/* =========================================================
   início
   ========================================================= */
carregar();
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

})();
