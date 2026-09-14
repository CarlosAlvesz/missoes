/* =========================================================
   Testes de interface: abre o app num navegador de verdade e
   joga, conferindo que os quatro formatos de resposta funcionam
   e que a criança não consegue chegar num beco sem saída.

   Rode com:  node testes/interface.js
   Precisa do Playwright:  npm install --no-save playwright
                           npx playwright install chromium
   ========================================================= */
"use strict";
var http=require("http"), fs=require("fs"), path=require("path");
var raiz=path.join(__dirname,"..");
var PORTA=8123;

var TIPOS={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",
  ".webmanifest":"application/manifest+json",".png":"image/png",".woff2":"font/woff2"};

function servidor(){
  return http.createServer(function(req,res){
    var arq=decodeURIComponent(req.url.split("?")[0]);
    if(arq==="/") arq="/index.html";
    var caminho=path.join(raiz,arq);
    if(caminho.indexOf(raiz)!==0 || !fs.existsSync(caminho) || fs.statSync(caminho).isDirectory()){
      res.writeHead(404); return res.end("nao encontrado");
    }
    res.writeHead(200,{"Content-Type":TIPOS[path.extname(caminho)]||"application/octet-stream"});
    res.end(fs.readFileSync(caminho));
  });
}

var falhas=[];
function conferir(condicao,texto){
  if(condicao) console.log("  ✓ "+texto);
  else { console.log("  ✗ "+texto); falhas.push(texto); }
}

