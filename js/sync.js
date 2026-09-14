/* =========================================================
   Sincronização opcional (Supabase).
   Sem configuração, tudo funciona só no aparelho.
   Com configuração, os perfis e as atividades ficam iguais
   em todos os aparelhos da família.
   ========================================================= */
(function(){
"use strict";

var CFG = window.CONFIG || {};
var URL_BASE = (CFG.supabaseUrl||"").replace(/\/+$/,"");
var CHAVE = CFG.supabaseAnonKey||"";
var CONFIGURADO = !!(URL_BASE && CHAVE);

var K_SESSAO="missoes.sessao.v1";
var K_GRUPO="missoes.grupo.v1";

var sessao=null;   /* {access_token, refresh_token, expira, email} */
var grupo=null;    /* {id, nome, codigo} */
var ouvinte=null;

function guardar(chave,valor){ try{ localStorage.setItem(chave, JSON.stringify(valor)); }catch(e){} }
function ler(chave){ try{ var r=localStorage.getItem(chave); return r?JSON.parse(r):null; }catch(e){ return null; } }
function limpar(chave){ try{ localStorage.removeItem(chave); }catch(e){} }

sessao=ler(K_SESSAO);
grupo=ler(K_GRUPO);

function avisar(){ if(ouvinte) try{ ouvinte(estado()); }catch(e){} }

function estado(){
  if(!CONFIGURADO) return "off";
  if(!sessao) return "deslogado";
  if(!grupo) return "sem-grupo";
  return "ok";
}

/* ---------- HTTP ---------- */
function req(caminho, opcoes){
  opcoes=opcoes||{};
  var cab={ "apikey":CHAVE, "Content-Type":"application/json" };
  if(sessao && sessao.access_token) cab["Authorization"]="Bearer "+sessao.access_token;
  if(opcoes.cabecalhos) Object.keys(opcoes.cabecalhos).forEach(function(k){ cab[k]=opcoes.cabecalhos[k]; });
  return fetch(URL_BASE+caminho,{
    method:opcoes.metodo||"GET",
    headers:cab,
    body:opcoes.corpo?JSON.stringify(opcoes.corpo):undefined
  }).then(function(r){
    if(r.status===204) return null;
    return r.text().then(function(t){
      var dados=null;
      try{ dados=t?JSON.parse(t):null; }catch(e){ dados=t; }
      if(!r.ok){
        var err=new Error((dados&&(dados.message||dados.error_description||dados.msg||dados.error))||("erro "+r.status));
        err.status=r.status; err.dados=dados;
        throw err;
      }
      return dados;
    });
  });
}

function comToken(fn){
  if(!sessao) return Promise.reject(new Error("sem sessão"));
  var agora=Date.now();
  if(sessao.expira && agora > sessao.expira-60000 && sessao.refresh_token){
    return renovar().then(fn);
  }
  return fn().catch(function(e){
    if(e.status===401 && sessao && sessao.refresh_token){ return renovar().then(fn); }
    throw e;
  });
}

function guardarSessao(d){
  if(!d||!d.access_token) return;
  sessao={
    access_token:d.access_token,
    refresh_token:d.refresh_token,
    expira:Date.now()+((d.expires_in||3600)*1000),
    email:(d.user&&d.user.email)||(sessao&&sessao.email)||""
  };
  guardar(K_SESSAO,sessao);
  avisar();
}

function renovar(){
  return req("/auth/v1/token?grant_type=refresh_token",{metodo:"POST",corpo:{refresh_token:sessao.refresh_token}})
    .then(function(d){ guardarSessao(d); })
    .catch(function(e){ sair(); throw e; });
}

/* ---------- entrar / sair ---------- */
/* Endereço para onde o link do e-mail deve voltar.
   O app instalado abre em .../missoes/index.html, mas quem cadastra a URL
   liberada no Supabase quase sempre cadastra .../missoes/. Tirar o
   "index.html" faz os dois casos caírem no mesmo endereço, que é o que
   está na lista de permitidos. */
function enderecoDeVolta(){
  var caminho=location.pathname.replace(/index\.html?$/i,"");
  if(!caminho) caminho="/";
  return location.origin+caminho;
}

function enviarLink(email){
  var destino = enderecoDeVolta();
  return req("/auth/v1/otp",{metodo:"POST",corpo:{email:email,create_user:true,options:{email_redirect_to:destino}}});
}

/* Entrar pelo código de 6 números que veio no e-mail.
   Num site estático como este, clicar no link do e-mail depende de uma
   cadeia de redirecionamentos que falha por pouco (endereço de volta,
   lista de permitidos, o app instalado abrindo noutro caminho). O código
   não depende de nada disso, e ainda funciona quando o e-mail é aberto
   num aparelho diferente daquele onde a criança estuda. */
function entrarComCodigo(email,codigo){
  var limpo=String(codigo||"").replace(/\D/g,"");
  if(limpo.length<6) return Promise.reject(new Error("O código tem 6 números."));
  return req("/auth/v1/verify",{metodo:"POST",corpo:{
    type:"email", email:String(email||"").trim(), token:limpo
  }}).then(function(d){
    if(!d||!d.access_token) throw new Error("código não aceito");
    guardarSessao(d);
    if(d.user&&d.user.email){ sessao.email=d.user.email; guardar(K_SESSAO,sessao); }
    return meuGrupo().catch(function(){ return null; });
  });
}

/* o link do e-mail volta com #access_token=... */
function processarRetorno(){
  if(!location.hash || location.hash.indexOf("access_token")<0) return false;
  var p={}; location.hash.replace(/^#/,"").split("&").forEach(function(par){
    var i=par.indexOf("="); if(i>0) p[decodeURIComponent(par.slice(0,i))]=decodeURIComponent(par.slice(i+1));
  });
  if(!p.access_token) return false;
  sessao={access_token:p.access_token,refresh_token:p.refresh_token,expira:Date.now()+((Number(p.expires_in)||3600)*1000),email:""};
  guardar(K_SESSAO,sessao);
  try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
  /* descobre o e-mail e o grupo */
  comToken(function(){ return req("/auth/v1/user"); }).then(function(u){
    if(u&&u.email){ sessao.email=u.email; guardar(K_SESSAO,sessao); }
    return meuGrupo();
  }).catch(function(){}).then(avisar);
  return true;
}

function sair(){
  sessao=null; grupo=null;
  limpar(K_SESSAO); limpar(K_GRUPO);
  avisar();
}

/* ---------- grupo (a família) ---------- */
function meuGrupo(){
  return comToken(function(){ return req("/rest/v1/membros?select=grupo_id,grupos(id,nome,codigo)&limit=1"); })
    .then(function(linhas){
      if(linhas && linhas.length && linhas[0].grupos){
        grupo={id:linhas[0].grupos.id,nome:linhas[0].grupos.nome,codigo:linhas[0].grupos.codigo};
        guardar(K_GRUPO,grupo);
      }
      avisar();
      return grupo;
    });
}

function criarGrupo(nome){
  return comToken(function(){ return req("/rest/v1/rpc/criar_grupo",{metodo:"POST",corpo:{p_nome:nome||"Família"}}); })
    .then(function(){ return meuGrupo(); });
}

function entrarGrupo(codigo){
  return comToken(function(){ return req("/rest/v1/rpc/entrar_no_grupo",{metodo:"POST",corpo:{p_codigo:String(codigo||"").trim().toUpperCase()}}); })
    .then(function(){ return meuGrupo(); });
}

/* ---------- dados ---------- */
function enviar(tabela,linhas){
  if(!linhas.length) return Promise.resolve();
  var comGrupo=linhas.map(function(l){ var c={}; Object.keys(l).forEach(function(k){c[k]=l[k];}); c.grupo_id=grupo.id; return c; });
  return comToken(function(){
    return req("/rest/v1/"+tabela,{metodo:"POST",corpo:comGrupo,
      cabecalhos:{"Prefer":"resolution=merge-duplicates,return=minimal"}});
  });
}

function baixar(tabela){
  return comToken(function(){ return req("/rest/v1/"+tabela+"?select=*&grupo_id=eq."+encodeURIComponent(grupo.id)+"&limit=5000"); });
}

/* envia o que mudou e devolve tudo o que está no servidor */
function sincronizar(local){
  if(estado()!=="ok") return Promise.reject(new Error("sincronização indisponível"));
  var perfis=(local.perfis||[]).map(limparPerfil);
  var sessoes=(local.sessoes||[]).map(limparSessao);
  return enviar("perfis",perfis)
    .then(function(){ return enviar("sessoes",sessoes); })
    .then(function(){ return Promise.all([baixar("perfis"),baixar("sessoes")]); })
    .then(function(r){
      return {
        perfis:(r[0]||[]).map(dePerfil),
        sessoes:(r[1]||[]).map(deSessao)
      };
    });
}

/* ---------- conversão entre o formato local e as colunas ---------- */
function limparPerfil(p){
  return {id:p.id,nome:p.nome||"",avatar:p.avatar||"🚀",letra:p.letra||"bastao",
          niveis:p.niveis||{},estrelas:p.estrelas||0,meta:p.meta||2,
          removido:!!p.removido,atualizado:p.atualizado||Date.now()};
}
function dePerfil(r){
  return {id:r.id,nome:r.nome||"",avatar:r.avatar||"🚀",letra:r.letra||"bastao",
          niveis:r.niveis||{},estrelas:r.estrelas||0,meta:r.meta||2,
          removido:!!r.removido,atualizado:Number(r.atualizado)||0};
}
function limparSessao(s){
  return {id:s.id,perfil_id:s.perfil,ts:s.ts,dia:s.dia,area:s.area,tipo:s.tipo||"quiz",treino:s.treino||"",
          acertos:s.acertos||0,total:s.total||0,seg:s.seg||0,estrelas:s.estrelas||0,
          tags:s.tags||{},texto:s.texto||"",nivel:s.nivel||1,
          autonomia:s.autonomia==null?null:s.autonomia,foco:s.foco==null?null:s.foco,
          fluencia:s.fluencia==null?null:s.fluencia,obs:s.obs||"",avaliador:s.avaliador||"",
          removido:!!s.removido,
          atualizado:s.atualizado||s.ts||Date.now()};
}
function deSessao(r){
  return {id:r.id,perfil:r.perfil_id,ts:Number(r.ts)||0,dia:r.dia,area:r.area,tipo:r.tipo||"quiz",treino:r.treino||"",
          acertos:r.acertos||0,total:r.total||0,seg:r.seg||0,estrelas:r.estrelas||0,
          tags:r.tags||{},texto:r.texto||"",nivel:r.nivel||1,
          autonomia:r.autonomia,foco:r.foco,fluencia:r.fluencia,obs:r.obs||"",avaliador:r.avaliador||"",
          removido:!!r.removido,
          atualizado:Number(r.atualizado)||0};
}

/* ---------- convite ----------
   Passar um código por telefone dá erro de digitação e confusão sobre onde
   colar. Um link resolve: quem recebe abre e o código já vem junto. */
var K_CONVITE="missoes.convite.v1";

function linkDeConvite(){
  if(!grupo||!grupo.codigo) return "";
  return enderecoDeVolta()+"?familia="+encodeURIComponent(grupo.codigo);
}

/* guarda o código que veio no link, para usar depois que a pessoa entrar */
function guardarConviteDaURL(){
  var m=/[?&]familia=([^&#]+)/.exec(location.search);
  if(!m) return "";
  var codigo=decodeURIComponent(m[1]).trim().toUpperCase();
  if(!/^[A-Z0-9-]{4,20}$/.test(codigo)) return "";
  guardar(K_CONVITE,codigo);
  try{ history.replaceState(null,"",location.pathname+location.hash); }catch(e){}
  return codigo;
}
function conviteGuardado(){ return ler(K_CONVITE)||""; }
function esquecerConvite(){ limpar(K_CONVITE); }

/* ---------- diagnóstico em português ----------
   Quando a sincronização não funciona, o dono do app não é programador:
   precisa de uma frase que diga o que fazer, não de um código de erro. */
/* A chave que vai no config.js é pública de propósito — quem protege os
   dados são as regras do banco. Mas existe uma chave SECRETA de nome
   parecido, e colá-la aqui abriria o banco inteiro para qualquer pessoa,
   já que este arquivo fica público no GitHub. Vale conferir. */
function chavePerigosa(k){
  k=String(k||"");
  if(/^sb_secret_/.test(k))
    return "Esta é a chave SECRETA (sb_secret_...). Ela NÃO pode ficar aqui: este arquivo é público e ela dá acesso total ao banco. Volte no Supabase e copie a chave publicável (sb_publishable_...). Se já publicou a secreta, apague-a e gere outra no Supabase.";
  if(/^eyJ/.test(k)){
    try{
      var meio=k.split(".")[1];
      if(meio){
        var texto=atob(meio.replace(/-/g,"+").replace(/_/g,"/"));
        if(/"role"\s*:\s*"service_role"/.test(texto))
          return "Esta é a chave service_role, que dá acesso total ao banco e NÃO pode ficar num arquivo público. Copie a chave anon / publicável no lugar dela, e gere uma chave nova no Supabase se esta já foi publicada.";
      }
    }catch(e){}
  }
  return "";
}

function chaveParecePlausivel(k){
  k=String(k||"");
  return /^sb_publishable_/.test(k) || (/^eyJ/.test(k) && k.split(".").length===3);
}

function diagnosticar(){
  if(!CONFIGURADO)
    return Promise.resolve({ok:false,texto:"O arquivo config.js está vazio. Sem ele o app funciona normalmente, só não sincroniza. O LEIA-ME explica o que colar ali."});
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(URL_BASE))
    return Promise.resolve({ok:false,texto:"O endereço em config.js não parece um projeto do Supabase. Ele tem de ser algo como https://abcdefgh.supabase.co, sem barra no fim."});
  var perigo=chavePerigosa(CHAVE);
  if(perigo) return Promise.resolve({ok:false,perigo:true,texto:perigo});
  if(!chaveParecePlausivel(CHAVE))
    return Promise.resolve({ok:false,texto:"A chave em config.js não parece uma chave do Supabase. Ela começa com sb_publishable_ (nos projetos novos) ou com eyJ (nos antigos, a chave anon). Copie a chave inteira em Settings → API Keys."});

  return fetch(URL_BASE+"/rest/v1/grupos?select=id&limit=1",{headers:{apikey:CHAVE}})
    .then(function(r){
      if(r.status===401||r.status===403)
        return {ok:true,texto:"Conexão com o banco funcionando. Agora entre com o seu e-mail para ligar a sincronização."};
      if(r.ok)
        return {ok:true,texto:"Conexão com o banco funcionando."};
      if(r.status===404)
        return {ok:false,texto:"O banco respondeu, mas as tabelas não existem. Falta rodar o schema.sql no SQL Editor do Supabase."};
      return {ok:false,texto:"O banco respondeu com erro "+r.status+". Confira se o projeto no Supabase não está pausado."};
    })
    .catch(function(){
      return {ok:false,texto:"Não consegui falar com o banco. Pode ser falta de internet, endereço errado em config.js, ou o projeto pausado no Supabase (o plano gratuito pausa depois de uma semana sem uso)."};
    });
}

window.SYNC={
  configurado:CONFIGURADO,
  linkDeConvite:linkDeConvite,
  enderecoDeVolta:enderecoDeVolta,
  chavePerigosa:function(){ return chavePerigosa(CHAVE); },
  guardarConviteDaURL:guardarConviteDaURL,
  conviteGuardado:conviteGuardado,
  esquecerConvite:esquecerConvite,
  diagnosticar:diagnosticar,
  estado:estado,
  aoMudar:function(fn){ ouvinte=fn; },
  email:function(){ return sessao?sessao.email:""; },
  grupo:function(){ return grupo; },
  enviarLink:enviarLink,
  entrarComCodigo:entrarComCodigo,
  processarRetorno:processarRetorno,
  sair:sair,
  criarGrupo:criarGrupo,
  entrarGrupo:entrarGrupo,
  meuGrupo:meuGrupo,
  sincronizar:sincronizar
};

})();
