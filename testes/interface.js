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
  await new Promise(function(ok){ srv.listen(PORTA,ok); });

  var lancar={};
  if(process.env.CHROMIUM_PATH) lancar.executablePath=process.env.CHROMIUM_PATH;
  var navegador=await playwright.chromium.launch(lancar);
  var pg=await navegador.newPage({viewport:{width:390,height:900}});

  var errosJS=[];
  pg.on("console",function(m){ if(m.type()==="error") errosJS.push("console: "+m.text()); });
  pg.on("pageerror",function(e){ errosJS.push("erro de página: "+e.message); });

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
  var n=await pg.locator(".banca .peca").count();
  for(var j=0;j<n;j++) await pg.locator(".banca .peca").last().click();
  await pg.locator(".acoes-q .btn").click();
  await pg.waitForTimeout(200);
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