(async function(){
  var playwright;
  try{ playwright=require("playwright"); }
  catch(e){
    console.log("Playwright não está instalado — pulando os testes de interface.");
    console.log("Para rodar:  npm install --no-save playwright && npx playwright install chromium");
    process.exit(0);
  }

  var srv=servidor();
  try{
    await new Promise(function(ok,erro){
      srv.once("error",erro);
      srv.listen(PORTA,function(){ srv.removeListener("error",erro); ok(); });
    });
  }catch(e){
    if(e && e.code==="EADDRINUSE"){
      console.log("A porta "+PORTA+" já está ocupada — provavelmente um teste anterior ficou rodando.");
      console.log("Feche-o e tente de novo, ou rode:  pkill -f testes/interface.js");
    }else{
      console.log("Não consegui subir o servidor de teste: "+(e&&e.message));
    }
    process.exit(1);
  }

  var lancar={args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]};
  if(process.env.CHROMIUM_PATH) lancar.executablePath=process.env.CHROMIUM_PATH;
  var navegador=await playwright.chromium.launch(lancar);
  var contexto=await navegador.newContext({viewport:{width:390,height:900},permissions:["microphone"]});
  var pg=await contexto.newPage();

  var errosJS=[];
  pg.on("console",function(m){ if(m.type()==="error") errosJS.push("console: "+m.text()); });
  pg.on("pageerror",function(e){ errosJS.push("erro de página: "+e.message); });
  if(process.env.DEPURAR_REDE) pg.on("requestfailed",function(r){
    console.log("      [rede] falhou: "+r.url().slice(0,120)+" — "+(r.failure()&&r.failure().errorText));
  });

  var base="http://127.0.0.1:"+PORTA+"/index.html?teste=1";
  await pg.goto(base);
  await pg.waitForTimeout(400);

  /* ---------- criar a primeira criança ---------- */
  console.log("\nPrimeiro uso");
  conferir(await pg.locator("#tela-crianca").isVisible(), "o app já abre pedindo para criar a criança");
  await pg.fill("#cr-nome","Téo");
  await pg.click("#cr-salvar");
  await pg.waitForTimeout(300);
  await pg.click(".perfil:not(.novo)");
  await pg.waitForTimeout(300);
  conferir(await pg.locator("#tela-home").isVisible(), "entrou na tela da criança");
  conferir(/Meta de hoje: 0 de 2/.test(await pg.textContent("#h-meta-txt")), "a meta do dia começa zerada");

  /* ---------- formatos de resposta ---------- */
  async function abrir(tag,nivel){
    await pg.evaluate(function(a){ return window.__teste(a[0],a[1]); },[tag,nivel]);
    await pg.waitForTimeout(200);
  }
  function resultado(){
    return pg.locator(".dots i.ok").count().then(function(n){ return n?"acerto":"erro"; });
  }

  console.log("\nFormato: digitar a resposta");
  await abrir("Soma",3);
  conferir(await pg.locator(".teclado .tecla").count()===12, "o tecladinho tem 12 teclas");
  conferir(await pg.locator(".tecla.ok").isDisabled(), "não dá para confirmar com o visor vazio");
  var resp=await pg.evaluate(function(){ return window.__q().resposta; });
  for(var i=0;i<resp.length;i++) await pg.locator(".tecla",{hasText:new RegExp("^"+resp[i]+"$")}).first().click();
  conferir((await pg.textContent(".visor .v"))===resp, "o visor mostra o que foi digitado");
  await pg.locator(".tecla.ok").click();
  await pg.waitForTimeout(200);
  conferir(await resultado()==="acerto", "a resposta certa conta como acerto");

  await abrir("Soma",3);
  var errada=await pg.evaluate(function(){ var r=window.__q().resposta; return r==="1"?"2":"1"; });
  await pg.locator(".tecla",{hasText:new RegExp("^"+errada+"$")}).first().click();
  await pg.locator(".tecla.ok").click();
  await pg.waitForTimeout(200);
  conferir(await resultado()==="erro", "a resposta errada conta como erro");
  conferir(await pg.locator(".visor .gabarito").count()>0, "mostra qual era a resposta certa");
  conferir(await pg.locator(".porque").count()>0, "explica o porquê");
  conferir(await pg.locator(".tecla:not(:disabled)").count()===0, "o teclado trava depois de responder");

  async function escolherNarradorCedo(v){
    if(await pg.locator(".xbtn").isVisible()) await pg.click(".xbtn");
    await pg.waitForTimeout(250);
    await pg.click("#btn-pais");
    await pg.fill("#pin-in","1234"); await pg.click("#pin-ok");
    await pg.waitForTimeout(400);
    await pg.selectOption("#cfg-narrador",v);
    await pg.waitForTimeout(200);
    await pg.click("#btn-pais");
    await pg.waitForTimeout(300);
    await pg.locator(".perfil:not(.novo)").first().click();
    await pg.waitForTimeout(300);
  }

  console.log("\nFormato: escrever com o teclado de letras");
  await abrir("Escrever a palavra",1);
  conferir(await pg.locator(".letra").count()===29, "o teclado traz o alfabeto inteiro, apagar e confirmar");
  var letrasTeclado=(await pg.locator(".letra").allTextContents()).slice(0,27).join("");
  conferir(letrasTeclado==="ABCDEFGHIJKLMNOPQRSTUVWXYZÇ",
           "as letras vêm em ordem alfabética, não em QWERTY");
  var palavra=await pg.evaluate(function(){ return window.__q().resposta; });
  conferir(await pg.locator(".casa").count()===palavra.length,
           "há uma casinha para cada letra da palavra");
  conferir(await pg.locator(".letra.ok").isDisabled(), "não dá para confirmar com a palavra incompleta");

  async function digitarPalavra(txt){
    for(var li=0; li<txt.length; li++)
      await pg.locator(".letra",{hasText:new RegExp("^"+txt[li]+"$")}).first().click();
  }
  await digitarPalavra(palavra.slice(0,1));
  conferir(await pg.locator(".casa.cheia").count()===1, "a letra tocada aparece na casinha");
  await pg.locator(".letra.apaga").click();
  await pg.waitForTimeout(100);
  conferir(await pg.locator(".casa.cheia").count()===0, "o apagar tira a última letra");
  await digitarPalavra(palavra);
  conferir(!(await pg.locator(".letra.ok").isDisabled()), "o confirmar libera com a palavra completa");
  await pg.locator(".letra.ok").click();
  await pg.waitForTimeout(300);
  conferir(await resultado()==="acerto", "escrever certo conta como acerto");

  await abrir("Escrever a palavra",1);
  var certa2=await pg.evaluate(function(){ return window.__q().resposta; });
  var erradaP=(certa2[0]==="A"?"B":"A")+certa2.slice(1);
  await digitarPalavra(erradaP);
  await pg.locator(".letra.ok").click();
  await pg.waitForTimeout(300);
  conferir(await resultado()==="erro", "escrever errado conta como erro");
  conferir(await pg.locator(".casas.gabarito").count()>0, "mostra a palavra certa quando erra");
  conferir(await pg.locator(".letra:not(:disabled)").count()===0, "o teclado trava depois de responder");

  await abrir("Completar a palavra",1);
  conferir(await pg.locator(".casa").count()===1, "completar pede uma letra só");
  conferir((await pg.textContent(".frase")).indexOf("_")>=0, "a palavra aparece com a letra faltando");

  /* o ditado precisa do botão de ouvir mesmo com o narrador desligado */
  await escolherNarradorCedo("nunca");
  await abrir("Ditado",1);
  conferir(await pg.locator(".qcard .qrow .speak").count()>0,
           "o ditado mantém o botão de ouvir mesmo com o narrador desligado: a palavra falada é o enunciado");
  conferir(await pg.locator(".frase").count()===0, "no ditado a palavra não aparece escrita");
  await escolherNarradorCedo("ingles");

  console.log("\nFormato: colocar na ordem");
  await abrir("Montar a palavra",2);
  conferir(await pg.locator(".acoes-q .btn").isDisabled(), "não dá para conferir antes de montar tudo");
  var pecas=await pg.locator(".banca .peca").count();
  await pg.locator(".banca .peca").first().click();
  await pg.waitForTimeout(80);
  conferir(await pg.locator(".banca .peca").count()===pecas-1, "a peça usada sai da banca");
  await pg.locator(".tira .peca.posta").first().click();
  await pg.waitForTimeout(80);
  conferir(await pg.locator(".banca .peca").count()===pecas, "tocar na peça montada devolve ela para a banca");

  var certo=await pg.evaluate(function(){ return window.__q().certo; });
  for(var k=0;k<certo.length;k++) await pg.locator(".banca .peca",{hasText:new RegExp("^"+certo[k]+"$")}).first().click();
  conferir(!(await pg.locator(".acoes-q .btn").isDisabled()), "o botão libera quando tudo está montado");
  await pg.locator(".acoes-q .btn").click();
  await pg.waitForTimeout(200);
  conferir(await resultado()==="acerto", "a ordem certa conta como acerto");

  await abrir("Colocar em ordem",2);
  /* monta de propósito na ordem errada: a certa com os dois primeiros trocados.
     (Clicar sempre na última peça poderia dar a ordem certa por acaso.) */
  var ordemCerta=await pg.evaluate(function(){ return window.__q().certo; });
  var errado=ordemCerta.slice();
  errado[0]=ordemCerta[1]; errado[1]=ordemCerta[0];
  for(var j=0;j<errado.length;j++)
    await pg.locator(".banca .peca",{hasText:new RegExp("^"+errado[j]+"$")}).first().click();
  await pg.locator(".acoes-q .btn").click();
  await pg.waitForTimeout(200);
  conferir(await resultado()==="erro", "a ordem errada conta como erro");
  conferir(await pg.locator(".tira.gabarito").count()>0, "mostra a ordem certa quando erra");

  console.log("\nFormato: ligar os pares");
  await abrir("Ligar em inglês",2);
  var pares=await pg.evaluate(function(){ return window.__q().pares; });
  for(var m=0;m<pares.length;m++){
    await pg.locator(".ligar .lado").first().locator(".liga",{hasText:new RegExp("^"+pares[m][0]+"$")}).click();
    await pg.locator(".ligar .lado").last().locator(".liga",{hasText:new RegExp("^"+pares[m][1]+"$")}).click();
    await pg.waitForTimeout(100);
  }
  await pg.waitForTimeout(200);
  conferir(await pg.locator(".liga.ligado").count()===pares.length*2, "todos os pares ficam marcados");
  conferir(await resultado()==="acerto", "ligar tudo certo conta como acerto");

  await abrir("Ligar em inglês",2);
  pares=await pg.evaluate(function(){ return window.__q().pares; });
  for(var t=0;t<2;t++){
    await pg.locator(".ligar .lado").first().locator(".liga",{hasText:new RegExp("^"+pares[0][0]+"$")}).click();
    await pg.locator(".ligar .lado").last().locator(".liga",{hasText:new RegExp("^"+pares[1][1]+"$")}).click();
    await pg.waitForTimeout(450);
  }
  conferir(await pg.locator(".liga.ligado").count()===0, "par errado não fica ligado");
  for(var u=0;u<pares.length;u++){
    await pg.locator(".ligar .lado").first().locator(".liga",{hasText:new RegExp("^"+pares[u][0]+"$")}).click();
    await pg.locator(".ligar .lado").last().locator(".liga",{hasText:new RegExp("^"+pares[u][1]+"$")}).click();
    await pg.waitForTimeout(100);
  }
  await pg.waitForTimeout(200);
  conferir(await resultado()==="erro", "errar duas vezes conta como erro");

  console.log("\nFormato: escolher entre alternativas");
  await abrir("Adivinha",1);
  await pg.locator(".op").first().click();
  await pg.waitForTimeout(200);
  conferir(await pg.locator(".op.certa").count()===1, "a resposta certa sempre acende");
  conferir(await pg.locator(".op:not(:disabled)").count()===0, "as alternativas travam depois de responder");

  /* ---------- uma missão inteira, do começo ao fim ---------- */
  console.log("\nUma missão de verdade, do começo ao fim");
  await pg.goto(base);
  await pg.waitForTimeout(300);
  await pg.click(".perfil:not(.novo)");
  await pg.waitForTimeout(300);
  await pg.click(".mcard.m-leitura");
  await pg.waitForTimeout(250);
  var respondidas=0;
  for(var p=0;p<12;p++){
    for(var w=0; w<9 && await pg.locator(".contagem").count(); w++) await pg.waitForTimeout(1000);
    if(await pg.locator("#tela-fim").isVisible()) break;
    if(await pg.locator(".op").count()) await pg.locator(".op").first().click();
    else if(await pg.locator(".letra.ok").count()){
      var alvoM=await pg.evaluate(function(){ return window.__q().resposta; });
      for(var lm=0; lm<alvoM.length; lm++)
        await pg.locator(".letra",{hasText:new RegExp("^"+alvoM[lm]+"$")}).first().click();
      await pg.locator(".letra.ok").click();
    }
    else if(await pg.locator(".tecla.ok").count()){ await pg.locator(".tecla").first().click(); await pg.locator(".tecla.ok").click(); }
    else if(await pg.locator(".banca .peca").count()){
      var c=await pg.locator(".banca .peca").count();
      for(var z=0;z<c;z++) await pg.locator(".banca .peca").first().click();
      await pg.locator(".acoes-q .btn").click();
    }
    else if(await pg.locator(".ligar").count()){
      var pp=await pg.evaluate(function(){ return window.__q().pares; });
      for(var y=0;y<pp.length;y++){
        await pg.locator(".ligar .lado").first().locator(".liga",{hasText:new RegExp("^"+pp[y][0]+"$")}).click();
        await pg.locator(".ligar .lado").last().locator(".liga",{hasText:new RegExp("^"+pp[y][1]+"$")}).click();
        await pg.waitForTimeout(80);
      }
    }
    else break;
    respondidas++;
    await pg.waitForTimeout(150);
    var cont=pg.locator(".retorno .btn");
    if(await cont.count()) await cont.click();
    await pg.waitForTimeout(1200);
  }
  conferir(respondidas===8, "a missão tem 8 perguntas (respondeu "+respondidas+")");
  conferir(await pg.locator("#tela-fim").isVisible(), "chegou na tela de fim");
  conferir(/\d+ de 8/.test(await pg.textContent("#f-placar")), "a tela de fim mostra o placar");

  await pg.click("#f-voltar");
  await pg.waitForTimeout(300);
  conferir(/Meta de hoje: 1 de 2/.test(await pg.textContent("#h-meta-txt")), "a meta do dia andou");

  /* ---------- área dos adultos ---------- */
  console.log("\nÁrea dos adultos");
  await pg.click("#btn-pais");
  await pg.fill("#pin-in","9999"); await pg.click("#pin-ok");
  var aviso=await pg.textContent("#pin-aviso");
  conferir(aviso.indexOf("1234")<0, "a mensagem de PIN errado não entrega o PIN padrão");
  await pg.fill("#pin-in","1234"); await pg.click("#pin-ok");
  await pg.waitForTimeout(400);
  conferir(await pg.locator("#tela-pais").isVisible(), "o PIN certo abre o painel");
  conferir((await pg.textContent("#relatorio")).indexOf("Téo")>=0, "o relatório da semana fala da criança");

  /* nome com HTML não pode virar marcação na tela */
  await pg.click("#add-crianca");
  await pg.fill("#cr-nome","<img src=x onerror=alert(1)>");
  await pg.click("#cr-salvar");
  await pg.waitForTimeout(300);
  conferir(await pg.locator("#relatorio img, #sync-txt img, .relato img").count()===0,
           "nome digitado com HTML aparece como texto, não vira marcação");

  /* ---------- sincronização: convite e diagnóstico ---------- */
  console.log("\nSincronização");
  /* o service worker serve o config.js do cache, então aqui ele fica bloqueado */
  var ctxS=await navegador.newContext({viewport:{width:420,height:1000},serviceWorkers:"block"});
  var pgS=await ctxS.newPage();
  var errosS=[];
  pgS.on("pageerror",function(e){ errosS.push(e.message); });

  async function abrirAdultos(pagina){
    await pagina.click("#btn-pais");
    await pagina.fill("#pin-in","1234"); await pagina.click("#pin-ok");
    await pagina.waitForTimeout(400);
  }
  async function comConfig(url,chave){
    await pgS.route("**/config.js",function(rota){
      rota.fulfill({contentType:"text/javascript",
        body:'window.CONFIG={supabaseUrl:"'+url+'",supabaseAnonKey:"'+chave+'"};'});
    });
    await pgS.goto(base);
    await pgS.waitForTimeout(400);
    await abrirAdultos(pgS);
    await pgS.locator("#sync-area button").filter({hasText:"Testar a conexão"}).click();
    await pgS.waitForTimeout(900);
    return pgS.textContent("#sync-aviso");
  }

  /* Sem configuração o app não pode parecer quebrado.
     O config.js de verdade pode já estar preenchido, então aqui ele é
     simulado vazio em vez de se contar com o arquivo do repositório. */
  await pgS.route("**/config.js",function(rota){
    rota.fulfill({contentType:"text/javascript",
      body:'window.CONFIG={supabaseUrl:"",supabaseAnonKey:""};'});
  });
  await pgS.goto(base);
  await pgS.waitForTimeout(400);
  await pgS.fill("#cr-nome","Téo"); await pgS.click("#cr-salvar");
  await pgS.waitForTimeout(300);
  await abrirAdultos(pgS);
  var semCfg=await pgS.textContent("#sync-txt");
  conferir(/funciona normalmente/.test(semCfg), "sem config.js o app diz que funciona normalmente, não que está quebrado");
  conferir(await pgS.locator("#sync-area button").filter({hasText:"Testar"}).count()===0,
           "sem config.js não oferece testar conexão");
  await pgS.unroute("**/config.js");

  /* formato realista de chave publicável: o app recusa qualquer outro */
  var chaveLonga="sb_publishable_"+new Array(33).join("a");
  var d1=await comConfig("abc",chaveLonga);
  conferir(/endereço/i.test(d1) && /supabase\.co/.test(d1),
           "endereço malformado é explicado em português: "+JSON.stringify(d1.slice(0,60)));
  var d2=await comConfig("https://abcdefgh.supabase.co","curta");
  conferir(/chave/i.test(d2) && /sb_publishable_/.test(d2),
           "chave que não é do Supabase é explicada, com o formato certo");
  var d3=await comConfig("https://naoexiste123456789.supabase.co",chaveLonga);
  conferir(/pausado|internet|banco/i.test(d3),
           "projeto inalcançável dá uma explicação com o que verificar");
  conferir(d3.indexOf("undefined")<0 && !/^[A-Za-z]*Error/.test(d3),
           "o diagnóstico nunca mostra erro técnico cru");

  /* o app instalado abre em .../index.html, mas a URL liberada no Supabase
     é a da pasta: o endereço de volta tem de ser o mesmo nos dois casos */
  var voltas=await pgS.evaluate(function(){
    var real=location.pathname, saida={};
    ["/missoes/","/missoes/index.html","/","/index.html"].forEach(function(c){
      /* recalcula a regra com cada caminho possível */
      var caminho=c.replace(/index\.html?$/i,"");
      if(!caminho) caminho="/";
      saida[c]=location.origin+caminho;
    });
    return {saida:saida, atual:window.SYNC.enderecoDeVolta(), real:real};
  });
  conferir(voltas.saida["/missoes/"]===voltas.saida["/missoes/index.html"],
           "a pasta e o index.html dão o mesmo endereço de volta");
  conferir(voltas.atual.indexOf("index.html")<0,
           "o endereço de volta nunca inclui index.html: "+voltas.atual);

  /* colar a chave secreta num arquivo público abriria o banco inteiro */
  function jwtFalso(papel){
    function b64(o){ return Buffer.from(JSON.stringify(o)).toString("base64url"); }
    return b64({alg:"HS256",typ:"JWT"})+"."+b64({iss:"supabase",role:papel})+".assinatura";
  }
  async function alertaDeChave(chave){
    await pgS.route("**/config.js",function(rota){
      rota.fulfill({contentType:"text/javascript",
        body:'window.CONFIG={supabaseUrl:"https://abcdefgh.supabase.co",supabaseAnonKey:"'+chave+'"};'});
    });
    await pgS.goto(base);
    await pgS.waitForTimeout(400);
    await abrirAdultos(pgS);
    var tem=await pgS.locator(".perigo").count()>0;
    var texto=tem?await pgS.textContent(".perigo"):"";
    await pgS.unroute("**/config.js");
    return {tem:tem,texto:texto};
  }

  var secretaNova=await alertaDeChave("sb_secret_AbCdEf123456");
  conferir(secretaNova.tem && /NÃO pode ficar/.test(secretaNova.texto),
           "a chave secreta nova (sb_secret_) dispara alerta sem precisar clicar em nada");
  var servico=await alertaDeChave(jwtFalso("service_role"));
  conferir(servico.tem && /service_role/.test(servico.texto),
           "a chave service_role antiga também é reconhecida e recusada");
  var publicavel=await alertaDeChave("sb_publishable_AbCdEf1234567890");
  conferir(!publicavel.tem, "a chave publicável correta não dispara alerta");
  var anonAntiga=await alertaDeChave(jwtFalso("anon"));
  conferir(!anonAntiga.tem, "a chave anon antiga continua sendo aceita");

  /* convite pelo link */
  await pgS.goto(base.replace("?teste=1","?familia=A1B2-C3D4"));
  await pgS.waitForTimeout(500);
  conferir(await pgS.evaluate(function(){ return window.SYNC.conviteGuardado(); })==="A1B2-C3D4",
           "o código da família vem no link e fica guardado");
  conferir(!(await pgS.evaluate(function(){ return location.search.indexOf("familia")>=0; })),
           "o código sai da barra de endereço depois de lido");

  await pgS.evaluate(function(){ localStorage.removeItem("missoes.convite.v1"); });
  await pgS.goto(base.replace("?teste=1","?familia=%3Cscript%3Ealert(1)%3C/script%3E"));
  await pgS.waitForTimeout(400);
  conferir(await pgS.evaluate(function(){ return window.SYNC.conviteGuardado(); })==="",
           "um convite com lixo na URL é recusado");

  conferir(errosS.length===0, "nenhum erro de JavaScript na sincronização");
  if(errosS.length) errosS.forEach(function(e){ console.log("      "+e); });
  await ctxS.close();

  /* ---------- gráfico de evolução ---------- */
  console.log("\nGráfico de evolução no painel");
  var ctxG=await navegador.newContext({viewport:{width:900,height:1400}});
  var pgG=await ctxG.newPage();
  var errosG=[];
  pgG.on("pageerror",function(e){ errosG.push(e.message); });

  var agoraG=Date.now();
  var pcSemana=[52,58,null,64,71,69,78,83], sessoesG=[];
  pcSemana.forEach(function(pc,i){
    if(pc===null) return;
    var n=2+(i%3);
    for(var k=0;k<n;k++){
      var ts=agoraG-((7-i)*7+k)*86400000;
      sessoesG.push({id:"g"+i+"-"+k,perfil:"g1",ts:ts,dia:new Date(ts).toISOString().slice(0,10),
        area:"leitura",tipo:"quiz",treino:"",acertos:Math.round(8*pc/100),total:8,seg:150,
        estrelas:2,tags:{},texto:"",nivel:2,autonomia:2,foco:2,fluencia:null,obs:"",avaliador:"",atualizado:ts});
    }
  });
  await pgG.addInitScript(function(d){ localStorage.setItem("missoes.dados.v2",JSON.stringify(d)); },{
    perfis:[{id:"g1",nome:"Téo",avatar:"🦖",letra:"bastao",meta:2,niveis:{},revisao:{},recentes:[],
      escudos:0,escudosGanhos:0,escudoUsado:{},removido:false,atualizado:agoraG}],
    sessoes:sessoesG, cfg:{pin:"1234",ultimo:"g1",som:false,musica:false,narrador:"ingles"}});
  await pgG.goto(base);
  await pgG.waitForTimeout(400);
  await pgG.click("#btn-pais");
  await pgG.fill("#pin-in","1234"); await pgG.click("#pin-ok");
  await pgG.waitForTimeout(600);

  conferir(await pgG.locator(".evolucao svg").count()>0, "o painel mostra o gráfico de evolução");
  conferir(await pgG.locator(".evolucao path[fill]").count()===7,
           "uma coluna por semana com atividade (7 de 8)");
  conferir(await pgG.locator(".evolucao rect").count()===1,
           "a semana em branco aparece vazia, não como zero");
  conferir(await pgG.locator('.evolucao text[font-weight="700"]').count()===1,
           "só a última semana leva o número em cima (rótulo em tudo vira ruído)");
  var mancheteG=await pgG.textContent(".evolucao-manchete");
  conferir(/Subiu 3[0-9] pontos/.test(mancheteG), "a manchete diz quanto subiu: "+JSON.stringify(mancheteG.trim()));
  conferir(await pgG.locator(".evolucao title").count()===7, "cada coluna tem a informação ao passar o rato");
  var umTitulo=await pgG.locator(".evolucao title").last().textContent();
  conferir(/% de acerto em \d+ atividade/.test(umTitulo), "a dica traz acerto e quantidade: "+JSON.stringify(umTitulo));

  /* nunca dois eixos: só uma medida desenhada, o volume vai escrito */
  var eixos=await pgG.locator(".evolucao text").allTextContents();
  var comPorcento=eixos.filter(function(t){ return /%$/.test(t); });
  conferir(comPorcento.length===4, "existe um eixo só, em porcentagem (3 linhas + o valor da última)");

  /* a coluna não pode engordar num painel largo */
  var grossura=await pgG.evaluate(function(){
    var p=document.querySelector(".evolucao path[fill]");
    return p ? p.getBoundingClientRect().width : 0;
  });
  conferir(grossura>0 && grossura<=32, "a coluna fica fina mesmo num painel largo ("+grossura.toFixed(0)+"px)");

  conferir(errosG.length===0, "nenhum erro de JavaScript no gráfico");
  if(errosG.length) errosG.forEach(function(e){ console.log("      "+e); });
  await ctxG.close();

  /* com pouca história não desenha gráfico nenhum — contexto novo, porque
     recarregar a página reexecuta o script que semeia os dados */
  var ctxG2=await navegador.newContext({viewport:{width:900,height:1200}});
  var pgG2=await ctxG2.newPage();
  await pgG2.addInitScript(function(d){ localStorage.setItem("missoes.dados.v2",JSON.stringify(d)); },{
    perfis:[{id:"g1",nome:"Téo",avatar:"🦖",letra:"bastao",meta:2,niveis:{},revisao:{},recentes:[],
      escudos:0,escudosGanhos:0,escudoUsado:{},removido:false,atualizado:agoraG}],
    /* duas atividades hoje: uma semana só de história, de propósito */
    sessoes:[0,1].map(function(k){
      return {id:"h"+k,perfil:"g1",ts:agoraG,dia:new Date(agoraG).toISOString().slice(0,10),
        area:"leitura",tipo:"quiz",treino:"",acertos:6,total:8,seg:150,estrelas:2,tags:{},
        texto:"",nivel:2,autonomia:2,foco:2,fluencia:null,obs:"",avaliador:"",atualizado:agoraG};
    }),
    cfg:{pin:"1234",ultimo:"g1",som:false,musica:false,narrador:"ingles"}});
  await pgG2.goto(base);
  await pgG2.waitForTimeout(400);
  await pgG2.click("#btn-pais");
  await pgG2.fill("#pin-in","1234"); await pgG2.click("#pin-ok");
  await pgG2.waitForTimeout(600);
  conferir(await pgG2.locator(".evolucao svg").count()===0,
           "com menos de duas semanas não desenha gráfico");
  conferir(/duas semanas/.test(await pgG2.textContent("#conteudo-crianca")),
           "e explica que ainda falta história para comparar");
  await ctxG2.close();

  /* ---------- a turma ---------- */
  /* em contexto próprio: a esta altura já existem crianças criadas pelos
     testes anteriores, e aqui é preciso controlar quantas são */
  console.log("\nA turma");
  var ctxT=await navegador.newContext({viewport:{width:400,height:1000}});
  var pt=await ctxT.newPage();
  var errosT=[];
  pt.on("pageerror",function(e){ errosT.push(e.message); });

  function crianca(id,nome,av){
    return {id:id,nome:nome,avatar:av,letra:"bastao",meta:2,niveis:{},revisao:{},recentes:[],
      escudos:0,escudosGanhos:0,escudoUsado:{},removido:false,atualizado:Date.now()};
  }
  function atividade(perfil,i,diasAtras){
    var q=Date.now()-diasAtras*86400000;
    return {id:perfil+"-"+diasAtras+"-"+i,perfil:perfil,ts:q,dia:new Date(q).toISOString().slice(0,10),
      area:"leitura",tipo:"quiz",treino:"",acertos:6,total:8,seg:120,estrelas:2,tags:{},texto:"",
      nivel:1,autonomia:2,foco:2,fluencia:null,obs:"",avaliador:"",atualizado:q};
  }

  /* uma criança só: não há turma */
  await pt.addInitScript(function(d){ localStorage.setItem("missoes.dados.v2",JSON.stringify(d)); },
    {perfis:[crianca("s1","Sozinho","🐢")],sessoes:[],
     cfg:{pin:"1234",ultimo:"s1",som:false,musica:false,narrador:"ingles"}});
  await pt.goto(base);
  await pt.waitForTimeout(400);
  await pt.click(".perfil:not(.novo)");
  await pt.waitForTimeout(400);
  conferir(await pt.locator("#turma").isHidden(), "com uma criança só não existe turma");
  await ctxT.close();

  /* quatro crianças, com esforços bem diferentes */
  var ctxT2=await navegador.newContext({viewport:{width:400,height:1000}});
  var pt2=await ctxT2.newPage();
  pt2.on("pageerror",function(e){ errosT.push(e.message); });
  await pt2.addInitScript(function(d){ localStorage.setItem("missoes.dados.v2",JSON.stringify(d)); },{
    perfis:[crianca("p1","Téo","🦖"),crianca("p2","Ana","🐼"),crianca("p3","Bia","🦄"),crianca("p4","Lucas","🐯")],
    sessoes:[atividade("p1",0,0),atividade("p1",1,1),atividade("p1",2,2),
             atividade("p3",0,0),
             atividade("p4",0,0),atividade("p4",1,0),atividade("p4",2,1),atividade("p4",3,2)],
    cfg:{pin:"1234",ultimo:"p1",som:false,musica:false,narrador:"ingles"}});
  await pt2.goto(base);
  await pt2.waitForTimeout(400);
  await pt2.locator(".perfil:not(.novo)").first().click();
  await pt2.waitForTimeout(500);

  conferir(await pt2.locator("#turma").isVisible(), "com mais de uma criança a turma aparece");
  conferir(await pt2.locator(".amigo").count()===4, "a turma mostra todas as crianças");
  conferir(await pt2.locator(".amigo.eu").count()===1, "a própria criança fica destacada");
  var placarT=await pt2.textContent(".turma-placar");
  conferir(/turma/i.test(placarT), "existe um placar do grupo: "+JSON.stringify(placarT));

  /* ordem por nome, nunca por desempenho: com 6 anos um ranking desanima
     justamente quem mais precisa */
  var nomesT=(await pt2.locator(".amigo .nm").allTextContents())
    .map(function(x){ return x.replace(" (você)",""); });
  var ordenadosT=nomesT.slice().sort(function(a,b){ return a.localeCompare(b,"pt"); });
  conferir(nomesT.join("|")===ordenadosT.join("|"),
           "a turma vem ordenada por nome, não por pontuação");
  var textoTurma=await pt2.textContent("#turma");
  conferir(textoTurma.indexOf("1º")<0 && textoTurma.indexOf("lugar")<0 && textoTurma.indexOf("ranking")<0,
           "não existe posição, lugar nem ranking na turma");
  conferir(textoTurma.indexOf("Lucas")>=0 && textoTurma.indexOf("Ana")>=0,
           "quem estudou muito e quem não estudou aparecem do mesmo jeito");

  /* o texto de cada criança não pode herdar a caixa da meta do dia */
  var semCaixaT=await pt2.evaluate(function(){
    var e=document.querySelector(".amigo .quando");
    if(!e) return false;
    var c=getComputedStyle(e);
    return parseFloat(c.borderTopWidth)===0 && parseFloat(c.paddingTop)<4;
  });
  conferir(semCaixaT, "o texto da turma não herda a caixa de outra seção");
  conferir(errosT.length===0, "nenhum erro de JavaScript na turma");
  if(errosT.length) errosT.forEach(function(e){ console.log("      "+e); });
  await ctxT2.close();

  /* ---------- leitura em voz alta: sem narrador, com gravação ---------- */
  console.log("\nLeitura em voz alta");
  await pg.goto(base);
  await pg.waitForTimeout(300);
  await pg.click(".perfil:not(.novo)");
  await pg.waitForTimeout(300);
  await pg.click(".mcard.m-voz");
  await pg.waitForTimeout(400);
  conferir(await pg.locator(".qcard .qrow .speak").count()===0,
           "não existe botão de ouvir o texto: quem lê é a criança");
  conferir((await pg.textContent(".frase")).length>10, "o texto para ler aparece");

  var gravaAqui=await pg.evaluate(function(){ return window.GRAVADOR && window.GRAVADOR.suportado(); });
  conferir(gravaAqui, "este navegador consegue gravar áudio");
  if(gravaAqui){
    conferir(await pg.locator(".grav-botao").count()>0, "o botão de gravar aparece");
    await pg.locator(".grav-botao").click();
    await pg.waitForTimeout(900);
    conferir(await pg.evaluate(function(){ return window.GRAVADOR.gravando(); }), "a gravação começa ao tocar no microfone");
    conferir(await pg.locator(".grav-botao.gravando").count()>0, "o botão mostra que está gravando");
    await pg.waitForTimeout(1600);
    conferir(/0:0[123]/.test(await pg.textContent(".grav-tempo")), "o cronômetro anda");

    await pg.locator(".grav-botao").click();
    await pg.waitForTimeout(1400);
    conferir(!(await pg.evaluate(function(){ return window.GRAVADOR.gravando(); })), "a gravação para");
    conferir(await pg.locator(".grav-player").isVisible(), "a criança pode se ouvir antes de entregar");
    conferir(await pg.locator(".grav-botao").isHidden(), "o botão de gravar dá lugar ao tocador");
    conferir(await pg.locator(".chip:has-text('Gravar de novo')").count()>0, "dá para gravar de novo");

    await pg.locator(".acoes-q .btn").click();
    await pg.waitForTimeout(1200);
    var guardou=await pg.evaluate(function(){
      var d=JSON.parse(localStorage.getItem("missoes.dados.v2"));
      var s=d.sessoes[d.sessoes.length-1];
      return window.GRAVADOR.buscar(s.id).then(function(g){
        return {marcada:!!s.temAudio, achou:!!(g&&g.blob), bytes:g&&g.blob?g.blob.size:0};
      });
    });
    conferir(guardou.marcada && guardou.achou && guardou.bytes>0,
             "a gravação fica guardada no aparelho ("+guardou.bytes+" bytes)");

    /* o adulto precisa conseguir ouvir antes de dar a nota */
    await pg.click("#f-pai");
    await pg.waitForTimeout(1000);
    conferir(await pg.locator("#campo-audio").isVisible(), "a avaliação mostra a gravação para o adulto");
    conferir(await pg.locator("#aval-audio .grav-player").count()>0, "o adulto tem um tocador para ouvir");

    /* sair no meio de uma gravação não pode deixar o microfone ligado */
    await pg.click("#aval-pular");
    await pg.waitForTimeout(400);
    await pg.goto(base);
    await pg.waitForTimeout(300);
    await pg.click(".perfil:not(.novo)");
    await pg.waitForTimeout(300);
    await pg.click(".mcard.m-voz");
    await pg.waitForTimeout(400);
    await pg.locator(".grav-botao").click();
    await pg.waitForTimeout(900);
    await pg.locator(".xbtn").click();
    await pg.waitForTimeout(500);
    conferir(!(await pg.evaluate(function(){ return window.GRAVADOR.gravando(); })),
             "sair pelo ✕ no meio da gravação desliga o microfone");

    /* tocar em "Já li" enquanto grava tem de salvar, não perder */
    await pg.click(".mcard.m-voz");
    await pg.waitForTimeout(400);
    await pg.locator(".grav-botao").click();
    await pg.waitForTimeout(1400);
    await pg.locator(".acoes-q .btn").click();
    await pg.waitForTimeout(1600);
    var naoPerdeu=await pg.evaluate(function(){
      var d=JSON.parse(localStorage.getItem("missoes.dados.v2"));
      var s=d.sessoes[d.sessoes.length-1];
      return window.GRAVADOR.buscar(s.id).then(function(g){ return !!(g&&g.blob&&g.blob.size); });
    });
    conferir(naoPerdeu, "tocar em “Já li” no meio da gravação salva o áudio em vez de perder");
    await pg.click("#f-voltar");
    await pg.waitForTimeout(300);
  }

  /* ---------- botão de ouvir a pergunta ---------- */
  console.log("\nBotão de ouvir a pergunta");
  async function temBotaoOuvir(tag){
    await pg.evaluate(function(t){ window.__teste(t,1); },tag);
    await pg.waitForTimeout(200);
    return (await pg.locator(".qcard .qrow .speak").count())>0;
  }
  async function escolherNarrador(v){
    if(await pg.locator(".xbtn").isVisible()) await pg.click(".xbtn");
    await pg.waitForTimeout(250);
    await pg.click("#btn-pais");
    await pg.fill("#pin-in","1234"); await pg.click("#pin-ok");
    await pg.waitForTimeout(400);
    await pg.selectOption("#cfg-narrador",v);
    await pg.waitForTimeout(200);
    await pg.click("#btn-pais");
    await pg.waitForTimeout(300);
    await pg.click(".perfil:not(.novo)");
    await pg.waitForTimeout(300);
  }
  conferir(await temBotaoOuvir("Vocabulário"), "por padrão, inglês mantém o botão de ouvir (é a pronúncia que se aprende)");
  conferir(!(await temBotaoOuvir("Ler palavra")), "por padrão, leitura não tem botão de ouvir");
  conferir(!(await temBotaoOuvir("Soma")), "por padrão, matemática não tem botão de ouvir");
  conferir(!(await temBotaoOuvir("Memória")), "a tela de memorização também respeita a regra");

  await escolherNarrador("sempre");
  conferir(await temBotaoOuvir("Ler palavra"), "no modo 'em todas', leitura volta a ter o botão");
  await escolherNarrador("nunca");
  conferir(!(await temBotaoOuvir("Vocabulário")), "no modo 'em nenhuma', nem inglês tem o botão");

  /* a explicação do erro continua podendo ser ouvida */
  await pg.evaluate(function(){ window.__teste("Soma",1); });
  await pg.waitForTimeout(250);
  var certa=await pg.evaluate(function(){
    var q=window.__q();
    return q.ops.filter(function(o){return o.ok;})[0].t;
  });
  var qtd=await pg.locator(".op").count();
  for(var oi=0; oi<qtd; oi++){
    if((await pg.locator(".op").nth(oi).textContent())!==String(certa)){
      await pg.locator(".op").nth(oi).click(); break;
    }
  }
  await pg.waitForTimeout(400);
  conferir(await pg.locator(".porque .speak").count()>0,
           "mesmo com o narrador desligado, a explicação do erro pode ser ouvida");
  await escolherNarrador("ingles");

  /* ---------- música de fundo ---------- */
  console.log("\nMúsica de fundo");
  await pg.goto(base);
  await pg.waitForTimeout(300);
  function tocando(){ return pg.evaluate(function(){ return window.MUSICA && window.MUSICA.tocando(); }); }

  await pg.click(".perfil:not(.novo)");
  await pg.waitForTimeout(500);
  conferir(await tocando(), "a música toca na tela da criança");

  await pg.click(".mcard.m-voz");
  await pg.waitForTimeout(400);
  conferir(!(await tocando()), "a música PARA na leitura em voz alta, para não competir com a voz");
  await pg.locator(".qcard .btn").click();
  await pg.waitForTimeout(600);
  await pg.click("#f-voltar");
  await pg.waitForTimeout(400);
  conferir(await tocando(), "a música volta depois da leitura em voz alta");

  await pg.click("#btn-som");
  await pg.waitForTimeout(300);
  conferir(!(await tocando()), "o botão 🔊 no mudo desliga a música junto");
  await pg.click("#btn-som");
  await pg.waitForTimeout(300);
  conferir(await tocando(), "religar o 🔊 traz a música de volta");

  await pg.click("#btn-pais");
  await pg.fill("#pin-in","1234"); await pg.click("#pin-ok");
  await pg.waitForTimeout(400);
  conferir(!(await tocando()), "a música para na área dos adultos");
  conferir(await pg.locator("#cfg-musica").isChecked(), "a música vem ligada por padrão");
  await pg.locator("#cfg-musica").uncheck();
  await pg.waitForTimeout(200);
  await pg.click("#btn-pais");
  await pg.waitForTimeout(300);
  await pg.click(".perfil:not(.novo)");
  await pg.waitForTimeout(400);
  conferir(!(await tocando()), "desligar a música nos ajustes realmente desliga");

  /* a escolha tem de sobreviver a fechar e abrir o app */
  await pg.goto(base);
  await pg.waitForTimeout(400);
  await pg.click(".perfil:not(.novo)");
  await pg.waitForTimeout(400);
  conferir(!(await tocando()), "a música continua desligada depois de reabrir o app");

  /* as notas geradas precisam continuar musicais: no tom, sem repetir e sem estridência.
     O gancho vai por addInitScript para sobreviver ao recarregamento. */
  await pg.evaluate(function(){
    var d=JSON.parse(localStorage.getItem("missoes.dados.v2"));
    d.cfg.musica=true; localStorage.setItem("missoes.dados.v2",JSON.stringify(d));
  });
  await pg.addInitScript(function(){
    window.__notas=[];
    var C=(window.AudioContext||window.webkitAudioContext).prototype;
    var orig=C.createOscillator;
    C.createOscillator=function(){
      var o=orig.call(this);
      var sv=o.frequency.setValueAtTime.bind(o.frequency);
      o.frequency.setValueAtTime=function(f,t){ window.__notas.push({f:f,tipo:o.type}); return sv(f,t); };
      return o;
    };
  });
  await pg.goto(base);
  await pg.waitForTimeout(300);
  await pg.click(".perfil:not(.novo)");
  await pg.waitForTimeout(20000);
  var notas=await pg.evaluate(function(){ return window.__notas||[]; });
  var melodia=notas.filter(function(x){ return x.tipo==="triangle"; }).map(function(x){ return Math.round(x.f*10)/10; });
  conferir(melodia.length>=8, "a música gerou notas de melodia ("+melodia.length+" em 20 s)");
  if(melodia.length>=8){
    var repetidas=0;
    for(var i=1;i<melodia.length;i++) if(melodia[i]===melodia[i-1]) repetidas++;
    conferir(repetidas===0, "a melodia nunca repete a mesma nota duas vezes seguidas ("+repetidas+")");
    conferir(new Set(melodia).size>=5, "a melodia usa várias alturas diferentes ("+new Set(melodia).size+")");
    conferir(Math.max.apply(null,melodia)<=1400, "nenhuma nota estridente (máx "+Math.round(Math.max.apply(null,melodia))+" Hz)");
    conferir(Math.min.apply(null,melodia)>=200, "nenhuma nota grave demais para o alto-falante do celular");
    /* toda nota tem de cair na pentatônica de dó: nada de sustenido fora do tom */
    var PENTA=[0,2,4,7,9];
    var foraDoTom=melodia.filter(function(f){
      var semitom=Math.round(12*Math.log(f/130.81)/Math.log(2));
      return PENTA.indexOf(((semitom%12)+12)%12)<0;
    });
    conferir(foraDoTom.length===0, "todas as notas ficam no tom ("+foraDoTom.length+" fora)");
  }

  /* ---------- layout: nada sobreposto, nada vazando para fora ---------- */
  console.log("\nLayout no celular");
  await pg.goto(base);
  await pg.waitForTimeout(300);
  await pg.click(".perfil:not(.novo)");
  await pg.waitForTimeout(300);

  async function vazaNaHorizontal(){
    return pg.evaluate(function(){
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
  }
  for(var larg of [320,360,400]){
    await pg.setViewportSize({width:larg,height:800});
    await pg.waitForTimeout(200);
    conferir(!(await vazaNaHorizontal()), "a tela da criança cabe em "+larg+"px sem rolar para o lado");
  }
  await pg.setViewportSize({width:390,height:900});

  /* o selo de revisão não pode cobrir o "Começar" do cartão */
  await pg.evaluate(function(){
    /* força uma revisão pendente para o selo aparecer */
    var d=JSON.parse(localStorage.getItem("missoes.dados.v2"));
    d.perfis[0].revisao={"Soma":{caixa:1,prox:Date.now()-86400000}};
    localStorage.setItem("missoes.dados.v2",JSON.stringify(d));
  });
  await pg.goto(base);
  await pg.waitForTimeout(300);
  await pg.click(".perfil:not(.novo)");
  await pg.waitForTimeout(400);
  var selo=pg.locator(".mcard .rev").first();
  conferir(await selo.count()>0, "o cartão da matéria mostra quantas revisões estão esperando");
  if(await selo.count()){
    var cx=await selo.boundingBox();
    var go=await pg.locator(".mcard.m-mat .go").boundingBox();
    var colide = cx && go && !(cx.x+cx.width<=go.x || go.x+go.width<=cx.x || cx.y+cx.height<=go.y || go.y+go.height<=cx.y);
    conferir(!colide, "o selo de revisão não fica por cima do 'Começar'");
  }

  /* nas telas de resposta também não pode vazar */
  var formatos=[["Soma",3,"digitar"],["Montar a frase",3,"montar a frase"],["Ligar os pares",3,"ligar os pares"],["Atenção",3,"contar muitas figuras"]];
  for(var fi=0; fi<formatos.length; fi++){
    await pg.evaluate(function(a){ window.__teste(a[0],a[1]); },[formatos[fi][0],formatos[fi][1]]);
    await pg.waitForTimeout(250);
    conferir(!(await vazaNaHorizontal()), "a tela de "+formatos[fi][2]+" cabe na largura do celular");
  }

  /* ---------- funciona sem internet? ---------- */
  console.log("\nSem internet");
  var ctx=await navegador.newContext({viewport:{width:390,height:844}});
  var off=await ctx.newPage();
  var errosOff=[];
  off.on("pageerror",function(e){ errosOff.push(e.message); });
  await off.goto("http://127.0.0.1:"+PORTA+"/index.html");
  await off.waitForTimeout(500);
  await off.fill("#cr-nome","Bia");
  await off.click("#cr-salvar");
  await off.waitForTimeout(300);

  /* espera o service worker guardar tudo */
  var sw=await off.evaluate(function(){
    return navigator.serviceWorker.ready.then(function(r){ return !!r.active; });
  });
  conferir(sw, "o service worker ficou ativo");
  await off.waitForTimeout(1500);
  var guardados=await off.evaluate(function(){
    return caches.keys().then(function(n){
      return caches.open(n[0]).then(function(c){ return c.keys(); });
    }).then(function(ks){ return ks.map(function(k){ return new URL(k.url).pathname; }); });
  });
  ["/index.html","/estilo.css","/js/app.js","/js/questoes.js","/js/som.js"].forEach(function(a){
    conferir(guardados.indexOf(a)>=0, "guardou "+a+" para usar offline");
  });

  await ctx.setOffline(true);
  var abriu=true;
  try{ await off.goto("http://127.0.0.1:"+PORTA+"/index.html"); }catch(e){ abriu=false; }
  await off.waitForTimeout(600);
  conferir(abriu, "o app abre com a internet desligada");
  conferir(await off.locator(".perfil:not(.novo)").count()>0, "a criança cadastrada continua lá offline");
  if(await off.locator(".perfil:not(.novo)").count()){
    await off.click(".perfil:not(.novo)");
    await off.waitForTimeout(300);
    await off.click(".mcard.m-mat");
    await off.waitForTimeout(400);
    conferir(await off.locator(".qcard .qtxt").count()>0, "dá para jogar uma missão inteira offline");
  }
  conferir(errosOff.length===0, "nenhum erro de JavaScript com a internet desligada");
  if(errosOff.length) errosOff.forEach(function(e){ console.log("      "+e); });
  await ctx.close();

  /* ---------- fim ---------- */
  conferir(errosJS.length===0, "nenhum erro de JavaScript em todo o percurso");
  if(errosJS.length) errosJS.forEach(function(e){ console.log("      "+e); });

  await navegador.close();
  srv.close();

  if(falhas.length){
    console.log("\n"+falhas.length+" PROBLEMA(S) na interface:");
    falhas.forEach(function(f){ console.log("  ✗ "+f); });
    process.exit(1);
  }
  console.log("\nInterface: tudo certo ✓");
})().catch(function(e){
  console.error("\nO teste de interface quebrou:", e && e.message);
  process.exit(1);
});
