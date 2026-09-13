/* =========================================================
   Banco de questões — 1º ano do fundamental
   Cada habilidade tem uma função geradora que recebe o nível
   (1 = começando, 2 = firme, 3 = desafio) e devolve uma questão.

   Campos que uma questão pode ter:
     txt      pergunta escrita
     fala     o que o botão 🔊 lê em voz alta
     falaLang "en" para ler em inglês
     fig      figura em emoji     figGrande  figura em tamanho grande
     svg      desenho vetorial    conta      linha de conta
     frase    frase para ler
     ops      [{t:"texto",ok:true|false}]
     cols     quantas colunas de resposta   emoji  respostas são emoji
     porque   explicação curta, mostrada quando a criança erra
     preview  {txt,fig,seg} tela de memorização antes da pergunta
   ========================================================= */
(function(){
"use strict";

/* ---------- utilidades ---------- */
function shuffle(a){var b=a.slice(),i,j,t;for(i=b.length-1;i>0;i--){j=Math.floor(Math.random()*(i+1));t=b[i];b[i]=b[j];b[j]=t;}return b;}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function pickN(a,n){return shuffle(a).slice(0,n);}
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function ops(certo,lista){return shuffle(lista.map(function(t){return {t:t,ok:t===certo};}));}
function opsNum(certo,extras){
  var set=[certo],g=0;
  while(set.length<3&&g++<200){var c=extras(); if(c>=0&&set.indexOf(c)<0)set.push(c);}
  while(set.length<3){ var f=certo+set.length; if(set.indexOf(f)<0) set.push(f); else set.push(certo+set.length+3); }
  return shuffle(set.map(function(c){return {t:String(c),ok:c===certo};}));
}

/* monta uma questão a partir de um caso escrito à mão */
function caso(c){
  return {
    txt:c.t, fala:c.fala||c.t, falaLang:c.lang,
    fig:c.e, figGrande:c.e?true:false, porque:c.p,
    ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),
    cols:c.cols||3, emoji:!!c.emoji
  };
}
/* ---------------------------------------------------------
   Formatos de resposta além da múltipla escolha.
   Com 3 alternativas a criança acerta 1 em 3 chutando; digitar
   a conta, montar a palavra ou ligar os pares exige que ela
   realmente saiba. Cada formato é desenhado pelo app.js.
   --------------------------------------------------------- */

/* digitar a resposta num tecladinho de números */
function digitar(o){
  return {formato:"digitar", txt:o.t, fala:o.fala||o.t, conta:o.conta,
    fig:o.e, figGrande:!!o.e, resposta:String(o.r), porque:o.p};
}

/* tocar nos pedaços na ordem certa (sílabas de uma palavra, números, palavras de uma frase) */
function ordenar(o){
  var certo=o.certo.map(String), pecas=shuffle(certo), g=0;
  /* embaralhar de verdade: se sair na ordem certa a questão não existe */
  while(g++<40 && certo.length>1 && pecas.join("\u0001")===certo.join("\u0001")) pecas=shuffle(certo);
  return {formato:"ordenar", txt:o.t, fala:o.fala||o.t, certo:certo, pecas:pecas,
    fig:o.e, figGrande:!!o.e, porque:o.p, cola:o.cola!==false, dica:o.dica};
}

/* ligar cada figura da esquerda com o par dela na direita */
function ligar(o){
  return {formato:"ligar", txt:o.t, fala:o.fala||o.t, pares:o.pares,
    porque:o.p, emojiEsq:!!o.emojiEsq, emojiDir:!!o.emojiDir};
}

/* escolhe n pares distintos dos dois lados */
function paresDistintos(lista,n,esq,dir){
  var vistosE={}, vistosD={}, out=[];
  shuffle(lista).forEach(function(x){
    if(out.length>=n) return;
    var a=esq(x), b=dir(x);
    if(!a||!b||vistosE[a]||vistosD[b]) return;
    vistosE[a]=1; vistosD[b]=1; out.push([a,b]);
  });
  return out;
}

/* habilidade cujo conteúdo é uma lista de casos por nível */
function porCasos(tag,area,banco){
  return {tag:tag,area:area,fn:function(nv){
    var lista=banco[nv]||banco[2]||banco[1];
    return caso(pick(lista));
  }};
}

/* =========================================================
   VOCABULÁRIO — palavras com separação silábica e figura
   ========================================================= */
var P2=[ /* duas sílabas */
 {p:"bola",s:["bo","la"],e:"⚽"},{p:"gato",s:["ga","to"],e:"🐱"},{p:"casa",s:["ca","sa"],e:"🏠"},
 {p:"pato",s:["pa","to"],e:"🦆"},{p:"sapo",s:["sa","po"],e:"🐸"},{p:"bolo",s:["bo","lo"],e:"🎂"},
 {p:"dedo",s:["de","do"],e:"👆"},{p:"luva",s:["lu","va"],e:"🧤"},{p:"mala",s:["ma","la"],e:"🧳"},
 {p:"vaca",s:["va","ca"],e:"🐄"},{p:"pipa",s:["pi","pa"],e:"🪁"},{p:"rato",s:["ra","to"],e:"🐭"},
 {p:"sino",s:["si","no"],e:"🔔"},{p:"cama",s:["ca","ma"],e:"🛏️"},{p:"lua",s:["lu","a"],e:"🌙"},
 {p:"ovo",s:["o","vo"],e:"🥚"},{p:"uva",s:["u","va"],e:"🍇"},{p:"peixe",s:["pei","xe"],e:"🐟"},
 {p:"chuva",s:["chu","va"],e:"🌧️"},{p:"folha",s:["fo","lha"],e:"🍃"},{p:"faca",s:["fa","ca"],e:"🔪"},
 {p:"mesa",s:["me","sa"],e:"🍽️"},{p:"dado",s:["da","do"],e:"🎲"},{p:"fogo",s:["fo","go"],e:"🔥"},
 {p:"vela",s:["ve","la"],e:"🕯️"},{p:"rosa",s:["ro","sa"],e:"🌹"},{p:"suco",s:["su","co"],e:"🧃"},
 {p:"livro",s:["li","vro"],e:"📖"},{p:"copo",s:["co","po"],e:"🥤"},{p:"dente",s:["den","te"],e:"🦷"},
 {p:"leite",s:["lei","te"],e:"🥛"},{p:"carro",s:["car","ro"],e:"🚗"},{p:"bolsa",s:["bol","sa"],e:"👜"},
 {p:"gelo",s:["ge","lo"],e:"🧊"},{p:"lápis",s:["lá","pis"],e:"✏️"},{p:"nuvem",s:["nu","vem"],e:"☁️"},
 {p:"bota",s:["bo","ta"],e:"👢"},{p:"meia",s:["mei","a"],e:"🧦"},{p:"cabra",s:["ca","bra"],e:"🐐"},
 {p:"porta",s:["por","ta"],e:"🚪"},{p:"barco",s:["bar","co"],e:"⛵"},{p:"pizza",s:["piz","za"],e:"🍕"},
 {p:"queijo",s:["quei","jo"],e:"🧀"},{p:"milho",s:["mi","lho"],e:"🌽"},{p:"galo",s:["ga","lo"],e:"🐓"},
 {p:"urso",s:["ur","so"],e:"🐻"},{p:"pinto",s:["pin","to"],e:"🐥"},{p:"nariz",s:["na","riz"],e:"👃"},
 {p:"chave",s:["cha","ve"],e:"🔑"},{p:"fita",s:["fi","ta"],e:"🎀"},{p:"mapa",s:["ma","pa"],e:"🗺️"},
 {p:"doce",s:["do","ce"],e:"🍬"},{p:"praia",s:["prai","a"],e:"🏖️"},{p:"sopa",s:["so","pa"],e:"🥣"}
];
var P3=[ /* três sílabas */
 {p:"jacaré",s:["ja","ca","ré"],e:"🐊"},{p:"banana",s:["ba","na","na"],e:"🍌"},
 {p:"cavalo",s:["ca","va","lo"],e:"🐴"},{p:"sapato",s:["sa","pa","to"],e:"👟"},
 {p:"menina",s:["me","ni","na"],e:"👧"},{p:"tomate",s:["to","ma","te"],e:"🍅"},
 {p:"abelha",s:["a","be","lha"],e:"🐝"},{p:"sorvete",s:["sor","ve","te"],e:"🍦"},
 {p:"macaco",s:["ma","ca","co"],e:"🐒"},{p:"janela",s:["ja","ne","la"],e:"🪟"},
 {p:"cadeira",s:["ca","dei","ra"],e:"🪑"},{p:"foguete",s:["fo","gue","te"],e:"🚀"},
 {p:"estrela",s:["es","tre","la"],e:"⭐"},{p:"cachorro",s:["ca","chor","ro"],e:"🐶"},
 {p:"girafa",s:["gi","ra","fa"],e:"🦒"},{p:"panela",s:["pa","ne","la"],e:"🍲"},
 {p:"tesoura",s:["te","sou","ra"],e:"✂️"},{p:"formiga",s:["for","mi","ga"],e:"🐜"},
 {p:"caneta",s:["ca","ne","ta"],e:"🖊️"},{p:"boneca",s:["bo","ne","ca"],e:"🪆"},
 {p:"galinha",s:["ga","li","nha"],e:"🐔"},{p:"coelho",s:["co","e","lho"],e:"🐰"},
 {p:"morango",s:["mo","ran","go"],e:"🍓"},{p:"cenoura",s:["ce","nou","ra"],e:"🥕"},
 {p:"batata",s:["ba","ta","ta"],e:"🥔"},{p:"laranja",s:["la","ran","ja"],e:"🍊"},
 {p:"guitarra",s:["gui","tar","ra"],e:"🎸"},{p:"martelo",s:["mar","te","lo"],e:"🔨"},
 {p:"relógio",s:["re","ló","gio"],e:"⏰"},{p:"castelo",s:["cas","te","lo"],e:"🏰"},
 {p:"escova",s:["es","co","va"],e:"🪥"},{p:"garrafa",s:["gar","ra","fa"],e:"🍾"},
 {p:"pipoca",s:["pi","po","ca"],e:"🍿"},{p:"caderno",s:["ca","der","no"],e:"📓"},
 {p:"mochila",s:["mo","chi","la"],e:"🎒"},{p:"bandeira",s:["ban","dei","ra"],e:"🚩"},
 {p:"montanha",s:["mon","ta","nha"],e:"⛰️"},{p:"floresta",s:["flo","res","ta"],e:"🌲"},
 {p:"tucano",s:["tu","ca","no"],e:"🦜"},{p:"baleia",s:["ba","lei","a"],e:"🐋"},
 {p:"chuveiro",s:["chu","vei","ro"],e:"🚿"},{p:"semente",s:["se","men","te"],e:"🌰"},
 {p:"aranha",s:["a","ra","nha"],e:"🕷️"},{p:"minhoca",s:["mi","nho","ca"],e:"🪱"},
 {p:"camisa",s:["ca","mi","sa"],e:"👕"},{p:"vassoura",s:["vas","sou","ra"],e:"🧹"}
];
var P4=[ /* quatro sílabas */
 {p:"borboleta",s:["bor","bo","le","ta"],e:"🦋"},{p:"elefante",s:["e","le","fan","te"],e:"🐘"},
 {p:"melancia",s:["me","lan","ci","a"],e:"🍉"},{p:"bicicleta",s:["bi","ci","cle","ta"],e:"🚲"},
 {p:"dinossauro",s:["di","nos","sau","ro"],e:"🦕"},{p:"geladeira",s:["ge","la","dei","ra"],e:"🧊"},
 {p:"computador",s:["com","pu","ta","dor"],e:"💻"},{p:"passarinho",s:["pas","sa","ri","nho"],e:"🐦"},
 {p:"abacaxi",s:["a","ba","ca","xi"],e:"🍍"},{p:"tartaruga",s:["tar","ta","ru","ga"],e:"🐢"},
 {p:"chocolate",s:["cho","co","la","te"],e:"🍫"},{p:"telefone",s:["te","le","fo","ne"],e:"☎️"},
 {p:"caranguejo",s:["ca","ran","gue","jo"],e:"🦀"},{p:"crocodilo",s:["cro","co","di","lo"],e:"🐲"},
 {p:"lagartixa",s:["la","gar","ti","xa"],e:"🦎"},{p:"termômetro",s:["ter","mô","me","tro"],e:"🌡️"},
 {p:"limonada",s:["li","mo","na","da"],e:"🍋"},{p:"ventilador",s:["ven","ti","la","dor"],e:"🌀"},
 {p:"cachoeira",s:["ca","cho","ei","ra"],e:"💦"},{p:"formiguinha",s:["for","mi","gui","nha"],e:"🐜"}
];
function palavras(nv){ return nv<=1?P2:(nv===2?P2.concat(P3):P2.concat(P3).concat(P4)); }
var TODAS=P2.concat(P3).concat(P4);
function acharPalavra(nome){ for(var i=0;i<TODAS.length;i++) if(TODAS[i].p===nome) return TODAS[i]; return null; }

/* ---------- rimas ---------- */
var RIMAS=[
 ["pão","cão","mão","limão","balão"],
 ["bola","sacola","escola","cola"],
 ["gato","pato","rato","sapato"],
 ["casa","asa","brasa"],
 ["dedo","medo","cedo","brinquedo"],
 ["flor","cor","amor","calor"],
 ["janela","panela","canela","estrela","vela"],
 ["mala","bala","sala","fala"],
 ["coelho","espelho","joelho","vermelho"],
 ["abelha","orelha","ovelha","velha"],
 ["luva","chuva","uva"],
 ["vaca","faca","jaca","maca"],
 ["sino","pino","menino","padrinho"],
 ["bolo","rolo","polo"],
 ["cabelo","martelo","castelo","camelo"],
 ["pote","bote","chicote"],
 ["barco","charco","garço"],
 ["pipoca","boca","toca","minhoca"],
 ["formiga","amiga","barriga","figa"],
 ["macaco","buraco","saco","fraco"]
];

/* ---------- escrita certa x errada ---------- */
var ESCRITA={
 1:[["casa","caza"],["bola","bóla"],["gato","gatu"],["dedo","dédo"],["mala","malla"],["sapo","sapu"],
    ["pato","patu"],["mesa","meza"],["vela","véla"],["fogo","fogu"],["copo","copu"],["dado","dadu"]],
 2:[["chuva","xuva"],["escola","iscola"],["menino","minino"],["garrafa","garafa"],["janela","janéla"],
    ["tomate","tumate"],["caderno","cadernu"],["martelo","martélo"],["pipoca","pipoka"],["cenoura","senoura"],
    ["camisa","camiza"],["morango","morangu"],["relógio","relojio"],["batata","batáta"]],
 3:[["coelho","coelio"],["abelha","abeia"],["mulher","mulier"],["cachorro","caxorro"],["palhaço","paliaço"],
    ["passarinho","pasarinho"],["trabalho","trabaio"],["dinheiro","dinhero"],["bicicleta","bicicreta"],
    ["família","familha"],["exercício","ezercício"],["professora","proffessora"],["amanhã","amanhan"],
    ["chocolate","xocolate"],["borboleta","borboletta"],["aniversário","aniverssário"]]
};

/* ---------- frases com figura ---------- */
var FRASES={
 1:[{f:"o gato bebe leite",ok:"🐱",d:["🐶","🐦"]},
    {f:"a bola é azul",ok:"⚽",d:["🎈","📚"]},
    {f:"o pato está no lago",ok:"🦆",d:["🐟","🐸"]},
    {f:"eu como uma maçã",ok:"🍎",d:["🍌","🍉"]},
    {f:"o sol está quente",ok:"☀️",d:["🌙","❄️"]},
    {f:"a vaca faz muu",ok:"🐄",d:["🐓","🐷"]},
    {f:"o peixe nada na água",ok:"🐟",d:["🐦","🐇"]},
    {f:"eu visto a bota",ok:"👢",d:["🧢","🧤"]},
    {f:"a lua sai à noite",ok:"🌙",d:["☀️",  "🌈"]},
    {f:"o pão está na mesa",ok:"🍞",d:["🍫","🥗"]}],
 2:[{f:"o gato subiu no telhado",ok:"🐱",d:["🐶","🐴"]},
    {f:"a abelha pousou na flor",ok:"🌻",d:["🌵","🍄"]},
    {f:"o papai dirige o carro",ok:"🚗",d:["🚲","✈️"]},
    {f:"a vovó fez um bolo",ok:"🎂",d:["🍕","🥗"]},
    {f:"o cachorro achou o osso",ok:"🦴",d:["🧦","🔑"]},
    {f:"a menina pintou um coração",ok:"❤️",d:["⭐","🔺"]},
    {f:"o menino chutou a bola no gol",ok:"⚽",d:["🏀","🎾"]},
    {f:"a professora escreveu no quadro",ok:"🏫",d:["🏥","🏖️"]},
    {f:"eu escovei os dentes antes de dormir",ok:"🪥",d:["🍿","🎮"]},
    {f:"o passarinho fez o ninho na árvore",ok:"🐦",d:["🐠","🐜"]},
    {f:"a formiga carregou a folha",ok:"🐜",d:["🐘","🦁"]},
    {f:"o sorvete derreteu no sol",ok:"🍦",d:["🧊","🍞"]}],
 3:[{f:"depois da chuva apareceu o arco-íris",ok:"🌈",d:["❄️","🔥"]},
    {f:"o menino esqueceu a mochila na escola",ok:"🎒",d:["🧦","🍿"]},
    {f:"a borboleta saiu do casulo e voou",ok:"🦋",d:["🐛","🐢"]},
    {f:"o time ganhou o jogo e todos comemoraram",ok:"🏆",d:["🎹","🧹"]},
    {f:"o astronauta olhou a Terra pela janela da nave",ok:"🌎",d:["🏠","🚌"]},
    {f:"a semente que plantei virou uma árvore grande",ok:"🌳",d:["🪨","☂️"]},
    {f:"o bombeiro apagou o fogo com a mangueira",ok:"🚒",d:["🚑","🚜"]},
    {f:"acordei cedo porque hoje é dia de passeio",ok:"⏰",d:["🌙","🛏️"]},
    {f:"a tartaruga andou devagar até chegar ao mar",ok:"🐢",d:["🐆","🦅"]},
    {f:"o vulcão soltou fumaça e todos correram",ok:"🌋",d:["⛲","🏰"]}]
};

/* ---------- contrários e parecidos ---------- */
var OPOSTOS=[["grande","pequeno"],["alto","baixo"],["quente","frio"],["cheio","vazio"],
 ["dia","noite"],["novo","velho"],["rápido","devagar"],["dentro","fora"],["em cima","embaixo"],
 ["longe","perto"],["aberto","fechado"],["limpo","sujo"],["claro","escuro"],["forte","fraco"],
 ["molhado","seco"],["duro","mole"],["feliz","triste"],["gordo","magro"],["leve","pesado"],
 ["primeiro","último"],["começo","fim"],["ligado","desligado"],["subir","descer"],["entrar","sair"]];

var PARECIDOS=[["bonito","lindo"],["triste","chateado"],["rápido","ligeiro"],["esperto","inteligente"],
 ["assustado","com medo"],["cansado","sem energia"],["engraçado","divertido"],["gostoso","saboroso"],
 ["grande","enorme"],["pequeno","miúdo"],["alegre","feliz"],["silencioso","quieto"],
 ["comida","alimento"],["casa","lar"],["caminhar","andar"],["conversar","falar"]];

/* ---------- masculino e feminino ---------- */
var GENERO=[["menino","menina"],["gato","gata"],["cachorro","cadela"],["galo","galinha"],
 ["boi","vaca"],["rei","rainha"],["pai","mãe"],["avô","avó"],["irmão","irmã"],
 ["homem","mulher"],["cavalo","égua"],["professor","professora"],["primo","prima"],["tio","tia"]];

var VOGAIS="AEIOU".split("");

/* =========================================================
   LEITURA E ESCRITA
   ========================================================= */
var LEITURA=[
{tag:"Letra inicial",area:"leitura",fn:function(nv){
  var w=pick(palavras(nv)), L=w.p[0].toUpperCase();
  var alfa="BCDFGJLMPRSTVN".split("").filter(function(c){return c!==L;});
  return {txt:"Com que letra começa?",fala:"Com que letra começa "+w.p+"?",
    porque:w.p.toUpperCase()+" começa com "+L+".",
    fig:w.e,figGrande:true,ops:shuffle([{t:L,ok:true}].concat(pickN(alfa,nv>=3?3:2).map(function(c){return {t:c,ok:false};}))),cols:3};
}},
{tag:"Letra final",area:"leitura",fn:function(nv){
  var w=pick(palavras(nv)), L=w.p[w.p.length-1].toUpperCase();
  var alfa="AEIOUMLRSZ".split("").filter(function(c){return c!==L;});
  return {txt:"Com que letra termina?",fala:"Com que letra termina "+w.p+"?",
    porque:w.p.toUpperCase()+" termina com "+L+".",
    fig:w.e,figGrande:true,ops:shuffle([{t:L,ok:true}].concat(pickN(alfa,nv>=3?3:2).map(function(c){return {t:c,ok:false};}))),cols:3};
}},
{tag:"Sílaba inicial",area:"leitura",fn:function(nv){
  var lista=palavras(nv), w=pick(lista), sil=w.s[0];
  var outras=pickN(lista.filter(function(x){return x.s[0]!==sil;}),nv>=3?3:2);
  return {txt:"Qual palavra começa com "+sil.toUpperCase()+"?",fala:"Qual palavra começa com "+sil+"?",
    porque:w.p.toUpperCase()+" se separa assim: "+w.s.join(" - ")+".",
    ops:shuffle([{t:w.p,ok:true}].concat(outras.map(function(x){return {t:x.p,ok:false};}))),cols:3};
}},
{tag:"Sílaba final",area:"leitura",fn:function(nv){
  var lista=palavras(nv), w=pick(lista), sil=w.s[w.s.length-1];
  var outras=pickN(lista.filter(function(x){return x.s[x.s.length-1]!==sil;}),nv>=3?3:2);
  return {txt:"Qual palavra termina com "+sil.toUpperCase()+"?",fala:"Qual palavra termina com "+sil+"?",
    porque:w.p.toUpperCase()+" se separa assim: "+w.s.join(" - ")+".",
    ops:shuffle([{t:w.p,ok:true}].concat(outras.map(function(x){return {t:x.p,ok:false};}))),cols:3};
}},
{tag:"Contar sílabas",area:"leitura",fn:function(nv){
  var w=pick(palavras(nv)), n=w.s.length;
  return {txt:"Quantas sílabas tem "+w.p.toUpperCase()+"?",fala:"Quantas sílabas tem "+w.p+"?",
    porque:w.s.join(" - ")+" são "+n+" sílabas.",
    fig:w.e,figGrande:true,ops:opsNum(n,function(){return rnd(1,5);}),cols:3};
}},
{tag:"Juntar sílabas",area:"leitura",fn:function(nv){
  var lista=nv<=1?P2:(nv===2?P2.concat(P3):P3.concat(P4));
  var w=pick(lista);
  var junta=w.s.join(" + ").toUpperCase();
  var errada=w.s.slice().reverse().join("");
  var outra=pick(lista.filter(function(x){return x.p!==w.p;})).p;
  return {txt:"Junte as sílabas: "+junta,fala:"Junte as sílabas: "+w.s.join(", ")+". Que palavra forma?",
    porque:w.s.join(" + ")+" forma "+w.p.toUpperCase()+".",
    ops:ops(w.p,[w.p,errada,outra]),cols:3};
}},
{tag:"Ler palavra",area:"leitura",fn:function(nv){
  var lista=palavras(nv), w=pick(lista);
  var outras=pickN(lista.filter(function(x){return x.p!==w.p;}),nv>=3?3:2);
  return {txt:"Que palavra é esta figura?",fala:"Que palavra é esta figura?",fig:w.e,figGrande:true,
    porque:"Esta figura é "+w.p.toUpperCase()+".",
    ops:shuffle([{t:w.p,ok:true}].concat(outras.map(function(x){return {t:x.p,ok:false};}))),cols:3};
}},
{tag:"Escrita correta",area:"leitura",fn:function(nv){
  var par=pick(ESCRITA[nv]||ESCRITA[2]);
  return {txt:"Qual está escrita do jeito certo?",fala:"Qual está escrita do jeito certo?",
    porque:"O certo é "+par[0].toUpperCase()+".",
    ops:ops(par[0],[par[0],par[1]]),cols:2};
}},
{tag:"Ler frase",area:"leitura",fn:function(nv){
  var f=pick(FRASES[nv]||FRASES[2]);
  return {txt:"Leia e escolha a figura certa:",fala:f.f,frase:f.f,
    porque:"A frase fala de "+f.ok+".",
    ops:shuffle([{t:f.ok,ok:true}].concat(f.d.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:true};
}},
{tag:"Rimas",area:"leitura",fn:function(nv){
  var g=pick(RIMAS), par=pickN(g,2), alvo=par[0], certo=par[1];
  var fora=shuffle(RIMAS.filter(function(x){return x!==g;})).slice(0,nv>=3?3:2).map(function(x){return pick(x);});
  return {txt:"Qual palavra rima com "+alvo.toUpperCase()+"?",fala:"Qual palavra rima com "+alvo+"?",
    porque:alvo.toUpperCase()+" e "+certo.toUpperCase()+" terminam com o mesmo som.",
    ops:shuffle([{t:certo,ok:true}].concat(fora.map(function(x){return {t:x,ok:false};}))),cols:3};
}},
{tag:"Contrários",area:"leitura",fn:function(nv){
  var par=pick(OPOSTOS), inv=Math.random()<0.5;
  var alvo=inv?par[1]:par[0], certo=inv?par[0]:par[1];
  var outros=pickN(OPOSTOS.filter(function(x){return x[0]!==par[0];}),nv>=3?3:2).map(function(x){return Math.random()<0.5?x[0]:x[1];});
  return {txt:"Qual é o contrário de "+alvo.toUpperCase()+"?",fala:"Qual é o contrário de "+alvo+"?",
    porque:"O contrário de "+alvo+" é "+certo+".",
    ops:ops(certo,[certo].concat(outros)),cols:3};
}},
{tag:"Palavras parecidas",area:"leitura",fn:function(nv){
  var par=pick(PARECIDOS);
  var outros=pickN(PARECIDOS.filter(function(x){return x[0]!==par[0];}),2).map(function(x){return x[1];});
  return {txt:"Qual quer dizer quase a mesma coisa que "+par[0].toUpperCase()+"?",
    fala:"Qual quer dizer quase a mesma coisa que "+par[0]+"?",
    porque:par[0]+" e "+par[1]+" querem dizer quase a mesma coisa.",
    ops:ops(par[1],[par[1]].concat(outros)),cols:3};
}},
{tag:"Singular e plural",area:"leitura",fn:function(nv){
  var w=pick(palavras(nv));
  var plural=/[rz]$/.test(w.p)?(w.p+"es"):(/l$/.test(w.p)?w.p.slice(0,-1)+"is":(/m$/.test(w.p)?w.p.slice(0,-1)+"ns":w.p+"s"));
  return {txt:"Como fica MUITOS "+w.p.toUpperCase()+"?",fala:"Como fica no plural: muitos "+w.p+"?",
    porque:"Um "+w.p+", muitos "+plural+".",
    fig:w.e,figGrande:true,ops:ops(plural,[plural,w.p+"is",w.p]),cols:3};
}},
{tag:"Menino e menina",area:"leitura",fn:function(nv){
  var par=pick(GENERO), inv=Math.random()<0.5;
  var alvo=inv?par[1]:par[0], certo=inv?par[0]:par[1];
  var rot=inv?"MENINO":"MENINA";
  var outros=pickN(GENERO.filter(function(x){return x[0]!==par[0];}),2).map(function(x){return inv?x[0]:x[1];});
  return {txt:"Se "+alvo.toUpperCase()+" é assim, como fica no "+rot+"?",
    fala:"Se é "+alvo+", como fica no "+(inv?"masculino":"feminino")+"?",
    porque:alvo+" → "+certo+".",
    ops:ops(certo,[certo].concat(outros)),cols:3};
}},
{tag:"Ordem alfabética",area:"leitura",fn:function(nv){
  var n=nv<=1?2:3;
  var ws=pickN(palavras(nv),n).map(function(x){return x.p;});
  while(new Set(ws.map(function(w){return w[0];})).size<ws.length){ ws=pickN(palavras(nv),n).map(function(x){return x.p;}); }
  var certo=ws.slice().sort(function(a,b){return a.localeCompare(b,"pt");})[0];
  return {txt:"Qual vem PRIMEIRO no alfabeto?",fala:"Qual destas palavras vem primeiro no alfabeto?",
    porque:certo.toUpperCase()+" começa com "+certo[0].toUpperCase()+", que vem antes no alfabeto.",
    ops:shuffle(ws.map(function(w){return {t:w,ok:w===certo};})),cols:3};
}},
{tag:"Vogais",area:"leitura",fn:function(nv){
  var w=pick(palavras(nv));
  var semAcento=w.p.normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase();
  var n=semAcento.split("").filter(function(c){return VOGAIS.indexOf(c)>=0;}).length;
  return {txt:"Quantas vogais tem "+w.p.toUpperCase()+"?",fala:"Quantas vogais tem "+w.p+"? As vogais são a, e, i, o, u.",
    porque:"As vogais de "+w.p.toUpperCase()+" são "+semAcento.split("").filter(function(c){return VOGAIS.indexOf(c)>=0;}).join(", ")+".",
    fig:w.e,figGrande:true,ops:opsNum(n,function(){return rnd(1,6);}),cols:3};
}}
];

/* =========================================================
   MATEMÁTICA
   ========================================================= */
function relogio(hora,min){
  var ah=(hora%12)*30+(min/60)*30, am=(min/60)*360, r=52;
  function pt(ang,len){var a=(ang-90)*Math.PI/180;return [60+Math.cos(a)*len, 60+Math.sin(a)*len];}
  var ticks="",i,p1,p2;
  for(i=0;i<12;i++){p1=pt(i*30,r-6);p2=pt(i*30,r-1);
    ticks+='<line x1="'+p1[0].toFixed(1)+'" y1="'+p1[1].toFixed(1)+'" x2="'+p2[0].toFixed(1)+'" y2="'+p2[1].toFixed(1)+'" stroke="currentColor" stroke-width="'+(i%3===0?3:1.5)+'" stroke-linecap="round"/>';}
  var ph=pt(ah,28), pm=pt(am,42);
  return '<svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label="relógio">'+
   '<circle cx="60" cy="60" r="'+r+'" fill="none" stroke="currentColor" stroke-width="3" opacity=".35"/>'+ticks+
   '<line x1="60" y1="60" x2="'+ph[0].toFixed(1)+'" y2="'+ph[1].toFixed(1)+'" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>'+
   '<line x1="60" y1="60" x2="'+pm[0].toFixed(1)+'" y2="'+pm[1].toFixed(1)+'" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>'+
   '<circle cx="60" cy="60" r="4" fill="currentColor"/></svg>';
}
var EMOJI_CONTA=["🍎","⭐","🐟","🚗","🌻","🧦","🍌","⚽","🎈","🐝","🍓","🐞","🧁","🔵","🟢","🐣"];
var MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
var SEMANA=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];

var MAT=[
{tag:"Contar",area:"mat",fn:function(nv){
  var n=nv<=1?rnd(3,9):(nv===2?rnd(8,15):rnd(14,24)), e=pick(EMOJI_CONTA);
  return {txt:"Quantos você vê aqui?",fala:"Quantos você vê aqui?",porque:"São "+n+".",
    fig:new Array(n+1).join(e+" "),ops:opsNum(n,function(){return n+rnd(-3,3);}),cols:3};
}},
{tag:"Soma",area:"mat",fn:function(nv){
  var a,b;
  if(nv<=1){a=rnd(1,5);b=rnd(1,5);} else if(nv===2){a=rnd(3,9);b=rnd(3,9);} else {a=rnd(10,29);b=rnd(5,19);}
  /* no nível 3 ela digita: escolher entre 3 números deixa acertar no chute */
  if(nv>=3) return digitar({t:"Quanto é?",fala:a+" mais "+b,conta:a+" + "+b+" = ?",
    r:a+b,p:a+" + "+b+" = "+(a+b)+"."});
  var q={txt:"Quanto é?",fala:a+" mais "+b,conta:a+" + "+b+" = ?",porque:a+" + "+b+" = "+(a+b)+".",
    ops:opsNum(a+b,function(){return a+b+rnd(-4,4);}),cols:3};
  q.fig=new Array(a+1).join("🔵 ")+" + "+new Array(b+1).join("🟢 ");
  return q;
}},
{tag:"Subtração",area:"mat",fn:function(nv){
  var a,b;
  if(nv<=1){a=rnd(3,9);b=rnd(1,a-1);} else if(nv===2){a=rnd(8,18);b=rnd(2,8);} else {a=rnd(20,49);b=rnd(5,19);}
  if(nv>=3) return digitar({t:"Quanto é?",fala:a+" menos "+b,conta:a+" − "+b+" = ?",
    r:a-b,p:a+" − "+b+" = "+(a-b)+"."});
  var q={txt:"Quanto é?",fala:a+" menos "+b,conta:a+" − "+b+" = ?",porque:a+" − "+b+" = "+(a-b)+".",
    ops:opsNum(a-b,function(){return a-b+rnd(-4,4);}),cols:3};
  if(nv<=1) q.fig=new Array(a+1).join("🔵 ");
  return q;
}},
{tag:"Quanto falta",area:"mat",fn:function(nv){
  var tot=nv<=1?rnd(5,10):(nv===2?rnd(10,20):rnd(20,50));
  var tem=rnd(1,tot-1), falta=tot-tem;
  if(nv>=3) return digitar({t:"Quanto falta para chegar em "+tot+"?",fala:tem+" mais quanto dá "+tot+"?",
    conta:tem+" + ? = "+tot, r:falta, p:tem+" + "+falta+" = "+tot+"."});
  return {txt:"Quanto falta para chegar em "+tot+"?",fala:tem+" mais quanto dá "+tot+"?",
    conta:tem+" + ? = "+tot, porque:tem+" + "+falta+" = "+tot+".",
    ops:opsNum(falta,function(){return falta+rnd(-4,4);}),cols:3};
}},
{tag:"Sequência",area:"mat",fn:function(nv){
  var passo=nv<=1?1:(nv===2?pick([2,5,10]):pick([3,4,25])), ini=passo*rnd(1,4);
  var seq=[ini,ini+passo,ini+passo*2], certo=ini+passo*3;
  return {txt:"Qual número vem depois?",fala:"Qual número vem depois de "+seq.join(", ")+"?",
    porque:"A cada passo soma "+passo+". Depois de "+seq[2]+" vem "+certo+".",
    conta:seq.join(", ")+", ?",ops:ops(String(certo),[String(certo),String(certo+passo),String(certo-1)]),cols:3};
}},
{tag:"Maior e menor",area:"mat",fn:function(nv){
  var lim=nv<=1?9:(nv===2?99:999);
  var a=rnd(2,lim), b=rnd(2,lim); while(b===a)b=rnd(2,lim);
  var maior=Math.random()<0.5, certo=maior?Math.max(a,b):Math.min(a,b);
  return {txt:"Qual número é "+(maior?"o MAIOR":"o MENOR")+"?",fala:"Qual número é "+(maior?"o maior":"o menor")+"?",
    porque:certo+" é "+(maior?"maior":"menor")+" que "+(certo===a?b:a)+".",
    ops:shuffle([{t:String(a),ok:a===certo},{t:String(b),ok:b===certo}]),cols:2};
}},
{tag:"Ordenar números",area:"mat",fn:function(nv){
  var lim=nv<=1?20:(nv===2?100:999), set=[];
  while(set.length<3){ var n=rnd(1,lim); if(set.indexOf(n)<0) set.push(n); }
  var maior=Math.random()<0.5, certo=maior?Math.max.apply(null,set):Math.min.apply(null,set);
  return {txt:"Qual é "+(maior?"o MAIOR":"o MENOR")+" de todos?",fala:"Qual é "+(maior?"o maior":"o menor")+" de todos?",
    porque:"Em ordem: "+set.slice().sort(function(a,b){return a-b;}).join(" < ")+".",
    ops:shuffle(set.map(function(n){return {t:String(n),ok:n===certo};})),cols:3};
}},
{tag:"Dobro e metade",area:"mat",fn:function(nv){
  var dobro=Math.random()<0.5, teto=nv<=1?5:(nv===2?10:20);
  var n=dobro?rnd(2,teto):rnd(1,teto)*2, certo=dobro?n*2:n/2;
  return {txt:(dobro?"O dobro de ":"A metade de ")+n+" é quanto?",fala:(dobro?"O dobro de ":"A metade de ")+n+" é quanto?",
    porque:dobro?(n+" + "+n+" = "+certo+"."):(certo+" + "+certo+" = "+n+", então a metade de "+n+" é "+certo+"."),
    ops:opsNum(certo,function(){return certo+rnd(-4,4);}),cols:3};
}},
{tag:"Par ou ímpar",area:"mat",fn:function(nv){
  var lim=nv<=1?10:(nv===2?30:100), n=rnd(1,lim), par=(n%2===0);
  return {txt:"O número "+n+" é par ou ímpar?",fala:"O número "+n+" é par ou ímpar?",
    porque:par?(n+" dá para dividir em duas partes iguais, então é par."):(n+" sobra um, então é ímpar."),
    fig:new Array(Math.min(n,12)+1).join("🔵 "),
    ops:shuffle([{t:"par",ok:par},{t:"ímpar",ok:!par}]),cols:2};
}},
{tag:"Dezena e unidade",area:"mat",fn:function(nv){
  var n=nv<=1?rnd(11,29):(nv===2?rnd(20,99):rnd(100,499));
  var perguntaDezena=Math.random()<0.5;
  if(n<100){
    var d=Math.floor(n/10), u=n%10, certo=perguntaDezena?d:u;
    return {txt:"No número "+n+", quantas "+(perguntaDezena?"DEZENAS":"UNIDADES")+" tem?",
      fala:"No número "+n+", quantas "+(perguntaDezena?"dezenas":"unidades")+" tem?",
      porque:n+" tem "+d+" dezena"+(d>1?"s":"")+" e "+u+" unidade"+(u!==1?"s":"")+".",
      ops:opsNum(certo,function(){return rnd(0,9);}),cols:3};
  }
  var c=Math.floor(n/100);
  return {txt:"No número "+n+", quantas CENTENAS tem?",fala:"No número "+n+", quantas centenas tem?",
    porque:n+" tem "+c+" centena"+(c>1?"s":"")+".",
    ops:opsNum(c,function(){return rnd(0,9);}),cols:3};
}},
{tag:"Antes e depois",area:"mat",fn:function(nv){
  var lim=nv<=1?20:(nv===2?99:499);
  var n=rnd(3,lim), antes=Math.random()<0.5, certo=antes?n-1:n+1;
  return {txt:"Qual número vem "+(antes?"ANTES":"DEPOIS")+" do "+n+"?",fala:"Qual número vem "+(antes?"antes":"depois")+" do "+n+"?",
    porque:(n-1)+", "+n+", "+(n+1)+" — "+(antes?"antes":"depois")+" do "+n+" vem "+certo+".",
    ops:opsNum(certo,function(){return certo+rnd(-5,5);}),cols:3};
}},
{tag:"Tabuada",area:"mat",fn:function(nv){
  var a=nv<=1?pick([2,10]):(nv===2?pick([2,3,5,10]):pick([2,3,4,5,6,10]));
  var b=nv<=1?rnd(1,5):rnd(1,10), r=a*b;
  if(nv>=3) return digitar({t:"Quanto é?",fala:a+" vezes "+b,conta:a+" × "+b+" = ?",
    r:r, p:a+" × "+b+" é somar "+a+" "+b+" vezes: "+r+"."});
  return {txt:"Quanto é?",fala:a+" vezes "+b,conta:a+" × "+b+" = ?",
    porque:a+" × "+b+" é somar "+a+" "+b+" vezes: "+r+".",
    ops:opsNum(r,function(){return r+a*rnd(-2,2);}),cols:3};
}},
{tag:"Probleminha",area:"mat",fn:function(nv){
  var f=nv<=1?1:(nv===2?2:4);
  var mods=[
    function(){var a=rnd(3,6)*f,b=rnd(2,5)*f;return {t:"Eu tinha "+a+" bolinhas de gude e ganhei mais "+b+". Com quantas eu fiquei?",r:a+b,p:a+" + "+b+" = "+(a+b)+"."};},
    function(){var a=rnd(5,9)*f,b=rnd(2,4)*f;return {t:"Tinha "+a+" balas no pote e comi "+b+". Quantas sobraram?",r:a-b,p:a+" − "+b+" = "+(a-b)+"."};},
    function(){var a=rnd(3,7)*f,b=rnd(2,5)*f;return {t:"Tinha "+a+" crianças no parque e chegaram mais "+b+". Quantas são agora?",r:a+b,p:a+" + "+b+" = "+(a+b)+"."};},
    function(){var a=rnd(6,10)*f,b=rnd(2,5)*f;return {t:"Eu tinha "+a+" reais e gastei "+b+". Quanto sobrou?",r:a-b,p:a+" − "+b+" = "+(a-b)+"."};},
    function(){var a=rnd(2,5),c=(nv>=3?3:2);return {t:"Cada caixa tem "+a+" lápis. Quantos lápis tem em "+c+" caixas?",r:a*c,p:a+" + "+a+(c>2?" + "+a:"")+" = "+(a*c)+"."};},
    function(){var a=rnd(4,9)*f,b=rnd(1,3)*f;return {t:"Na estante tinha "+a+" livros. Peguei "+b+" emprestados. Quantos ficaram na estante?",r:a-b,p:a+" − "+b+" = "+(a-b)+"."};},
    function(){var a=rnd(2,6)*f,b=rnd(2,6)*f;return {t:"Juntei "+a+" figurinhas de bicho com "+b+" de carro. Quantas figurinhas tenho?",r:a+b,p:a+" + "+b+" = "+(a+b)+"."};},
    function(){var a=rnd(3,8)*f;return {t:"Tem "+a+" passarinhos no fio e chegou mais 1. Quantos passarinhos são?",r:a+1,p:a+" + 1 = "+(a+1)+"."};}
  ];
  if(nv>=3) mods.push(
    function(){var a=rnd(10,20),b=rnd(3,8),c=rnd(2,5);
      return {t:"Tinha "+a+" figurinhas, ganhei "+b+" e dei "+c+" para um amigo. Com quantas fiquei?",r:a+b-c,p:a+" + "+b+" = "+(a+b)+", menos "+c+" dá "+(a+b-c)+"."};},
    function(){var a=rnd(3,6),b=rnd(3,6);
      return {t:"Numa caixa de ovos cabem "+a+" ovos por fileira, e são "+b+" fileiras. Quantos ovos cabem?",r:a*b,p:a+" × "+b+" = "+(a*b)+"."};},
    function(){var p=rnd(2,5),t=p*rnd(2,5);
      return {t:"Vou dividir "+t+" balas igualmente entre "+p+" amigos. Quantas balas cada um ganha?",r:t/p,p:t+" dividido por "+p+" dá "+(t/p)+" para cada um."};}
  );
  var m=pick(mods)();
  return {txt:m.t,fala:m.t,porque:m.p,ops:opsNum(m.r,function(){return m.r+rnd(-6,6);}),cols:3};
}},
{tag:"Ver as horas",area:"mat",fn:function(nv){
  var h=rnd(1,12), min;
  if(nv<=1) min=0;
  else if(nv===2) min=pick([0,0,30]);
  else min=pick([0,15,30,45]);
  var nomes={0:" horas",15:" e quinze",30:" e meia",45:" e quarenta e cinco"};
  var certo=h+nomes[min], set=[certo];
  var g=0;
  while(set.length<3&&g++<200){
    var h2=rnd(1,12), m2=nv<=1?0:(nv===2?pick([0,30]):pick([0,15,30,45]));
    var t=h2+nomes[m2]; if(set.indexOf(t)<0)set.push(t);
  }
  return {txt:"Que horas o relógio está mostrando?",fala:"Que horas o relógio está mostrando?",
    porque:"O ponteiro pequeno mostra a hora e o grande mostra os minutos: "+certo+".",
    svg:relogio(h,min),ops:ops(certo,set),cols:3};
}},
{tag:"Calendário",area:"mat",fn:function(nv){
  var mods=[
    function(){var i=rnd(0,6), certo=SEMANA[(i+1)%7];
      return {t:"Que dia vem depois de "+SEMANA[i]+"?",r:certo,d:pickN(SEMANA.filter(function(x){return x!==certo&&x!==SEMANA[i];}),2),
        p:"Depois de "+SEMANA[i]+" vem "+certo+"."};},
    function(){var i=rnd(0,6), certo=SEMANA[(i+6)%7];
      return {t:"Que dia vem antes de "+SEMANA[i]+"?",r:certo,d:pickN(SEMANA.filter(function(x){return x!==certo&&x!==SEMANA[i];}),2),
        p:"Antes de "+SEMANA[i]+" vem "+certo+"."};},
    function(){return {t:"Quantos dias tem uma semana?",r:"7",d:["5","12"],p:"A semana tem 7 dias, de domingo a sábado."};},
    function(){return {t:"Quantos meses tem um ano?",r:"12",d:["7","30"],p:"O ano tem 12 meses, de janeiro a dezembro."};},
    function(){return {t:"Qual é o primeiro mês do ano?",r:"janeiro",d:["dezembro","junho"],p:"O ano começa em janeiro e termina em dezembro."};},
    function(){return {t:"Qual é o último mês do ano?",r:"dezembro",d:["janeiro","novembro"],p:"O ano termina em dezembro."};},
    function(){return {t:"Quantos dias tem o fim de semana?",r:"2",d:["1","5"],p:"Sábado e domingo: 2 dias."};}
  ];
  if(nv>=2) mods.push(function(){
    var i=rnd(0,10), certo=MESES[i+1];
    return {t:"Qual mês vem depois de "+MESES[i]+"?",r:certo,d:pickN(MESES.filter(function(x){return x!==certo&&x!==MESES[i];}),2),
      p:"Depois de "+MESES[i]+" vem "+certo+"."};});
  if(nv>=3) mods.push(
    function(){return {t:"Quantos dias tem o mês de fevereiro (ano normal)?",r:"28",d:["30","31"],p:"Fevereiro tem 28 dias, e 29 no ano bissexto."};},
    function(){var i=rnd(0,11); var n=[31,28,31,30,31,30,31,31,30,31,30,31][i];
      return {t:"Quantos dias tem "+MESES[i]+"?",r:String(n),d:shuffle([28,30,31].filter(function(x){return x!==n;})).slice(0,2).map(String),
        p:MESES[i]+" tem "+n+" dias."};}
  );
  var m=pick(mods)();
  return {txt:m.t,fala:m.t,porque:m.p,fig:"📅",figGrande:true,
    ops:shuffle([{t:m.r,ok:true}].concat(m.d.map(function(x){return {t:x,ok:false};}))),cols:3};
}},
{tag:"Dinheiro",area:"mat",fn:function(nv){
  var valores=nv<=1?[1,2]:(nv===2?[1,2,5]:[1,2,5,10,25]);
  var n=nv<=1?rnd(2,4):(nv===2?rnd(3,5):rnd(4,6));
  var moedas=[],i; for(i=0;i<n;i++) moedas.push(pick(valores));
  var tot=moedas.reduce(function(s,x){return s+x;},0);
  return {txt:"Quanto dinheiro tem aqui, no total?",fala:"Quanto dinheiro tem aqui no total?",
    porque:moedas.join(" + ")+" = "+tot+" reais.",
    fig:moedas.map(function(m){return "🪙"+m;}).join("  "),
    ops:opsNum(tot,function(){return tot+rnd(-6,6);}),cols:3};
}},
{tag:"Formas",area:"mat",fn:function(nv){
  var formas=[{n:"círculo",e:"⭕",l:0},{n:"quadrado",e:"🟦",l:4},{n:"triângulo",e:"🔺",l:3},
    {n:"retângulo",e:"▬",l:4},{n:"estrela",e:"⭐",l:5},{n:"losango",e:"🔷",l:4},{n:"coração",e:"❤️",l:0}];
  var f=pick(formas);
  if(nv>=3&&f.l>0){
    return {txt:"Quantos lados tem esta forma?",fala:"Quantos lados tem esta forma?",fig:f.e,figGrande:true,
      porque:"O "+f.n+" tem "+f.l+" lados.",
      ops:opsNum(f.l,function(){return rnd(0,6);}),cols:3};
  }
  var outras=pickN(formas.filter(function(x){return x.n!==f.n;}),2);
  return {txt:"Que forma é esta?",fala:"Que forma é esta?",fig:f.e,figGrande:true,
    porque:"Esta forma é o "+f.n+".",
    ops:shuffle([{t:f.n,ok:true}].concat(outras.map(function(x){return {t:x.n,ok:false};}))),cols:3};
}},
{tag:"Medidas",area:"mat",fn:function(nv){
  var mods=[
    {t:"O que a gente usa para medir o tempo?",r:"🕐",d:["📏","⚖️"],emoji:true,p:"O relógio mede o tempo."},
    {t:"O que a gente usa para medir quanto uma coisa pesa?",r:"⚖️",d:["📏","🕐"],emoji:true,p:"A balança mede o peso."},
    {t:"O que a gente usa para medir o comprimento?",r:"📏",d:["⚖️","🕐"],emoji:true,p:"A régua e a fita métrica medem comprimento."},
    {t:"O que a gente usa para medir se está quente ou frio?",r:"🌡️",d:["📏","🪙"],emoji:true,p:"O termômetro mede a temperatura."},
    {t:"O que é mais pesado: 1 quilo de algodão ou 1 quilo de pedra?",r:"os dois pesam igual",d:["a pedra","o algodão"],p:"1 quilo é sempre 1 quilo, não importa a coisa."},
    {t:"Uma criança do 1º ano mede mais ou menos quanto?",r:"1 metro e 20",d:["10 metros","10 centímetros"],p:"Mais ou menos 1 metro e 20 centímetros."},
    {t:"O que é mais comprido: um lápis ou um ônibus?",r:"o ônibus",d:["o lápis","os dois iguais"],p:"O ônibus é muito mais comprido."},
    {t:"Quanto tempo tem 1 hora?",r:"60 minutos",d:["10 minutos","100 minutos"],p:"Uma hora tem 60 minutos."},
    {t:"Quanto tempo tem 1 minuto?",r:"60 segundos",d:["10 segundos","30 segundos"],p:"Um minuto tem 60 segundos."}
  ];
  var m=pick(mods);
  return {txt:m.t,fala:m.t,porque:m.p,
    ops:shuffle([{t:m.r,ok:true}].concat(m.d.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:!!m.emoji};
}}
];

/* =========================================================
   RACIOCÍNIO E ATENÇÃO
   ========================================================= */
var POOL=["🍎","⚽","🐶","🚗","⭐","🌻","🐟","🧦","🎈","🍌","🔑","🪁","🧩","🎩","🦋","🍕","🐝","🧁","🚲","🎸"];
var GRUPOS=[
 {c:"animais",itens:["🐶","🐱","🐴","🐮","🐷","🐰","🐯","🐸"],fora:["🚗","🍎","👟","🌳","🪑","📚"]},
 {c:"frutas",itens:["🍎","🍌","🍇","🍉","🍓","🍐","🍊","🍍"],fora:["🐸","🚲","🧦","⚽","🔑","🪑"]},
 {c:"transportes",itens:["🚗","🚌","✈️","🚲","🚂","🚁","⛵","🛵"],fora:["🍕","🐦","🪑","🌻","👕","🧀"]},
 {c:"roupas",itens:["👕","👖","🧦","🧢","👗","🧥","👞","🧣"],fora:["🍰","🐟","🚀","🔑","🌙","🪥"]},
 {c:"comidas",itens:["🍕","🍞","🍰","🧀","🍔","🥗","🍿","🍦"],fora:["🐝","🚗","📚","⭐","🧦","🪁"]},
 {c:"coisas da escola",itens:["✏️","📚","🎒","✂️","📐","🖍️","📓","🖊️"],fora:["🐄","🍉","🚿","⛰️","🎸","🛏️"]},
 {c:"coisas do banheiro",itens:["🪥","🧼","🚿","🧻","🛁","🪣"],fora:["🍔","🚂","🦁","🎺","⚽","📚"]},
 {c:"instrumentos de música",itens:["🎸","🥁","🎻","🎺","🎹","🪇"],fora:["🍇","🚕","🧦","🐢","🪑","🕯️"]},
 {c:"coisas do céu",itens:["☀️","🌙","⭐","☁️","🌈","🌧️"],fora:["🐟","🪑","🍉","👟","🔨","🧦"]}
];

var RACIO=[
{tag:"Padrão",area:"racio",fn:function(nv){
  var seq,certo,erradas;
  if(nv<=1){var p=pickN(POOL,2);seq=[p[0],p[1],p[0],p[1],p[0]];certo=p[1];erradas=[p[0],pick(POOL.filter(function(x){return p.indexOf(x)<0;}))];}
  else if(nv===2){var t=pickN(POOL,3);seq=[t[0],t[1],t[2],t[0],t[1]];certo=t[2];erradas=[t[0],t[1]];}
  else {var q=pickN(POOL,2);seq=[q[0],q[1],q[1],q[0],q[1],q[1]];certo=q[0];erradas=[q[1],pick(POOL.filter(function(x){return q.indexOf(x)<0;}))];}
  return {txt:"O que vem agora?",fala:"Olhe bem a sequência. O que vem agora?",
    porque:"A sequência se repete sempre igual, então vem "+certo+".",
    fig:seq.join(" ")+" ❓",ops:shuffle([{t:certo,ok:true}].concat(erradas.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:true};
}},
{tag:"Achar o intruso",area:"racio",fn:function(nv){
  var g=pick(GRUPOS), n=nv<=1?3:(nv===2?4:5);
  var itens=pickN(g.itens,Math.min(n,g.itens.length)), fora=pick(g.fora);
  return {txt:"Qual não é do grupo das "+g.c+"?",fala:"Qual não é do grupo das "+g.c+"?",
    porque:fora+" não faz parte do grupo das "+g.c+".",
    ops:shuffle(itens.map(function(x){return {t:x,ok:false};}).concat([{t:fora,ok:true}])),cols:nv<=1?2:3,emoji:true};
}},
{tag:"Classificar",area:"racio",fn:function(nv){
  var g=pick(GRUPOS), item=pick(g.itens);
  var outros=pickN(GRUPOS.filter(function(x){return x.c!==g.c;}),2).map(function(x){return x.c;});
  return {txt:"O "+item+" faz parte de qual grupo?",fala:"Esta figura faz parte de qual grupo?",
    fig:item,figGrande:true,porque:item+" é do grupo das "+g.c+".",
    ops:shuffle([{t:g.c,ok:true}].concat(outros.map(function(x){return {t:x,ok:false};}))),cols:3};
}},
{tag:"Memória",area:"racio",fn:function(nv){
  var n=nv<=1?4:(nv===2?5:7), seg=nv<=1?6:(nv===2?5:4);
  var itens=pickN(POOL,n), sumido=pick(itens);
  var resto=itens.filter(function(x){return x!==sumido;});
  return {txt:"Qual figura sumiu?",fala:"Qual figura sumiu?",fig:resto.join(" "),
    porque:"A figura que sumiu foi "+sumido+".",
    ops:shuffle([{t:sumido,ok:true}].concat(pickN(resto,2).map(function(x){return {t:x,ok:false};}))),cols:3,emoji:true,
    preview:{txt:"Olhe bem e guarde na cabeça!",fig:itens.join(" "),seg:seg}};
}},
{tag:"Atenção",area:"racio",fn:function(nv){
  var alvo=pick(POOL), n=nv<=1?rnd(3,6):(nv===2?rnd(5,9):rnd(7,13));
  var mist=[],i; for(i=0;i<n;i++)mist.push(alvo);
  var outros=POOL.filter(function(x){return x!==alvo;});
  var ruido=nv<=1?rnd(3,6):(nv===2?rnd(6,10):rnd(10,16));
  for(i=0;i<ruido;i++)mist.push(pick(outros));
  return {txt:"Quantos "+alvo+" tem aqui?",fala:"Conte com cuidado quantas figuras iguais à da pergunta tem aqui.",
    porque:"São "+n+" figuras "+alvo+". Uma dica: aponte com o dedo enquanto conta.",
    fig:shuffle(mist).join(" "),ops:opsNum(n,function(){return n+rnd(-3,3);}),cols:3};
}},
{tag:"Ordem dos fatos",area:"racio",fn:function(nv){
  var casos=[
    {a:"🥚",b:"🐣",t:"O que acontece primeiro?",p:"Primeiro vem o ovo, depois o pintinho nasce."},
    {a:"🌱",b:"🌳",t:"O que acontece primeiro?",p:"Primeiro o broto, depois a árvore grande."},
    {a:"🌧️",b:"🌈",t:"O que acontece primeiro?",p:"O arco-íris aparece depois da chuva."},
    {a:"🥣",b:"🎂",t:"O que vem primeiro quando fazemos um bolo?",p:"Primeiro a massa na tigela, depois o bolo pronto."},
    {a:"👶",b:"🧒",t:"O que acontece primeiro?",p:"Primeiro o bebê, depois a criança."},
    {a:"🌰",b:"🌻",t:"O que acontece primeiro?",p:"Primeiro a semente, depois a flor."},
    {a:"🐛",b:"🦋",t:"O que acontece primeiro?",p:"Primeiro a lagarta, depois vira borboleta."},
    {a:"🧼",b:"✨",t:"O que vem primeiro para ficar limpo?",p:"Primeiro lava com sabão, depois fica brilhando."},
    {a:"🌅",b:"🌙",t:"O que acontece primeiro no dia?",p:"Primeiro o sol nasce, depois vem a noite."},
    {a:"🛒",b:"🍲",t:"O que vem primeiro para fazer o almoço?",p:"Primeiro compra a comida, depois cozinha."},
    {a:"✏️",b:"📖",t:"O que vem primeiro para escrever um livro?",p:"Primeiro escreve, depois o livro fica pronto."},
    {a:"🪙",b:"🍦",t:"O que vem primeiro para comprar um sorvete?",p:"Primeiro o dinheiro, depois o sorvete."}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,porque:c.p,ops:shuffle([{t:c.a,ok:true},{t:c.b,ok:false}]),cols:2,emoji:true};
}},
{tag:"Comparar",area:"racio",fn:function(nv){
  var casos=[
    {ops:["🐘","🐭","🐈"],ok:"🐘",t:"Qual é o maior de verdade?",p:"O elefante é o maior animal dos três."},
    {ops:["🐜","🐕","🦒"],ok:"🦒",t:"Qual é o maior de verdade?",p:"A girafa é o animal mais alto."},
    {ops:["🚲","🚌","🛴"],ok:"🚌",t:"Qual é o maior de verdade?",p:"O ônibus é bem maior que a bicicleta."},
    {ops:["🐋","🐟","🦐"],ok:"🦐",t:"Qual é o menor de verdade?",p:"O camarão é o menor dos três."},
    {ops:["🏠","⛰️","🌳"],ok:"⛰️",t:"Qual é o maior de verdade?",p:"A montanha é muito maior que a casa."},
    {ops:["🪶","🪨","🎈"],ok:"🪨",t:"Qual é o mais pesado?",p:"A pedra é a mais pesada."},
    {ops:["🐜","🐝","🦋"],ok:"🐜",t:"Qual é o menor de verdade?",p:"A formiga é a menor."},
    {ops:["🚗","✈️","🚀"],ok:"🚀",t:"Qual vai mais rápido?",p:"O foguete é o mais rápido de todos."},
    {ops:["🐢","🐆","🐌"],ok:"🐌",t:"Qual anda mais devagar?",p:"O caracol é o mais devagar."},
    {ops:["🧊","☀️","🔥"],ok:"🧊",t:"Qual é o mais gelado?",p:"O gelo é o mais gelado."},
    {ops:["🌳","🌱","🍂"],ok:"🌱",t:"Qual é o mais novo?",p:"O broto acabou de nascer."},
    {ops:["🥜","🍉","🍇"],ok:"🍉",t:"Qual é o maior de verdade?",p:"A melancia é a maior fruta das três."}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,porque:c.p,ops:shuffle(c.ops.map(function(x){return {t:x,ok:x===c.ok};})),cols:3,emoji:true};
}},
{tag:"Associar",area:"racio",fn:function(nv){
  var pares=[
    {a:"🧤",b:"✋",t:"A luva vai na...",p:"A luva veste a mão."},
    {a:"👟",b:"🦶",t:"O sapato vai no...",p:"O sapato veste o pé."},
    {a:"🔑",b:"🚪",t:"A chave abre a...",p:"A chave abre a porta."},
    {a:"🪥",b:"🦷",t:"A escova limpa o...",p:"A escova limpa os dentes."},
    {a:"✏️",b:"📓",t:"O lápis escreve no...",p:"O lápis escreve no caderno."},
    {a:"🍽️",b:"🍴",t:"O prato combina com o...",p:"Prato e garfo vão juntos à mesa."},
    {a:"☂️",b:"🌧️",t:"O guarda-chuva serve para a...",p:"O guarda-chuva protege da chuva."},
    {a:"🧦",b:"🦶",t:"A meia vai no...",p:"A meia veste o pé."},
    {a:"🕶️",b:"☀️",t:"O óculos escuro serve para o...",p:"O óculos escuro protege do sol."},
    {a:"🐝",b:"🍯",t:"A abelha faz o...",p:"A abelha produz mel."},
    {a:"🐄",b:"🥛",t:"A vaca dá o...",p:"A vaca dá leite."},
    {a:"🐔",b:"🥚",t:"A galinha põe o...",p:"A galinha põe ovos."},
    {a:"✂️",b:"📄",t:"A tesoura corta o...",p:"A tesoura corta papel."},
    {a:"🔨",b:"🔩",t:"O martelo bate no...",p:"O martelo bate no prego."}
  ];
  var alvo=pick(pares);
  /* dedupe por resposta: pares diferentes podem apontar para a mesma figura (pé, por exemplo) */
  var vistos={}, candidatos=[];
  shuffle(pares).forEach(function(x){
    if(x.b===alvo.b || vistos[x.b]) return;
    vistos[x.b]=1; candidatos.push(x.b);
  });
  var outros=candidatos.slice(0,2);
  return {txt:alvo.t,fala:alvo.t,fig:alvo.a,figGrande:true,porque:alvo.p,
    ops:shuffle([{t:alvo.b,ok:true}].concat(outros.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:true};
}},
{tag:"Onde está",area:"racio",fn:function(nv){
  var casos=[
    {t:"O gato está DENTRO ou FORA da caixa?  📦🐱📦",r:"dentro",d:["fora","em cima"],p:"O gato está entre as caixas, dentro."},
    {t:"Se o 🐶 está na FRENTE e o 🐱 atrás, quem vem primeiro?",r:"🐶",d:["🐱"],emoji:true,cols:2,p:"Quem está na frente vem primeiro."},
    {t:"Você está no meio da fila. Tem gente na frente e atrás?",r:"sim, dos dois lados",d:["só na frente","só atrás"],p:"No meio significa gente nos dois lados."},
    {t:"O livro está EM CIMA da mesa. Onde está a mesa?",r:"embaixo do livro",d:["em cima do livro","dentro do livro"],p:"Se o livro está em cima, a mesa está embaixo."},
    {t:"Levanta a mão DIREITA. Ela fica do mesmo lado que o pé...",r:"direito",d:["esquerdo","dos dois"],p:"Mão direita e pé direito ficam do mesmo lado."},
    {t:"O sol está ACIMA ou ABAIXO das nuvens quando chove?",r:"acima",d:["abaixo","do lado"],p:"O sol fica sempre acima das nuvens."},
    {t:"A raiz da árvore fica onde?",r:"embaixo da terra",d:["no alto da árvore","no céu"],p:"A raiz cresce para baixo, embaixo da terra."},
    {t:"Numa escada, para chegar no último degrau você...",r:"sobe",d:["desce","fica parado"],p:"O último degrau é o mais alto: precisa subir."}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,porque:c.p,cols:c.cols||3,emoji:!!c.emoji,
    ops:shuffle([{t:c.r,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};})))};
}},
{tag:"Lógica",area:"racio",fn:function(nv){
  var base=[
    {t:"Todo peixe vive na água. O dourado é um peixe. Então o dourado vive...",r:"na água",d:["na árvore","no deserto"],p:"Se todo peixe vive na água e o dourado é peixe, ele vive na água."},
    {t:"Toda criança da turma tem mochila. O Téo é da turma. Então o Téo tem...",r:"mochila",d:["um cavalo","um avião"],p:"Se todos têm, o Téo também tem."},
    {t:"Se hoje é terça, ontem foi...",r:"segunda",d:["quarta","domingo"],p:"O dia de ontem vem sempre antes do de hoje."},
    {t:"A Bia é mais alta que o Léo. O Léo é mais alto que a Ana. Quem é a mais alta?",r:"a Bia",d:["o Léo","a Ana"],p:"Bia > Léo > Ana, então Bia é a mais alta."},
    {t:"Tenho mais de 3 e menos de 5 balas. Quantas balas eu tenho?",r:"4",d:["3","5"],p:"Entre 3 e 5 só existe o 4."},
    {t:"Se todo pássaro tem penas e a arara é um pássaro, a arara tem...",r:"penas",d:["escamas","pelos"],p:"Se todo pássaro tem penas, a arara também tem."},
    {t:"Choveu a noite inteira. De manhã a rua está...",r:"molhada",d:["seca","pegando fogo"],p:"Depois da chuva a rua fica molhada."},
    {t:"O João chegou ANTES da Ana, e a Ana ANTES do Téo. Quem chegou por último?",r:"o Téo",d:["a Ana","o João"],p:"João, depois Ana, depois Téo: o Téo é o último."}
  ];
  if(nv>=3) base=base.concat([
    {t:"Nem todo animal voa. O cachorro é um animal. O cachorro voa?",r:"não",d:["sim","às vezes"],p:"Só alguns animais voam; o cachorro não é um deles."},
    {t:"Se eu tenho 2 irmãs e cada irmã tem 1 boneca, quantas bonecas tem no total?",r:"2",d:["1","4"],p:"Cada uma tem 1: 1 + 1 = 2."},
    {t:"Um pote tem mais bolas que o outro. O primeiro tem 7. O segundo pode ter...",r:"5",d:["7","9"],p:"O segundo tem menos que 7, então 5 serve."}
  ]);
  var c=pick(base);
  return {txt:c.t,fala:c.t,porque:c.p,cols:3,
    ops:shuffle([{t:c.r,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};})))};
}},
{tag:"Adivinha",area:"racio",fn:function(nv){
  var casos=[
    {t:"Tem quatro patas, late e é amigo do homem. Quem é?",ok:"🐶",d:["🐦","🐟"]},
    {t:"Voa, faz mel e mora numa colmeia. Quem é?",ok:"🐝",d:["🦋","🐜"]},
    {t:"É amarelo, fica no céu e esquenta a gente. O que é?",ok:"☀️",d:["🌙","⭐"]},
    {t:"Tem folhas, dá sombra e fica plantada. O que é?",ok:"🌳",d:["🏠","🚗"]},
    {t:"Serve para escrever e vai ficando pequeno. O que é?",ok:"✏️",d:["📚","✂️"]},
    {t:"Mora na água, tem escamas e nada. Quem é?",ok:"🐟",d:["🐴","🐔"]},
    {t:"Anda devagar e carrega a casa nas costas. Quem é?",ok:"🐢",d:["🐆","🦅"]},
    {t:"Tem o pescoço mais comprido de todos os bichos. Quem é?",ok:"🦒",d:["🐘","🦁"]},
    {t:"É branquinho, cai do céu e é bem gelado. O que é?",ok:"❄️",d:["🔥","🍞"]},
    {t:"Tem muitas páginas e conta histórias. O que é?",ok:"📖",d:["🪑","🧦"]},
    {t:"Faz tic-tac e mostra as horas. O que é?",ok:"⏰",d:["🎈","🧀"]},
    {t:"Sobe no céu preso num barbante e voa com o vento. O que é?",ok:"🪁",d:["🐢","🍎"]},
    {t:"Tem tromba, é enorme e cinza. Quem é?",ok:"🐘",d:["🐭","🐤"]},
    {t:"Ilumina a noite lá no céu e muda de formato. O que é?",ok:"🌙",d:["☀️","🚗"]},
    {t:"Guarda a comida gelada na cozinha. O que é?",ok:"🧊",d:["📺","🛏️"]},
    {t:"Tem asas coloridas e antes era uma lagarta. Quem é?",ok:"🦋",d:["🐜","🐌"]}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,porque:"A resposta é "+c.ok+".",
    ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:true};
}}
];

/* =========================================================
   INGLÊS
   ========================================================= */
var EN1=[{en:"dog",pt:"cachorro",e:"🐶"},{en:"cat",pt:"gato",e:"🐱"},{en:"bird",pt:"pássaro",e:"🐦"},
 {en:"fish",pt:"peixe",e:"🐟"},{en:"apple",pt:"maçã",e:"🍎"},{en:"milk",pt:"leite",e:"🥛"},
 {en:"sun",pt:"sol",e:"☀️"},{en:"ball",pt:"bola",e:"⚽"},{en:"car",pt:"carro",e:"🚗"},
 {en:"house",pt:"casa",e:"🏠"},{en:"cake",pt:"bolo",e:"🎂"},{en:"hat",pt:"chapéu",e:"🎩"},
 {en:"egg",pt:"ovo",e:"🥚"},{en:"cow",pt:"vaca",e:"🐄"},{en:"duck",pt:"pato",e:"🦆"},
 {en:"frog",pt:"sapo",e:"🐸"},{en:"key",pt:"chave",e:"🔑"},{en:"shoe",pt:"sapato",e:"👟"}];
var EN2=[{en:"horse",pt:"cavalo",e:"🐴"},{en:"bread",pt:"pão",e:"🍞"},{en:"water",pt:"água",e:"💧"},
 {en:"book",pt:"livro",e:"📚"},{en:"pencil",pt:"lápis",e:"✏️"},{en:"chair",pt:"cadeira",e:"🪑"},
 {en:"door",pt:"porta",e:"🚪"},{en:"moon",pt:"lua",e:"🌙"},{en:"star",pt:"estrela",e:"⭐"},
 {en:"mother",pt:"mãe",e:"👩"},{en:"father",pt:"pai",e:"👨"},{en:"tree",pt:"árvore",e:"🌳"},
 {en:"table",pt:"mesa",e:"🍽️"},{en:"window",pt:"janela",e:"🪟"},{en:"flower",pt:"flor",e:"🌻"},
 {en:"cheese",pt:"queijo",e:"🧀"},{en:"monkey",pt:"macaco",e:"🐒"},{en:"bear",pt:"urso",e:"🐻"},
 {en:"clock",pt:"relógio",e:"⏰"},{en:"boat",pt:"barco",e:"⛵"},{en:"fire",pt:"fogo",e:"🔥"},
 {en:"snow",pt:"neve",e:"❄️"},{en:"cloud",pt:"nuvem",e:"☁️"},{en:"bed",pt:"cama",e:"🛏️"}];
var EN3=[{en:"butterfly",pt:"borboleta",e:"🦋"},{en:"elephant",pt:"elefante",e:"🐘"},
 {en:"kitchen",pt:"cozinha",e:"🍳"},{en:"teacher",pt:"professora",e:"👩‍🏫"},
 {en:"school",pt:"escola",e:"🏫"},{en:"friend",pt:"amigo",e:"🧑‍🤝‍🧑"},{en:"rain",pt:"chuva",e:"🌧️"},
 {en:"bicycle",pt:"bicicleta",e:"🚲"},{en:"breakfast",pt:"café da manhã",e:"🥐"},
 {en:"turtle",pt:"tartaruga",e:"🐢"},{en:"giraffe",pt:"girafa",e:"🦒"},{en:"rainbow",pt:"arco-íris",e:"🌈"},
 {en:"mountain",pt:"montanha",e:"⛰️"},{en:"forest",pt:"floresta",e:"🌲"},{en:"beach",pt:"praia",e:"🏖️"},
 {en:"airplane",pt:"avião",e:"✈️"},{en:"toothbrush",pt:"escova de dente",e:"🪥"},
 {en:"backpack",pt:"mochila",e:"🎒"},{en:"umbrella",pt:"guarda-chuva",e:"☂️"},
 {en:"birthday",pt:"aniversário",e:"🎂"},{en:"homework",pt:"lição de casa",e:"📓"}];
function vocab(nv){ return nv<=1?EN1:(nv===2?EN1.concat(EN2):EN2.concat(EN3)); }

var CORES=[{en:"red",pt:"vermelho",e:"🟥"},{en:"blue",pt:"azul",e:"🟦"},{en:"green",pt:"verde",e:"🟩"},
 {en:"yellow",pt:"amarelo",e:"🟨"},{en:"orange",pt:"laranja",e:"🟧"},{en:"purple",pt:"roxo",e:"🟪"},
 {en:"brown",pt:"marrom",e:"🟫"},{en:"black",pt:"preto",e:"⬛"},{en:"white",pt:"branco",e:"⬜"},
 {en:"pink",pt:"rosa",e:"🌸"},{en:"grey",pt:"cinza",e:"🩶"}];
var NUM_EN=["one","two","three","four","five","six","seven","eight","nine","ten",
 "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
var CORPO=[{en:"hand",pt:"mão",e:"✋"},{en:"foot",pt:"pé",e:"🦶"},{en:"eye",pt:"olho",e:"👁️"},
 {en:"nose",pt:"nariz",e:"👃"},{en:"mouth",pt:"boca",e:"👄"},{en:"ear",pt:"orelha",e:"👂"},
 {en:"hair",pt:"cabelo",e:"💇"},{en:"tooth",pt:"dente",e:"🦷"},{en:"arm",pt:"braço",e:"💪"},
 {en:"leg",pt:"perna",e:"🦵"},{en:"finger",pt:"dedo",e:"👆"},{en:"tongue",pt:"língua",e:"👅"}];
var COMIDA_EN=[{en:"rice",pt:"arroz",e:"🍚"},{en:"beans",pt:"feijão",e:"🫘"},{en:"meat",pt:"carne",e:"🥩"},
 {en:"banana",pt:"banana",e:"🍌"},{en:"orange",pt:"laranja",e:"🍊"},{en:"grape",pt:"uva",e:"🍇"},
 {en:"juice",pt:"suco",e:"🧃"},{en:"pizza",pt:"pizza",e:"🍕"},{en:"soup",pt:"sopa",e:"🥣"},
 {en:"ice cream",pt:"sorvete",e:"🍦"},{en:"chicken",pt:"frango",e:"🍗"},{en:"salad",pt:"salada",e:"🥗"},
 {en:"popcorn",pt:"pipoca",e:"🍿"},{en:"candy",pt:"bala",e:"🍬"},{en:"chocolate",pt:"chocolate",e:"🍫"}];
var FAMILIA_EN=[{en:"mother",pt:"mãe",e:"👩"},{en:"father",pt:"pai",e:"👨"},{en:"sister",pt:"irmã",e:"👧"},
 {en:"brother",pt:"irmão",e:"👦"},{en:"grandmother",pt:"avó",e:"👵"},{en:"grandfather",pt:"avô",e:"👴"},
 {en:"baby",pt:"bebê",e:"👶"},{en:"family",pt:"família",e:"👨‍👩‍👧‍👦"},{en:"aunt",pt:"tia",e:"💃"},
 {en:"uncle",pt:"tio",e:"🕺"},{en:"cousin",pt:"primo",e:"🧒"}];
var ACOES_EN=[{en:"run",pt:"correr",e:"🏃"},{en:"jump",pt:"pular",e:"🤸"},{en:"eat",pt:"comer",e:"🍽️"},
 {en:"sleep",pt:"dormir",e:"😴"},{en:"drink",pt:"beber",e:"🥤"},{en:"read",pt:"ler",e:"📖"},
 {en:"write",pt:"escrever",e:"✍️"},{en:"sing",pt:"cantar",e:"🎤"},{en:"dance",pt:"dançar",e:"💃"},
 {en:"swim",pt:"nadar",e:"🏊"},{en:"play",pt:"brincar",e:"🧸"},{en:"walk",pt:"andar",e:"🚶"},
 {en:"cry",pt:"chorar",e:"😢"},{en:"smile",pt:"sorrir",e:"😀"},{en:"draw",pt:"desenhar",e:"🎨"}];
var OPOSTOS_EN=[["big","small"],["hot","cold"],["day","night"],["happy","sad"],["open","closed"],
 ["fast","slow"],["up","down"],["old","new"],["clean","dirty"],["yes","no"],["in","out"],["good","bad"]];

function enSkill(tag,banco,pergunta){
  return {tag:tag,area:"ingles",fn:function(nv){
    var lista=typeof banco==="function"?banco(nv):banco;
    var w=pick(lista), outras=pickN(lista.filter(function(x){return x.en!==w.en;}),nv>=3?3:2);
    return {txt:pergunta,fala:pergunta,fig:w.e,figGrande:true,
      porque:'"'+w.en+'" quer dizer '+w.pt+".",
      ops:shuffle([{t:w.en,ok:true}].concat(outras.map(function(x){return {t:x.en,ok:false};}))),cols:3,opsLang:"en"};
  }};
}

var INGLES=[
enSkill("Vocabulário",vocab,"Como se diz isso em inglês?"),
{tag:"Entender inglês",area:"ingles",fn:function(nv){
  var lista=vocab(nv), w=pick(lista);
  var outras=pickN(lista.filter(function(x){return x.en!==w.en;}),nv>=3?3:2);
  return {txt:'O que quer dizer "'+w.en.toUpperCase()+'"?',fala:w.en,falaLang:"en",
    porque:'"'+w.en+'" quer dizer '+w.pt+".",
    ops:shuffle([{t:w.pt,ok:true}].concat(outras.map(function(x){return {t:x.pt,ok:false};}))),cols:3};
}},
{tag:"Cores",area:"ingles",fn:function(nv){
  var lista=nv<=1?CORES.slice(0,5):CORES, c=pick(lista);
  var outras=pickN(lista.filter(function(x){return x.en!==c.en;}),nv>=3?3:2);
  return {txt:"What color is this?",fala:"What color is this?",falaLang:"en",fig:c.e,figGrande:true,
    porque:'Esta cor é "'+c.en+'" — '+c.pt+".",
    ops:shuffle([{t:c.en,ok:true}].concat(outras.map(function(x){return {t:x.en,ok:false};}))),cols:3,opsLang:"en"};
}},
{tag:"Números em inglês",area:"ingles",fn:function(nv){
  var teto=nv<=1?5:(nv===2?10:20), n=rnd(1,teto), e=pick(["⭐","🍎","🐟","⚽","🎈","🐝"]);
  var certo=NUM_EN[n-1], outros=pickN(NUM_EN.slice(0,teto).filter(function(x){return x!==certo;}),2);
  return {txt:"How many?",fala:"How many?",falaLang:"en",fig:new Array(n+1).join(e+" "),
    porque:n+" em inglês é "+certo+".",
    ops:shuffle([{t:certo,ok:true}].concat(outros.map(function(x){return {t:x,ok:false};}))),cols:3,opsLang:"en"};
}},
enSkill("Corpo em inglês",CORPO,"Como se diz isso em inglês?"),
enSkill("Comida em inglês",COMIDA_EN,"Como se diz esta comida em inglês?"),
enSkill("Família em inglês",FAMILIA_EN,"Como se diz isso em inglês?"),
{tag:"Ações em inglês",area:"ingles",fn:function(nv){
  var w=pick(ACOES_EN), outras=pickN(ACOES_EN.filter(function(x){return x.en!==w.en;}),nv>=3?3:2);
  var deEn=Math.random()<0.5;
  if(deEn) return {txt:'O que é "'+w.en.toUpperCase()+'"?',fala:w.en,falaLang:"en",
    porque:'"'+w.en+'" quer dizer '+w.pt+".",
    ops:shuffle([{t:w.pt,ok:true}].concat(outras.map(function(x){return {t:x.pt,ok:false};}))),cols:3};
  return {txt:"Como se diz "+w.pt.toUpperCase()+" em inglês?",fala:"Como se diz "+w.pt+" em inglês?",
    fig:w.e,figGrande:true,porque:w.pt+" em inglês é "+w.en+".",
    ops:shuffle([{t:w.en,ok:true}].concat(outras.map(function(x){return {t:x.en,ok:false};}))),cols:3,opsLang:"en"};
}},
{tag:"Opostos em inglês",area:"ingles",fn:function(nv){
  var par=pick(OPOSTOS_EN), inv=Math.random()<0.5;
  var alvo=inv?par[1]:par[0], certo=inv?par[0]:par[1];
  var outros=pickN(OPOSTOS_EN.filter(function(x){return x[0]!==par[0];}),2).map(function(x){return Math.random()<0.5?x[0]:x[1];});
  return {txt:'Qual é o contrário de "'+alvo.toUpperCase()+'" em inglês?',fala:"What is the opposite of "+alvo+"?",falaLang:"en",
    porque:'O contrário de "'+alvo+'" é "'+certo+'".',
    ops:ops(certo,[certo].concat(outros)),cols:3,opsLang:"en"};
}},
{tag:"Frases do dia",area:"ingles",fn:function(nv){
  var base=[
    {t:"Quando a gente acorda de manhã, diz:",ok:"good morning",d:["good night","thank you"]},
    {t:"Quando vai dormir, diz:",ok:"good night",d:["good morning","hello"]},
    {t:"Quando alguém te dá um presente, diz:",ok:"thank you",d:["goodbye","please"]},
    {t:"Quando vai embora, diz:",ok:"goodbye",d:["hello","sorry"]},
    {t:"Quando encontra um amigo, diz:",ok:"hello",d:["goodbye","good night"]},
    {t:"Quando quer pedir uma coisa, diz:",ok:"please",d:["thank you","sorry"]},
    {t:"Quando você pisa no pé de alguém sem querer, diz:",ok:"sorry",d:["thank you","hello"]},
    {t:"Depois do almoço, para cumprimentar alguém, diz:",ok:"good afternoon",d:["good morning","good night"]},
    {t:"Para dizer SIM em inglês:",ok:"yes",d:["no","please"]},
    {t:"Para dizer NÃO em inglês:",ok:"no",d:["yes","hello"]}
  ];
  if(nv>=3) base=base.concat([
    {t:'Alguém pergunta "How are you?". Você responde:',ok:"I'm fine, thank you",d:["My name is Ana","See you tomorrow"],cols:1},
    {t:"Para dizer seu nome em inglês, você fala:",ok:"my name is...",d:["how old are you","good afternoon"],cols:1},
    {t:"Para perguntar a idade de alguém:",ok:"how old are you?",d:["what is this?","where are you?"],cols:1},
    {t:'Alguém diz "thank you". Você responde:',ok:"you're welcome",d:["good night","how are you"],cols:1},
    {t:"Para pedir ajuda em inglês:",ok:"help me, please",d:["see you later","good morning"],cols:1}
  ]);
  var c=pick(base);
  return {txt:c.t,fala:c.t,porque:'Em inglês se diz "'+c.ok+'".',
    ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),cols:c.cols||3,opsLang:"en"};
}}
];

/* =========================================================
   CIÊNCIAS E MUNDO
   Cada habilidade tem um banco separado por nível, para que a
   criança encontre perguntas novas e mais difíceis conforme avança.
   ========================================================= */
var B_ANIMAIS={
 1:[
  {t:"Onde mora o peixe?",ok:"na água",d:["na árvore","embaixo da terra"],e:"🐟",p:"O peixe respira na água pelas guelras."},
  {t:"Qual destes animais voa?",ok:"🦜",d:["🐢","🐄"],emoji:true,p:"A arara tem asas e voa."},
  {t:"O que a vaca come?",ok:"capim",d:["carne","pedra"],e:"🐄",p:"A vaca é herbívora: só come plantas."},
  {t:"De onde vem o leite que a gente bebe?",ok:"da vaca",d:["da galinha","do peixe"],e:"🥛",p:"O leite vem da vaca."},
  {t:"Qual animal nasce do ovo?",ok:"🐦",d:["🐘","🐕"],emoji:true,p:"Os pássaros nascem de ovos."},
  {t:"O que a abelha produz?",ok:"mel",d:["leite","suco"],e:"🐝",p:"A abelha faz mel com o néctar das flores."},
  {t:"Qual destes é um inseto?",ok:"🐜",d:["🐍","🐇"],emoji:true,p:"A formiga é um inseto: tem 6 patas."},
  {t:"Qual animal late?",ok:"🐶",d:["🐱","🐮"],emoji:true,p:"O cachorro late; o gato mia."},
  {t:"Qual animal mia?",ok:"🐱",d:["🐶","🐔"],emoji:true,p:"O gato mia."},
  {t:"Onde mora o passarinho?",ok:"no ninho",d:["no aquário","na toca"],e:"🐦",p:"O passarinho faz ninho nas árvores."},
  {t:"Quantas patas tem o cachorro?",ok:"4",d:["2","6"],e:"🐶",p:"O cachorro tem 4 patas."},
  {t:"Quantas patas tem a galinha?",ok:"2",d:["4","8"],e:"🐔",p:"A galinha tem 2 patas."},
  {t:"Qual animal dá lã para fazer roupa?",ok:"🐑",d:["🐟","🐍"],emoji:true,p:"A ovelha dá lã."},
  {t:"Qual destes animais vive na fazenda?",ok:"🐖",d:["🦈","🐧"],emoji:true,p:"O porco é um animal de fazenda."}
 ],
 2:[
  {t:"O que os animais que vivem na água usam para respirar?",ok:"guelras",d:["pulmão","nariz"],e:"🐠",p:"Os peixes respiram pelas guelras."},
  {t:"Animais que só comem plantas se chamam...",ok:"herbívoros",d:["carnívoros","insetos"],e:"🐄",p:"Herbívoro come planta; carnívoro come carne."},
  {t:"Animais que comem carne se chamam...",ok:"carnívoros",d:["herbívoros","plantas"],e:"🦁",p:"O leão é carnívoro."},
  {t:"Qual destes animais é um mamífero?",ok:"🐋",d:["🐟","🐊"],emoji:true,p:"A baleia é mamífera: mama quando filhote."},
  {t:"O que o sapo era quando era filhote?",ok:"girino",d:["lagarta","pintinho"],e:"🐸",p:"O sapo nasce girino e depois cria patas."},
  {t:"Quantas patas tem uma aranha?",ok:"8",d:["6","4"],e:"🕷️",p:"A aranha tem 8 patas — por isso não é inseto."},
  {t:"Quantas patas tem um inseto?",ok:"6",d:["8","4"],e:"🐜",p:"Todo inseto tem 6 patas."},
  {t:"Qual animal troca de pele?",ok:"🐍",d:["🐕","🐦"],emoji:true,p:"A cobra troca de pele enquanto cresce."},
  {t:"O morcego é um pássaro?",ok:"não, é mamífero",d:["sim, é pássaro","é um inseto"],e:"🦇",p:"O morcego voa, mas é mamífero."},
  {t:"Qual animal carrega o filhote numa bolsa?",ok:"🦘",d:["🐘","🐅"],emoji:true,p:"O canguru carrega o filhote no marsúpio."},
  {t:"Para que servem as asas do pássaro?",ok:"para voar",d:["para nadar","para cavar"],e:"🕊️",p:"As asas servem para voar."},
  {t:"O que a minhoca faz de bom para a terra?",ok:"deixa a terra fofinha",d:["come as raízes","seca a terra"],e:"🪱",p:"A minhoca cava e deixa a terra boa para as plantas."},
  {t:"Qual destes animais é anfíbio (vive na água e na terra)?",ok:"🐸",d:["🐈","🦅"],emoji:true,p:"O sapo vive na água quando filhote e na terra depois."},
  {t:"Os animais precisam de quê para viver?",ok:"água, comida e ar",d:["só de brinquedo","só de sol"],e:"🐕",p:"Todo animal precisa de água, comida e ar."}
 ],
 3:[
  {t:"O que é a cadeia alimentar?",ok:"quem come quem na natureza",d:["a fila do bandejão","a lista de compras"],e:"🌿",p:"É a ordem de quem serve de alimento para quem."},
  {t:"A borboleta passa por quantas fases até ficar adulta?",ok:"4: ovo, lagarta, casulo e borboleta",d:["2: ovo e borboleta","1: já nasce pronta"],e:"🦋",p:"Ovo → lagarta → casulo (pupa) → borboleta."},
  {t:"Animais de sangue frio dependem do quê para se esquentar?",ok:"do sol",d:["do pelo","da comida"],e:"🦎",p:"Répteis tomam sol para aquecer o corpo."},
  {t:"Qual destes é um réptil?",ok:"🐢",d:["🐝","🦅"],emoji:true,p:"A tartaruga é réptil: tem escamas e é de sangue frio."},
  {t:"Por que algumas aves voam para outro lugar no inverno?",ok:"para achar comida e calor",d:["para passear",  "porque se perdem"],e:"🦢",p:"É a migração: buscam comida e clima melhor."},
  {t:"O que acontece com os animais quando a floresta é destruída?",ok:"ficam sem casa e sem comida",d:["ficam mais felizes","viram plantas"],e:"🌳",p:"Sem a floresta, os animais perdem abrigo e alimento."},
  {t:"Qual animal ajuda a polinizar as flores?",ok:"🐝",d:["🐄","🐍"],emoji:true,p:"A abelha leva o pólen de flor em flor."},
  {t:"O camaleão muda de cor para quê?",ok:"para se esconder",d:["para ficar bonito","para esquentar"],e:"🦎",p:"É camuflagem: ele se confunde com o ambiente."},
  {t:"Animais em extinção são aqueles que...",ok:"estão quase acabando",d:["são muito rápidos","vivem no zoológico"],e:"🐆",p:"Estão em risco de desaparecer da natureza."},
  {t:"O que é um animal noturno?",ok:"o que fica acordado à noite",d:["o que dorme à noite","o que vive na lua"],e:"🦉",p:"A coruja é noturna: caça de noite."},
  {t:"Por que o urso polar é branco?",ok:"para se camuflar na neve",d:["porque toma leite","porque é velho"],e:"🐻‍❄️",p:"O pelo branco o esconde na neve."},
  {t:"Qual é o maior animal do planeta?",ok:"a baleia-azul",d:["o elefante","o dinossauro"],e:"🐋",p:"A baleia-azul é o maior animal que já existiu."}
 ]
};

var B_PLANTAS={
 1:[
  {t:"Do que a planta mais precisa para crescer?",ok:"água e sol",d:["chocolate","barulho"],e:"🌱",p:"Água, luz do sol e terra."},
  {t:"Qual parte da planta fica embaixo da terra?",ok:"a raiz",d:["a flor","a folha"],e:"🌳",p:"A raiz cresce para baixo e segura a planta."},
  {t:"De onde nasce a planta?",ok:"da semente",d:["da pedra","da nuvem"],e:"🌰",p:"Toda planta começa numa semente."},
  {t:"O que a árvore nos dá?",ok:"sombra e frutas",d:["chuva","vento"],e:"🌳",p:"A árvore dá sombra, frutas e ar puro."},
  {t:"Qual destas é uma fruta?",ok:"🍎",d:["🥕","🥔"],emoji:true,p:"A maçã é fruta; cenoura e batata são legumes."},
  {t:"Qual parte da planta é colorida e cheirosa?",ok:"a flor",d:["a raiz","o tronco"],e:"🌻",p:"A flor é a parte colorida e perfumada."},
  {t:"O que a gente precisa fazer para a plantinha não morrer?",ok:"regar",d:["deixar no escuro","cobrir com plástico"],e:"🪴",p:"A planta precisa de água todos os dias."},
  {t:"Qual destes vem de uma planta?",ok:"🍞",d:["🥩","🥚"],emoji:true,p:"O pão é feito de trigo, que é uma planta."},
  {t:"De que cor é a maioria das folhas?",ok:"verde",d:["azul","roxa"],e:"🍃",p:"As folhas são verdes por causa da clorofila."}
 ],
 2:[
  {t:"Qual parte da planta leva a água da raiz até as folhas?",ok:"o caule",d:["a flor","a semente"],e:"🌿",p:"O caule é o cano que leva a água para cima."},
  {t:"O que a folha faz com a luz do sol?",ok:"fabrica o alimento da planta",d:["fica com sede","muda de cor"],e:"🍃",p:"É a fotossíntese: a folha usa o sol para fazer comida."},
  {t:"A planta solta no ar um gás que a gente respira. Qual?",ok:"oxigênio",d:["fumaça","vapor"],e:"🌳",p:"As plantas liberam oxigênio, que a gente respira."},
  {t:"Qual destes é uma raiz que a gente come?",ok:"🥕",d:["🍅","🥬"],emoji:true,p:"A cenoura é a raiz da planta."},
  {t:"Qual destas partes a gente come na alface?",ok:"a folha",d:["a raiz","a semente"],e:"🥬",p:"Da alface comemos as folhas."},
  {t:"Para que serve a semente dentro da fruta?",ok:"para nascer uma planta nova",d:["para dar sabor","para enfeitar"],e:"🍉",p:"Cada semente pode virar uma planta nova."},
  {t:"O que acontece com a planta que fica no escuro?",ok:"fica fraca e amarela",d:["cresce mais rápido","vira flor"],e:"🪴",p:"Sem luz ela não consegue fabricar alimento."},
  {t:"Qual árvore brasileira deu nome ao nosso país?",ok:"o pau-brasil",d:["a mangueira","o coqueiro"],e:"🌳",p:"O pau-brasil deu nome ao Brasil."},
  {t:"O cacto guarda o quê dentro dele?",ok:"água",d:["mel","areia"],e:"🌵",p:"O cacto guarda água para sobreviver na seca."}
 ],
 3:[
  {t:"Como se chama o processo em que a planta usa o sol para fazer alimento?",ok:"fotossíntese",d:["digestão","evaporação"],e:"🌿",p:"Fotossíntese: luz + água + gás carbônico = alimento."},
  {t:"A planta absorve pela raiz a água e também...",ok:"os nutrientes da terra",d:["o vento","a luz"],e:"🌱",p:"A raiz puxa água e sais minerais da terra."},
  {t:"Qual gás a planta retira do ar durante a fotossíntese?",ok:"gás carbônico",d:["oxigênio","hidrogênio"],e:"🍃",p:"Ela tira gás carbônico e devolve oxigênio."},
  {t:"Por que as folhas de algumas árvores caem no outono?",ok:"para economizar água e energia",d:["porque ficam sujas","porque o vento arranca"],e:"🍂",p:"A árvore se protege do frio e da falta de água."},
  {t:"Qual é a diferença entre fruta e legume?",ok:"a fruta guarda as sementes",d:["a fruta é sempre doce","o legume é sempre verde"],e:"🍅",p:"A fruta é a parte da planta que guarda sementes."},
  {t:"O que é um bioma?",ok:"um tipo de ambiente com plantas e bichos próprios",d:["um tipo de adubo","uma ferramenta"],e:"🌍",p:"Amazônia, Cerrado e Caatinga são biomas do Brasil."},
  {t:"Quem leva o pólen de uma flor para a outra?",ok:"as abelhas e o vento",d:["as pedras","a chuva forte"],e:"🌸",p:"Insetos e vento fazem a polinização."},
  {t:"Por que as raízes de algumas árvores são enormes?",ok:"para segurar a árvore e buscar água fundo",d:["para enfeitar","para dar sombra"],e:"🌳",p:"Raízes grandes dão firmeza e alcançam água profunda."},
  {t:"O que é adubo?",ok:"comida para a terra e para a planta",d:["um tipo de inseto","uma pedra"],e:"🪴",p:"O adubo devolve nutrientes para a terra."}
 ]
};

var B_CORPO={
 1:[
  {t:"Com qual parte do corpo a gente escuta?",ok:"👂",d:["👁️","👃"],emoji:true,p:"A gente escuta com a orelha."},
  {t:"Com qual parte do corpo a gente sente o cheiro?",ok:"👃",d:["✋","👂"],emoji:true,p:"O nariz sente os cheiros."},
  {t:"O que a gente faz antes de comer?",ok:"lavar as mãos",d:["correr","assistir tv"],e:"🧼",p:"Lavar as mãos tira os micróbios."},
  {t:"Quantas vezes por dia devemos escovar os dentes?",ok:"3 vezes",d:["1 vez por semana","nenhuma"],e:"🪥",p:"Depois de cada refeição, pelo menos 3 vezes."},
  {t:"O que faz bem para o corpo?",ok:"brincar e correr",d:["ficar deitado o dia todo","comer só doce"],e:"⚽",p:"Se mexer todo dia deixa o corpo forte."},
  {t:"Com qual parte do corpo a gente enxerga?",ok:"👁️",d:["👂","👅"],emoji:true,p:"A gente enxerga com os olhos."},
  {t:"Quantos dedos tem em uma mão?",ok:"5",d:["10","4"],e:"✋",p:"Cada mão tem 5 dedos."},
  {t:"O que a gente bebe para matar a sede?",ok:"água",d:["refrigerante o dia todo","café"],e:"💧",p:"Água é a melhor bebida para o corpo."},
  {t:"Quantas horas uma criança precisa dormir por noite?",ok:"cerca de 10 horas",d:["2 horas","1 hora"],e:"😴",p:"Dormir bem ajuda a crescer e a aprender."},
  {t:"Quando espirrar, você deve cobrir a boca com...",ok:"o braço",d:["a mão suja","nada"],e:"🤧",p:"Cobrir com o braço evita espalhar micróbios."}
 ],
 2:[
  {t:"Qual órgão bombeia o sangue pelo corpo?",ok:"o coração",d:["o estômago","o pulmão"],e:"❤️",p:"O coração é a bomba que empurra o sangue."},
  {t:"Com qual órgão a gente respira?",ok:"o pulmão",d:["o fígado","o rim"],e:"🫁",p:"O ar entra pelo nariz e vai para os pulmões."},
  {t:"Onde a comida vai depois que a gente engole?",ok:"para o estômago",d:["para o coração","para o pulmão"],e:"🍽️",p:"A comida desce pelo esôfago até o estômago."},
  {t:"O que segura o nosso corpo em pé?",ok:"os ossos",d:["os cabelos","a pele"],e:"🦴",p:"O esqueleto sustenta o corpo."},
  {t:"Para que servem os músculos?",ok:"para a gente se mexer",d:["para pensar","para respirar só"],e:"💪",p:"Os músculos puxam os ossos e fazem o corpo se mover."},
  {t:"O que os dentes de leite fazem quando a gente cresce?",ok:"caem e nascem os permanentes",d:["ficam para sempre","viram ossos"],e:"🦷",p:"Os dentes de leite caem e dão lugar aos definitivos."},
  {t:"Comer muito açúcar pode causar o quê nos dentes?",ok:"cárie",d:["mais força","dentes maiores"],e:"🍬",p:"O açúcar alimenta as bactérias que fazem cárie."},
  {t:"Qual destes alimentos é o mais saudável para comer todo dia?",ok:"🥦",d:["🍭","🍟"],emoji:true,p:"Verduras e legumes devem estar no prato todo dia."},
  {t:"Por que a gente toma vacina?",ok:"para não ficar doente",d:["para crescer mais rápido","para ficar forte na hora"],e:"💉",p:"A vacina ensina o corpo a se defender das doenças."},
  {t:"O que protege o nosso corpo por fora?",ok:"a pele",d:["o cabelo","a unha"],e:"🧒",p:"A pele é a capa que protege o corpo todo."}
 ],
 3:[
  {t:"Como se chama o conjunto de todos os ossos do corpo?",ok:"esqueleto",d:["músculo","sistema nervoso"],e:"🦴",p:"O esqueleto tem mais de 200 ossos."},
  {t:"Qual órgão comanda todo o corpo e ajuda a pensar?",ok:"o cérebro",d:["o coração","o estômago"],e:"🧠",p:"O cérebro é o centro de comando do corpo."},
  {t:"O ar que a gente respira leva para o sangue qual gás?",ok:"oxigênio",d:["gás carbônico","fumaça"],e:"🫁",p:"O oxigênio entra no sangue pelos pulmões."},
  {t:"Para que servem os rins?",ok:"limpar o sangue",d:["digerir a comida","bater o coração"],e:"💧",p:"Os rins filtram o sangue e fazem a urina."},
  {t:"O que acontece com o coração quando a gente corre?",ok:"bate mais rápido",d:["para de bater","bate mais devagar"],e:"🏃",p:"Ele acelera para levar mais oxigênio aos músculos."},
  {t:"Qual grupo de alimentos dá mais energia para brincar?",ok:"os carboidratos, como arroz e pão",d:["os doces industrializados","os refrigerantes"],e:"🍚",p:"Arroz, pão e massas são a gasolina do corpo."},
  {t:"Por que a gente sua quando faz exercício?",ok:"para esfriar o corpo",d:["para engordar","para ficar sujo"],e:"💦",p:"O suor evapora e resfria a pele."},
  {t:"O que é um micróbio?",ok:"um ser vivo tão pequeno que não dá para ver",d:["um tipo de pedra","um inseto grande"],e:"🦠",p:"Bactérias e vírus são micróbios."},
  {t:"Os alimentos que ajudam o corpo a crescer são ricos em...",ok:"proteína",d:["açúcar","corante"],e:"🥚",p:"Ovo, carne e feijão têm proteína, que constrói o corpo."}
 ]
};

var B_TEMPO={
 1:[
  {t:"O que aparece no céu à noite?",ok:"🌙",d:["☀️","🌈"],emoji:true,p:"À noite aparecem a lua e as estrelas."},
  {t:"Quando chove, a gente usa o quê?",ok:"☂️",d:["🕶️","🧣"],emoji:true,p:"O guarda-chuva protege da chuva."},
  {t:"Em qual estação faz mais frio?",ok:"inverno",d:["verão","primavera"],e:"❄️",p:"O inverno é a estação mais fria."},
  {t:"Em qual estação faz mais calor?",ok:"verão",d:["inverno","outono"],e:"☀️",p:"O verão é a estação mais quente."},
  {t:"O que vem depois da segunda-feira?",ok:"terça-feira",d:["domingo","sexta-feira"],e:"📅",p:"A ordem é segunda, terça, quarta..."},
  {t:"Quantos dias tem uma semana?",ok:"7",d:["5","12"],e:"📅",p:"São 7 dias, de domingo a sábado."},
  {t:"O gelo é água de que jeito?",ok:"duro, congelado",d:["quente","gasoso"],e:"🧊",p:"Quando a água esfria muito, vira gelo."},
  {t:"Quando faz muito sol, a gente deve usar...",ok:"boné e protetor solar",d:["casaco de lã","luva"],e:"🧢",p:"O sol forte machuca a pele."},
  {t:"De onde vem a chuva?",ok:"das nuvens",d:["do chão","das árvores"],e:"🌧️",p:"A chuva cai das nuvens."},
  {t:"O que a gente vê no céu depois da chuva com sol?",ok:"🌈",d:["❄️","🌋"],emoji:true,p:"O arco-íris aparece quando o sol atravessa as gotas."}
 ],
 2:[
  {t:"Quantas estações tem o ano?",ok:"4",d:["2","12"],e:"🍂",p:"Verão, outono, inverno e primavera."},
  {t:"Em qual estação as flores nascem mais?",ok:"primavera",d:["inverno","outono"],e:"🌸",p:"A primavera é a estação das flores."},
  {t:"O que acontece com a água quando ela esquenta muito?",ok:"vira vapor",d:["vira gelo","vira pedra"],e:"♨️",p:"A água ferve e evapora, virando vapor."},
  {t:"De onde vem a água da chuva antes de virar nuvem?",ok:"dos rios e do mar",d:["do vulcão","do vento"],e:"🌊",p:"A água evapora dos rios e mares e forma nuvens."},
  {t:"O que é o vento?",ok:"ar em movimento",d:["água voando","fumaça"],e:"🌬️",p:"O vento é o ar se deslocando."},
  {t:"Por que ficamos com frio de noite?",ok:"porque o sol não está aquecendo",d:["porque a lua gela","porque o vento some"],e:"🌙",p:"Sem o sol, a Terra esfria."},
  {t:"O que faz o dia e a noite acontecerem?",ok:"a Terra girar",d:["a lua sumir","o sol apagar"],e:"🌍",p:"A Terra gira e cada lado fica de frente para o sol."},
  {t:"Quando muita água cai e o rio transborda, chamamos de...",ok:"enchente",d:["seca","neblina"],e:"🌊",p:"Enchente é quando a água sai do rio e invade a rua."},
  {t:"Quando fica muito tempo sem chover, chamamos de...",ok:"seca",d:["enchente","furacão"],e:"🏜️",p:"A seca é a falta de chuva por muito tempo."},
  {t:"O que é a neblina?",ok:"uma nuvem baixinha, pertinho do chão",d:["poeira","fumaça de carro"],e:"🌫️",p:"Neblina é nuvem formada perto do chão."}
 ],
 3:[
  {t:"Como se chama o caminho que a água faz: evapora, vira nuvem e chove?",ok:"ciclo da água",d:["ciclo do sol","chuva ácida"],e:"💧",p:"Evaporação → condensação → precipitação."},
  {t:"Quando a água vira vapor, o nome disso é...",ok:"evaporação",d:["condensação","congelamento"],e:"♨️",p:"Evaporação é líquido virando gás."},
  {t:"Quando o vapor esfria e vira gotinha, o nome é...",ok:"condensação",d:["evaporação","erosão"],e:"☁️",p:"Condensação é gás virando líquido."},
  {t:"Qual instrumento mede a temperatura?",ok:"termômetro",d:["relógio","balança"],e:"🌡️",p:"O termômetro mede se está quente ou frio."},
  {t:"O que é o clima de um lugar?",ok:"como o tempo costuma ser lá",d:["a chuva de hoje","o sol de agora"],e:"🌍",p:"Tempo é hoje; clima é o padrão de muitos anos."},
  {t:"Por que existe verão e inverno?",ok:"porque a Terra é inclinada e gira em volta do sol",d:["porque o sol se apaga","porque a lua muda"],e:"🌞",p:"A inclinação da Terra faz cada parte receber mais ou menos sol."},
  {t:"O que causa o trovão?",ok:"o ar esquentando muito rápido no raio",d:["as nuvens batendo","a chuva caindo"],e:"⛈️",p:"O raio aquece o ar de repente e o estouro é o trovão."},
  {t:"Por que o gelo flutua na água?",ok:"porque é mais leve que a água líquida",d:["porque é branco","porque é frio"],e:"🧊",p:"O gelo é menos denso, então boia."},
  {t:"O aquecimento global acontece porque...",ok:"soltamos gases demais no ar",d:["o sol chegou perto","choveu pouco"],e:"🌡️",p:"Os gases seguram o calor perto da Terra."}
 ]
};

var B_PLANETA={
 1:[
  {t:"Onde a gente joga o lixo?",ok:"🗑️",d:["🌊","🌳"],emoji:true,p:"O lixo vai sempre na lixeira."},
  {t:"O que a gente deve fazer com a torneira ao escovar os dentes?",ok:"fechar",d:["deixar aberta","abrir mais"],e:"🚰",p:"Fechar a torneira economiza muita água."},
  {t:"Garrafa de plástico vai para qual lixo?",ok:"reciclagem",d:["lixo do banheiro","na rua"],e:"♻️",p:"Plástico é reciclável."},
  {t:"O que economiza energia?",ok:"apagar a luz ao sair",d:["deixar tudo ligado","abrir a geladeira"],e:"💡",p:"Apagar a luz do cômodo vazio economiza energia."},
  {t:"É certo jogar lixo pela janela do carro?",ok:"não, nunca",d:["sim, se for pequeno","só se ninguém vir"],e:"🚗",p:"O lixo na rua entope bueiro e polui o rio."},
  {t:"Plantar uma árvore faz bem porque...",ok:"limpa o ar e dá sombra",d:["suja a rua","gasta água do mar"],e:"🌳",p:"Árvores limpam o ar e refrescam a cidade."},
  {t:"Banho demorado gasta o quê?",ok:"muita água",d:["muito papel","muita comida"],e:"🚿",p:"Banho curto economiza água."},
  {t:"O que a gente faz com a sacola quando vai ao mercado?",ok:"levar uma sacola de pano",d:["pegar 10 sacolas","jogar no chão"],e:"🛍️",p:"A sacola reutilizável evita lixo plástico."}
 ],
 2:[
  {t:"Papel usado vai para qual cor de lixeira na reciclagem?",ok:"azul",d:["verde","vermelha"],e:"📄",p:"Azul é papel, verde é vidro, vermelho é plástico."},
  {t:"Vidro vai para qual cor de lixeira?",ok:"verde",d:["azul","amarela"],e:"🍾",p:"Verde é a cor do vidro na coleta seletiva."},
  {t:"O que quer dizer os 3 Rs?",ok:"reduzir, reutilizar e reciclar",d:["rir, rolar e rodar","reto, redondo e raso"],e:"♻️",p:"Reduzir, reutilizar e reciclar, nessa ordem."},
  {t:"Restos de comida e casca de fruta podem virar...",ok:"adubo",d:["plástico","vidro"],e:"🍌",p:"É a compostagem: vira adubo para as plantas."},
  {t:"Por que não devemos jogar óleo de cozinha na pia?",ok:"porque polui a água",d:["porque entope a geladeira","porque cheira mal só"],e:"🛢️",p:"Um litro de óleo polui milhares de litros de água."},
  {t:"Pilhas e baterias velhas devem ir para...",ok:"um ponto de coleta especial",d:["o lixo comum","o vaso sanitário"],e:"🔋",p:"Pilhas têm metais que contaminam o solo."},
  {t:"Andar de bicicleta em vez de carro ajuda porque...",ok:"não polui o ar",d:["gasta mais gasolina","faz mais barulho"],e:"🚲",p:"A bicicleta não solta fumaça."},
  {t:"O que acontece com o plástico que vai parar no mar?",ok:"os animais se machucam com ele",d:["vira comida boa","desaparece em 1 dia"],e:"🐢",p:"Tartarugas confundem plástico com água-viva."}
 ],
 3:[
  {t:"Quanto tempo uma garrafa plástica leva para se decompor?",ok:"centenas de anos",d:["uma semana","um mês"],e:"🥤",p:"Pode levar mais de 400 anos."},
  {t:"O que é energia renovável?",ok:"energia que não acaba, como a do sol e do vento",d:["energia de pilha","energia de carvão"],e:"☀️",p:"Sol, vento e água são fontes renováveis."},
  {t:"Qual destas fontes de energia NÃO polui o ar?",ok:"a solar",d:["o carvão","o petróleo"],e:"🔆",p:"A energia solar não solta fumaça."},
  {t:"O desmatamento é...",ok:"derrubar as árvores da floresta",d:["plantar mais árvores","regar as plantas"],e:"🪓",p:"Desmatar tira a casa dos animais e piora o clima."},
  {t:"Por que a Amazônia é tão importante?",ok:"guarda muita água, bichos e plantas",d:["porque é bonita só","porque tem estrada"],e:"🌳",p:"É a maior floresta tropical do mundo."},
  {t:"O que é coleta seletiva?",ok:"separar o lixo por tipo",d:["escolher o lixo mais bonito","queimar o lixo"],e:"♻️",p:"Separar papel, plástico, vidro e metal permite reciclar."},
  {t:"Reduzir, reutilizar, reciclar: qual vem primeiro e é o melhor?",ok:"reduzir",d:["reciclar","reutilizar"],e:"♻️",p:"O melhor lixo é o que nem chega a existir."},
  {t:"O que a gente pode fazer com uma garrafa PET em casa?",ok:"virar vaso de planta",d:["jogar no rio","enterrar no quintal"],e:"🪴",p:"Reutilizar antes de reciclar é ainda melhor."}
 ]
};

var B_ESPACO={
 1:[
  {t:"Qual é a estrela que ilumina o nosso dia?",ok:"o sol",d:["a lua","Marte"],e:"☀️",p:"O sol é a estrela mais perto da Terra."},
  {t:"Em qual planeta a gente mora?",ok:"Terra",d:["Lua","Sol"],e:"🌍",p:"Moramos no planeta Terra."},
  {t:"O que a gente vê brilhando no céu à noite?",ok:"estrelas",d:["peixes","flores"],e:"⭐",p:"As estrelas brilham à noite."},
  {t:"Quem viaja para o espaço?",ok:"o astronauta",d:["o bombeiro","o padeiro"],e:"👨‍🚀",p:"O astronauta viaja de foguete."},
  {t:"Como o foguete sobe para o espaço?",ok:"com muito fogo e força",d:["com asas","com rodas"],e:"🚀",p:"Os motores empurram o foguete para cima."},
  {t:"A lua gira em volta de quem?",ok:"da Terra",d:["do sol","de Júpiter"],e:"🌙",p:"A lua é o satélite da Terra."}
 ],
 2:[
  {t:"Quantos planetas tem o Sistema Solar?",ok:"8",d:["3","20"],e:"🪐",p:"Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno."},
  {t:"Qual planeta é conhecido como planeta vermelho?",ok:"Marte",d:["Vênus","Netuno"],e:"🔴",p:"Marte é vermelho por causa do ferro no solo."},
  {t:"Qual planeta tem anéis fáceis de ver?",ok:"Saturno",d:["Terra","Mercúrio"],e:"🪐",p:"Saturno tem anéis de gelo e pedra."},
  {t:"A Terra leva quanto tempo para dar uma volta no sol?",ok:"1 ano",d:["1 dia","1 semana"],e:"🌍",p:"Uma volta completa leva 365 dias."},
  {t:"A Terra leva quanto tempo para girar em si mesma?",ok:"1 dia",d:["1 mês","1 hora"],e:"🌎",p:"Um giro dá 24 horas: o dia e a noite."},
  {t:"Por que a lua muda de formato no céu?",ok:"porque vemos partes diferentes iluminadas",d:["porque ela quebra","porque some"],e:"🌗",p:"São as fases da lua."},
  {t:"O que é um satélite natural da Terra?",ok:"a lua",d:["o sol","uma nuvem"],e:"🌕",p:"A lua é o único satélite natural da Terra."}
 ],
 3:[
  {t:"Por que no espaço o astronauta flutua?",ok:"porque quase não sente a gravidade",d:["porque é leve","porque tem asas"],e:"👩‍🚀",p:"Longe da Terra a força da gravidade quase não age."},
  {t:"Qual é o maior planeta do Sistema Solar?",ok:"Júpiter",d:["Terra","Mercúrio"],e:"🪐",p:"Júpiter é o gigante do Sistema Solar."},
  {t:"O que é uma galáxia?",ok:"um conjunto enorme de estrelas",d:["um planeta gelado","uma nave"],e:"🌌",p:"A nossa galáxia é a Via Láctea."},
  {t:"O que acontece num eclipse solar?",ok:"a lua fica na frente do sol",d:["o sol apaga","a Terra para"],e:"🌑",p:"A lua tapa o sol e faz sombra na Terra."},
  {t:"Por que o sol parece maior que as outras estrelas?",ok:"porque está muito mais perto",d:["porque é a maior","porque é amarelo"],e:"☀️",p:"Existem estrelas bem maiores, só que longe."},
  {t:"Quanto tempo a luz do sol leva para chegar na Terra?",ok:"cerca de 8 minutos",d:["1 segundo","1 ano"],e:"🔆",p:"Mesmo rapidíssima, a luz leva 8 minutos."},
  {t:"O que é um cometa?",ok:"uma bola de gelo e poeira com rabo de luz",d:["uma estrela pequena","um avião"],e:"☄️",p:"Ao chegar perto do sol, o gelo derrete e forma a cauda."}
 ]
};

var B_MATERIAIS={
 1:[
  {t:"O que acontece com a rolha na água?",ok:"flutua",d:["afunda","derrete"],e:"🫧",p:"A rolha é leve e boia."},
  {t:"O que acontece com a pedra na água?",ok:"afunda",d:["flutua","voa"],e:"🪨",p:"A pedra é pesada e afunda."},
  {t:"De que é feita a janela?",ok:"vidro",d:["algodão","chocolate"],e:"🪟",p:"A janela é de vidro, que é transparente."},
  {t:"De que é feita a camiseta?",ok:"tecido",d:["metal","vidro"],e:"👕",p:"A camiseta é feita de tecido de algodão."},
  {t:"O que acontece com o sorvete no sol?",ok:"derrete",d:["congela","cresce"],e:"🍦",p:"O calor derrete o sorvete."},
  {t:"De que é feita a colher de metal?",ok:"metal",d:["papel","água"],e:"🥄",p:"É feita de metal, que é duro e brilhante."},
  {t:"O que acontece com o papel na água?",ok:"molha e fica mole",d:["fica duro","vira vidro"],e:"📄",p:"O papel absorve a água."}
 ],
 2:[
  {t:"A água tem três estados. Quais são?",ok:"sólido, líquido e gasoso",d:["quente, morno e frio","doce, salgado e azedo"],e:"💧",p:"Gelo (sólido), água (líquido) e vapor (gasoso)."},
  {t:"O gelo é a água no estado...",ok:"sólido",d:["líquido","gasoso"],e:"🧊",p:"Congelada, a água fica sólida."},
  {t:"O vapor é a água no estado...",ok:"gasoso",d:["sólido","líquido"],e:"♨️",p:"Fervendo, a água vira gás."},
  {t:"Qual destes materiais é transparente?",ok:"o vidro",d:["a madeira","o metal"],e:"🪟",p:"Dá para ver através do vidro."},
  {t:"O ímã gruda em quê?",ok:"em metal",d:["em plástico","em papel"],e:"🧲",p:"O ímã atrai ferro e outros metais."},
  {t:"De onde vem o papel?",ok:"da árvore",d:["do petróleo","da pedra"],e:"🌳",p:"O papel é feito da celulose da madeira."},
  {t:"De onde vem o plástico?",ok:"do petróleo",d:["da árvore","do leite"],e:"🛢️",p:"A maior parte do plástico vem do petróleo."},
  {t:"O que conduz eletricidade?",ok:"o fio de metal",d:["a borracha","a madeira seca"],e:"🔌",p:"Metais conduzem; borracha isola."}
 ],
 3:[
  {t:"Quando a água congela, ela...",ok:"aumenta de tamanho",d:["diminui","some"],e:"🧊",p:"Por isso a garrafa cheia estoura no congelador."},
  {t:"Como se chama a passagem de sólido para líquido?",ok:"fusão",d:["evaporação","condensação"],e:"🧊",p:"O gelo derretendo é fusão."},
  {t:"Materiais que não deixam a eletricidade passar são...",ok:"isolantes",d:["condutores","magnéticos"],e:"🧤",p:"Borracha e plástico são isolantes."},
  {t:"Por que o navio de metal flutua se o metal afunda?",ok:"por causa do formato, cheio de ar dentro",d:["porque é pintado","porque é rápido"],e:"🚢",p:"O casco oco desloca muita água e faz o navio boiar."},
  {t:"Misturar açúcar na água é um exemplo de...",ok:"dissolver",d:["derreter","congelar"],e:"🥤",p:"O açúcar se dissolve e some na água."},
  {t:"Qual destes é reciclável infinitas vezes sem perder qualidade?",ok:"o vidro",d:["o papel","a madeira"],e:"🍾",p:"O vidro pode ser derretido e refeito para sempre."},
  {t:"Por que a panela tem cabo de plástico ou madeira?",ok:"porque não esquenta tão rápido",d:["porque é bonito","porque é leve"],e:"🍳",p:"Plástico e madeira são isolantes térmicos."}
 ]
};

var B_SENTIDOS={
 1:[
  {t:"Quantos sentidos a gente tem?",ok:"5",d:["2","10"],e:"🖐️",p:"Visão, audição, olfato, paladar e tato."},
  {t:"Com qual sentido a gente sente o gosto?",ok:"o paladar",d:["a visão","a audição"],e:"👅",p:"A língua sente o gosto: é o paladar."},
  {t:"Com qual sentido a gente sente se está quente?",ok:"o tato",d:["o olfato","a visão"],e:"✋",p:"A pele sente o calor: é o tato."},
  {t:"Com qual sentido a gente escuta a música?",ok:"a audição",d:["o paladar","o tato"],e:"👂",p:"O ouvido escuta: é a audição."},
  {t:"Com qual sentido a gente sente o cheiro do bolo?",ok:"o olfato",d:["a visão","o tato"],e:"👃",p:"O nariz cheira: é o olfato."},
  {t:"O limão tem gosto de quê?",ok:"azedo",d:["doce","salgado"],e:"🍋",p:"O limão é azedo."},
  {t:"O sal tem gosto de quê?",ok:"salgado",d:["doce","azedo"],e:"🧂",p:"O sal é salgado."}
 ],
 2:[
  {t:"Se você fecha os olhos, ainda consegue reconhecer uma fruta pelo...",ok:"cheiro e pelo toque",d:["som da geladeira","gosto do ar"],e:"🍊",p:"Olfato e tato ajudam mesmo sem a visão."},
  {t:"Uma pessoa cega lê com os dedos usando o...",ok:"braile",d:["desenho","celular"],e:"👆",p:"O braile é feito de pontinhos em relevo."},
  {t:"Uma pessoa surda pode conversar usando...",ok:"língua de sinais",d:["só escrevendo sempre","não pode"],e:"🤟",p:"No Brasil usamos a Libras."},
  {t:"Por que o som do trovão chega depois do raio?",ok:"porque a luz é mais rápida que o som",d:["porque o som se perde","porque a nuvem atrasa"],e:"⛈️",p:"A luz viaja muito mais rápido que o som."},
  {t:"Qual órgão do sentido fica dentro da orelha?",ok:"o ouvido",d:["o olho","a língua"],e:"👂",p:"A orelha capta o som e o ouvido escuta."},
  {t:"Por que a comida fica sem graça quando estamos gripados?",ok:"porque o nariz entupido atrapalha o paladar",d:["porque a língua dorme","porque a comida muda"],e:"🤧",p:"Olfato e paladar trabalham juntos."}
 ],
 3:[
  {t:"Qual parte do olho deixa a luz entrar?",ok:"a pupila",d:["a sobrancelha","o cílio"],e:"👁️",p:"A pupila é a bolinha preta que abre e fecha."},
  {t:"O que acontece com a pupila no escuro?",ok:"ela aumenta para entrar mais luz",d:["ela some","ela diminui"],e:"🌑",p:"No escuro a pupila dilata."},
  {t:"Quem manda os sinais dos sentidos para o cérebro?",ok:"os nervos",d:["os ossos","o sangue só"],e:"🧠",p:"Os nervos levam a informação até o cérebro."},
  {t:"Por que ouvir som muito alto faz mal?",ok:"pode machucar o ouvido para sempre",d:["deixa a gente com fome","muda a cor do olho"],e:"🎧",p:"Sons altos danificam as células do ouvido."},
  {t:"Como se chama a dificuldade de enxergar de longe?",ok:"miopia",d:["gripe","cárie"],e:"👓",p:"Quem tem miopia enxerga bem de perto, mal de longe."},
  {t:"O tato é mais sensível em qual parte do corpo?",ok:"na ponta dos dedos",d:["no cotovelo","no calcanhar"],e:"👆",p:"A ponta dos dedos tem muitas terminações nervosas."}
 ]
};

var B_BRASIL={
 1:[
  {t:"Em que país a gente mora?",ok:"Brasil",d:["Portugal","Argentina"],e:"🇧🇷",p:"Moramos no Brasil."},
  {t:"Que língua a gente fala no Brasil?",ok:"português",d:["espanhol","inglês"],e:"🗣️",p:"A língua do Brasil é o português."},
  {t:"Quais são as cores da bandeira do Brasil?",ok:"verde, amarelo, azul e branco",d:["vermelho e preto","rosa e roxo"],e:"🇧🇷",p:"Verde, amarelo, azul e branco."},
  {t:"Qual é um animal bem brasileiro?",ok:"🦜",d:["🐧","🐨"],emoji:true,p:"A arara é um animal típico do Brasil."},
  {t:"Qual comida é bem brasileira?",ok:"feijoada",d:["sushi","pizza"],e:"🍲",p:"A feijoada é um prato típico do Brasil."},
  {t:"Qual esporte o Brasil mais gosta?",ok:"futebol",d:["hóquei no gelo","esqui"],e:"⚽",p:"O futebol é a paixão nacional."},
  {t:"Qual é a maior floresta do Brasil?",ok:"a Amazônia",d:["o Saara","a Sibéria"],e:"🌳",p:"A Amazônia é a maior floresta tropical do mundo."}
 ],
 2:[
  {t:"Qual é a capital do Brasil?",ok:"Brasília",d:["São Paulo","Rio de Janeiro"],e:"🏛️",p:"Brasília é a capital desde 1960."},
  {t:"Quantas regiões tem o Brasil?",ok:"5",d:["2","10"],e:"🗺️",p:"Norte, Nordeste, Centro-Oeste, Sudeste e Sul."},
  {t:"Qual é o rio mais famoso da Amazônia?",ok:"rio Amazonas",d:["rio Tietê","rio Nilo"],e:"🌊",p:"O Amazonas é o rio com mais água do mundo."},
  {t:"Qual é a moeda do Brasil?",ok:"o real",d:["o dólar","o euro"],e:"🪙",p:"A moeda brasileira é o real."},
  {t:"Quem morava no Brasil antes dos portugueses chegarem?",ok:"os povos indígenas",d:["ninguém","os ingleses"],e:"🏹",p:"Muitos povos indígenas já viviam aqui."},
  {t:"Qual é a festa brasileira mais conhecida no mundo?",ok:"o Carnaval",d:["o Halloween","o Ano-Novo chinês"],e:"🎭",p:"O Carnaval é famoso no mundo inteiro."},
  {t:"Qual é o bioma seco do Nordeste, com cactos?",ok:"a Caatinga",d:["o Pantanal","a Mata Atlântica"],e:"🌵",p:"A Caatinga só existe no Brasil."},
  {t:"Qual é a maior área alagada do Brasil, cheia de bichos?",ok:"o Pantanal",d:["o Cerrado","o Pampa"],e:"🐊",p:"O Pantanal é a maior planície alagada do mundo."}
 ],
 3:[
  {t:"Quantos estados tem o Brasil?",ok:"26 estados e o Distrito Federal",d:["10 estados","50 estados"],e:"🗺️",p:"São 26 estados mais o Distrito Federal."},
  {t:"Em que dia se comemora a Independência do Brasil?",ok:"7 de setembro",d:["21 de abril","1º de maio"],e:"🇧🇷",p:"A Independência foi em 7 de setembro de 1822."},
  {t:"Qual bioma brasileiro é uma savana, com árvores tortas?",ok:"o Cerrado",d:["a Amazônia","o Pampa"],e:"🌿",p:"O Cerrado fica no centro do Brasil."},
  {t:"Que oceano banha o litoral do Brasil?",ok:"o Atlântico",d:["o Pacífico","o Índico"],e:"🌊",p:"Todo o litoral brasileiro é no oceano Atlântico."},
  {t:"Qual é o estado mais populoso do Brasil?",ok:"São Paulo",d:["Acre","Roraima"],e:"🏙️",p:"São Paulo tem mais gente que qualquer outro estado."},
  {t:"Quem foi Tarsila do Amaral?",ok:"uma pintora brasileira",d:["uma cantora americana","uma atleta"],e:"🎨",p:"Tarsila pintou o famoso quadro Abaporu."},
  {t:"A Mata Atlântica fica principalmente onde?",ok:"perto do litoral",d:["no meio do deserto","só no Norte"],e:"🌴",p:"Ela acompanha a costa brasileira."},
  {t:"O que é o Dia do Índio, em 19 de abril?",ok:"um dia para lembrar os povos indígenas",d:["um feriado do futebol","o aniversário do Brasil"],e:"🏹",p:"É uma data para valorizar a cultura indígena."}
 ]
};

var CIENCIAS=[
 porCasos("Animais","ciencias",B_ANIMAIS),
 porCasos("Plantas","ciencias",B_PLANTAS),
 porCasos("Corpo e saúde","ciencias",B_CORPO),
 porCasos("Tempo e natureza","ciencias",B_TEMPO),
 porCasos("Cuidar do planeta","ciencias",B_PLANETA),
 porCasos("Espaço","ciencias",B_ESPACO),
 porCasos("Materiais","ciencias",B_MATERIAIS),
 porCasos("Os cinco sentidos","ciencias",B_SENTIDOS),
 porCasos("Meu Brasil","ciencias",B_BRASIL)
];

/* =========================================================
   HABILIDADES QUE NÃO SÃO DE MÚLTIPLA ESCOLHA
   ========================================================= */
var INTERATIVAS=[

/* ---------- montar a palavra com as sílabas ---------- */
{tag:"Montar a palavra",area:"leitura",fn:function(nv){
  var lista=nv<=1?P2:(nv===2?P3:P3.concat(P4));
  var w=pick(lista);
  return ordenar({t:"Monte a palavra na ordem certa:",
    fala:"Monte a palavra "+w.p+", tocando nas sílabas na ordem certa.",
    e:w.e, certo:w.s, p:w.p.toUpperCase()+" se separa assim: "+w.s.join(" - ")+"."});
}},

/* ---------- montar a frase ---------- */
{tag:"Montar a frase",area:"leitura",fn:function(nv){
  var banco=FRASES[nv]||FRASES[2];
  var curtas=banco.filter(function(f){ var n=f.f.split(" ").length; return nv<=1?n<=4:(nv===2?n<=6:n<=8); });
  var f=pick(curtas.length?curtas:banco);
  return ordenar({t:"Coloque as palavras na ordem certa:",
    fala:"Monte a frase tocando nas palavras na ordem certa.",
    certo:f.f.split(" "), cola:false,
    p:"A frase certa é: "+f.f+"."});
}},

/* ---------- colocar números em ordem ---------- */
{tag:"Colocar em ordem",area:"mat",fn:function(nv){
  var lim=nv<=1?20:(nv===2?100:999), n=nv<=1?3:4, set=[];
  while(set.length<n){ var x=rnd(1,lim); if(set.indexOf(x)<0) set.push(x); }
  var crescente=Math.random()<0.5;
  var certo=set.slice().sort(function(a,b){ return crescente?a-b:b-a; });
  return ordenar({t:"Toque nos números "+(crescente?"do MENOR para o MAIOR":"do MAIOR para o MENOR")+":",
    fala:"Toque nos números "+(crescente?"do menor para o maior":"do maior para o menor")+".",
    certo:certo, cola:false,
    p:"Em ordem "+(crescente?"crescente":"decrescente")+": "+certo.join(", ")+"."});
}},

/* ---------- ligar os pares ---------- */
{tag:"Ligar os pares",area:"racio",fn:function(nv){
  var banco=[
    {a:"🧤",b:"✋"},{a:"👟",b:"🦶"},{a:"🔑",b:"🚪"},{a:"🪥",b:"🦷"},
    {a:"✏️",b:"📓"},{a:"☂️",b:"🌧️"},{a:"🕶️",b:"☀️"},{a:"🐝",b:"🍯"},
    {a:"🐄",b:"🥛"},{a:"🐔",b:"🥚"},{a:"✂️",b:"📄"},{a:"🔨",b:"🔩"},
    {a:"🎣",b:"🐟"},{a:"🧦",b:"👞"},{a:"🍞",b:"🧈"},{a:"🖌️",b:"🎨"}
  ];
  var n=nv<=1?3:4;
  return ligar({t:"Ligue cada figura com o par dela:",
    fala:"Toque numa figura da esquerda e depois no par dela na direita.",
    pares:paresDistintos(banco,n,function(x){return x.a;},function(x){return x.b;}),
    emojiEsq:true, emojiDir:true,
    p:"Cada coisa combina com aquela que a gente usa junto com ela."});
}},

/* ---------- ligar inglês e português ---------- */
{tag:"Ligar em inglês",area:"ingles",fn:function(nv){
  var lista=vocab(nv), n=nv<=1?3:4;
  return ligar({t:"Ligue a palavra em inglês com o que ela quer dizer:",
    fala:"Toque numa palavra em inglês e depois no significado dela.",
    pares:paresDistintos(lista,n,function(x){return x.en;},function(x){return x.pt;}),
    p:"Cada palavra em inglês tem um significado só em português."});
}},

/* ---------- ligar a conta com o resultado ---------- */
{tag:"Ligar as contas",area:"mat",fn:function(nv){
  var n=nv<=1?3:4, vistos={}, lista=[], g=0;
  while(lista.length<n && g++<200){
    var a,b,sinal,r;
    if(nv<=1){ a=rnd(1,6); b=rnd(1,6); sinal="+"; r=a+b; }
    else if(nv===2){ if(Math.random()<0.5){ a=rnd(3,12); b=rnd(2,9); sinal="+"; r=a+b; }
                     else { a=rnd(6,18); b=rnd(1,5); sinal="−"; r=a-b; } }
    else { if(Math.random()<0.5){ a=rnd(10,40); b=rnd(5,20); sinal="+"; r=a+b; }
           else { a=rnd(20,60); b=rnd(5,20); sinal="−"; r=a-b; } }
    if(vistos[r]) continue;
    vistos[r]=1;
    lista.push([a+" "+sinal+" "+b, String(r)]);
  }
  return ligar({t:"Ligue cada conta com o resultado dela:",
    fala:"Toque numa conta e depois no resultado certo.",
    pares:lista,
    p:lista.map(function(x){return x[0]+" = "+x[1];}).join("  ·  ")});
}}

];

/* ---------- textos para ler em voz alta ---------- */
var TEXTOS_VOZ={
 1:["O sapo pulou na lagoa. Ele viu um peixe azul.",
    "A bola caiu no muro. O cachorro pegou a bola.",
    "O pato e a pata foram nadar. Depois comeram milho.",
    "Meu gato dorme no sofá. Quando acorda, pede comida.",
    "A vaca come capim. Ela dá leite para nós.",
    "O bebê tomou mamadeira. Depois dormiu no colo da mamãe.",
    "Eu tenho uma pipa azul. Ela voa bem alto.",
    "A mesa tem um bolo. O bolo é de chocolate.",
    "O menino pegou a mala. Ele vai viajar hoje.",
    "A lua saiu no céu. As estrelas piscam para mim."],
 2:["A mamãe fez um bolo de milho. A casa ficou cheirosa.",
    "Hoje eu fui na escola. Minha amiga me deu um desenho.",
    "A abelha voa de flor em flor. Ela faz mel para a gente.",
    "O vovô tem um chapéu velho. Ele usa para cuidar da horta.",
    "No sábado eu ajudei a lavar o carro. Molhei o pé inteiro.",
    "O gato subiu no telhado e não queria descer. O papai buscou a escada.",
    "Minha professora contou uma história de dragão. Todo mundo bateu palma.",
    "Plantei uma semente num copinho. Depois de uma semana nasceu um broto verde.",
    "A formiga carregou uma folha bem maior que ela. Fiquei olhando um tempão.",
    "Perdi meu dente da frente. A minha voz ficou engraçada."],
 3:["Choveu muito de manhã. Depois o sol apareceu e fez um arco-íris no céu.",
    "Na festa tinha bolo, suco e balão. Todo mundo cantou junto e ganhou doce.",
    "A borboleta era uma lagarta. Ela dormiu dentro do casulo e acordou com asas coloridas.",
    "No sábado fomos ao parque. Andei de bicicleta, tomei sorvete e voltei cansado, mas feliz.",
    "O astronauta entrou no foguete e contou até zero. A nave subiu com muito barulho e sumiu no céu.",
    "Meu time jogou na chuva e o campo ficou cheio de lama. Mesmo assim a gente ganhou de dois a um.",
    "A tartaruga andava devagar, mas nunca parava. Quando o coelho acordou, ela já tinha chegado.",
    "Fui à biblioteca e escolhi um livro de dinossauros. Descobri que o tiranossauro tinha dentes maiores que a minha mão.",
    "A vizinha trouxe um filhote de cachorro. Ele tropeçava nas próprias patas e lambia todo mundo.",
    "No fim da tarde o céu ficou laranja. O vovô disse que aquilo é o pôr do sol, e ficamos olhando em silêncio."]
};

/* ---------- exportação ---------- */
/* confere se a questão tem o que o formato dela precisa para ser jogada */
function jogavel(q){
  if(!q||!q.txt) return false;
  switch(q.formato){
    case "digitar": return typeof q.resposta==="string" && /^[0-9]+$/.test(q.resposta);
    case "ordenar": return Array.isArray(q.certo) && q.certo.length>=2 &&
                           Array.isArray(q.pecas) && q.pecas.length===q.certo.length;
    case "ligar":   return Array.isArray(q.pares) && q.pares.length>=2 &&
                           q.pares.every(function(x){ return Array.isArray(x) && x.length===2 && x[0] && x[1]; });
    default:        return Array.isArray(q.ops) && q.ops.length>=2 &&
                           q.ops.filter(function(o){return o.ok;}).length===1;
  }
}


var TIPOS=LEITURA.concat(MAT).concat(RACIO).concat(INGLES).concat(CIENCIAS).concat(INTERATIVAS);
var POR_TAG={};
TIPOS.forEach(function(t){ POR_TAG[t.tag]=t; });

window.QUESTOES={
  areas:{
    leitura:{nome:"Ler e escrever",emo:"📖",ds:"Sílabas, palavras e frases"},
    mat:{nome:"Números",emo:"🔢",ds:"Contas, problemas e formas"},
    racio:{nome:"Detetive",emo:"🔍",ds:"Padrões, memória e atenção"},
    ingles:{nome:"English",emo:"🌎",ds:"Palavras e frases em inglês"},
    ciencias:{nome:"Descobrir",emo:"🔬",ds:"Bichos, plantas, corpo, espaço e Brasil"},
    voz:{nome:"Ler em voz alta",emo:"🗣️",ds:"Leia para um adulto ouvir"}
  },
  ordem:["leitura","mat","racio","ingles","ciencias","voz"],
  tipos:TIPOS,
  porTag:POR_TAG,
  tiposDaArea:function(area){ return TIPOS.filter(function(t){return t.area===area;}); },
  /* uma questão só serve se o formato dela estiver completo */
  jogavel:jogavel,
  /* gera uma questão de uma habilidade específica — usado pela revisão */
  gerar:function(tag,nivel){
    var t=POR_TAG[tag];
    if(!t) return null;
    var q;
    try{ q=t.fn(nivel||1); }catch(e){ return null; }
    if(!jogavel(q)) return null;
    q.tag=t.tag; q.area=t.area; q.nivel=nivel||1;
    return q;
  },
  textoVoz:function(nivel,indice){
    var lista=TEXTOS_VOZ[nivel]||TEXTOS_VOZ[2];
    return lista[indice % lista.length];
  },
  utils:{shuffle:shuffle,pick:pick,pickN:pickN,rnd:rnd}
};

})();
