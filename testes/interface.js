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
