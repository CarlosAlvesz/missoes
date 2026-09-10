/* =========================================================
   Banco de questões — 1º ano do fundamental
   Cada habilidade tem uma função geradora que recebe o nível
   (1 = começando, 2 = firme, 3 = desafio) e devolve uma questão.
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
  while(set.length<3&&g++<120){var c=extras(); if(c>=0&&set.indexOf(c)<0)set.push(c);}
  return shuffle(set.map(function(c){return {t:String(c),ok:c===certo};}));
}

/* ---------- vocabulário ---------- */
var P2=[ /* duas sílabas */
 {p:"bola",s:["bo","la"],e:"⚽"},{p:"gato",s:["ga","to"],e:"🐱"},{p:"casa",s:["ca","sa"],e:"🏠"},
 {p:"pato",s:["pa","to"],e:"🦆"},{p:"sapo",s:["sa","po"],e:"🐸"},{p:"bolo",s:["bo","lo"],e:"🎂"},
 {p:"dedo",s:["de","do"],e:"👆"},{p:"luva",s:["lu","va"],e:"🧤"},{p:"mala",s:["ma","la"],e:"🧳"},
 {p:"vaca",s:["va","ca"],e:"🐄"},{p:"pipa",s:["pi","pa"],e:"🪁"},{p:"rato",s:["ra","to"],e:"🐭"},
 {p:"sino",s:["si","no"],e:"🔔"},{p:"cama",s:["ca","ma"],e:"🛏️"},{p:"lua",s:["lu","a"],e:"🌙"},
 {p:"ovo",s:["o","vo"],e:"🥚"},{p:"uva",s:["u","va"],e:"🍇"},{p:"peixe",s:["pei","xe"],e:"🐟"},
 {p:"chuva",s:["chu","va"],e:"🌧️"},{p:"folha",s:["fo","lha"],e:"🍃"},{p:"faca",s:["fa","ca"],e:"🔪"}
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
 {p:"tesoura",s:["te","sou","ra"],e:"✂️"},{p:"formiga",s:["for","mi","ga"],e:"🐜"}
];
var P4=[ /* quatro sílabas */
 {p:"borboleta",s:["bor","bo","le","ta"],e:"🦋"},{p:"elefante",s:["e","le","fan","te"],e:"🐘"},
 {p:"melancia",s:["me","lan","ci","a"],e:"🍉"},{p:"bicicleta",s:["bi","ci","cle","ta"],e:"🚲"},
 {p:"dinossauro",s:["di","nos","sau","ro"],e:"🦕"},{p:"geladeira",s:["ge","la","dei","ra"],e:"🧊"},
 {p:"computador",s:["com","pu","ta","dor"],e:"💻"},{p:"passarinho",s:["pas","sa","ri","nho"],e:"🐦"}
];
function palavras(nv){ return nv<=1?P2:(nv===2?P2.concat(P3):P3.concat(P4)); }
var TODAS=P2.concat(P3).concat(P4);

var ESCRITA={
 1:[["casa","caza"],["bola","bóla"],["gato","gatu"],["dedo","dédo"],["mala","malla"],["sapo","sapu"]],
 2:[["chuva","xuva"],["escola","iscola"],["menino","minino"],["garrafa","garafa"],["janela","janéla"],["tomate","tumate"]],
 3:[["coelho","coelio"],["abelha","abeia"],["mulher","mulier"],["cachorro","caxorro"],["palhaço","paliaço"],
    ["passarinho","pasarinho"],["trabalho","trabaio"],["dinheiro","dinhero"],["bicicleta","bicicreta"],["família","familha"]]
};

var FRASES={
 1:[{f:"o gato bebe leite",ok:"🐱",d:["🐶","🐦"]},
    {f:"a bola é azul",ok:"⚽",d:["🎈","📚"]},
    {f:"o pato está no lago",ok:"🦆",d:["🐟","🐸"]},
    {f:"eu como uma maçã",ok:"🍎",d:["🍌","🍉"]}],
 2:[{f:"o gato subiu no telhado",ok:"🐱",d:["🐶","🐴"]},
    {f:"a abelha pousou na flor",ok:"🌻",d:["🌵","🍄"]},
    {f:"o papai dirige o carro",ok:"🚗",d:["🚲","✈️"]},
    {f:"a vovó fez um bolo",ok:"🎂",d:["🍕","🥗"]},
    {f:"o cachorro achou o osso",ok:"🦴",d:["🧦","🔑"]}],
 3:[{f:"depois da chuva apareceu o arco-íris",ok:"🌈",d:["❄️","🔥"]},
    {f:"o menino esqueceu a mochila na escola",ok:"🎒",d:["🧦","🍿"]},
    {f:"a borboleta saiu do casulo e voou",ok:"🦋",d:["🐛","🐢"]},
    {f:"o time ganhou o jogo e todos comemoraram",ok:"🏆",d:["🎹",  "🧹"]}]
};

var OPOSTOS=[["grande","pequeno"],["alto","baixo"],["quente","frio"],["cheio","vazio"],
 ["dia","noite"],["novo","velho"],["rápido","devagar"],["dentro","fora"],["em cima","embaixo"],["longe","perto"]];

/* =========================================================
   LEITURA E ESCRITA
   ========================================================= */
var LEITURA=[
{tag:"Letra inicial",area:"leitura",fn:function(nv){
  var w=pick(palavras(nv)), L=w.p[0].toUpperCase();
  var alfa="BCDFGJLMPRSTVN".split("").filter(function(c){return c!==L;});
  return {txt:"Com que letra começa?",fala:"Com que letra começa "+w.p+"?",
    fig:w.e,figGrande:true,ops:shuffle([{t:L,ok:true}].concat(pickN(alfa,nv>=3?3:2).map(function(c){return {t:c,ok:false};}))),cols:3};
}},
{tag:"Sílaba inicial",area:"leitura",fn:function(nv){
  var lista=palavras(nv), w=pick(lista), sil=w.s[0];
  var outras=pickN(lista.filter(function(x){return x.s[0]!==sil;}),nv>=3?3:2);
  return {txt:"Qual palavra começa com "+sil.toUpperCase()+"?",fala:"Qual palavra começa com "+sil+"?",
    ops:shuffle([{t:w.p,ok:true}].concat(outras.map(function(x){return {t:x.p,ok:false};}))),cols:3};
}},
{tag:"Contar sílabas",area:"leitura",fn:function(nv){
  var w=pick(palavras(nv)), n=w.s.length;
  return {txt:"Quantas sílabas tem "+w.p.toUpperCase()+"?",fala:"Quantas sílabas tem "+w.p+"?",
    fig:w.e,figGrande:true,ops:opsNum(n,function(){return rnd(1,5);}),cols:3};
}},
{tag:"Juntar sílabas",area:"leitura",fn:function(nv){
  var lista=nv<=1?P2:(nv===2?P2.concat(P3):P3);
  var w=pick(lista);
  var junta=w.s.join(" + ").toUpperCase();
  var errada=w.s.slice().reverse().join("");
  var outra=pick(lista.filter(function(x){return x.p!==w.p;})).p;
  return {txt:"Junte as sílabas: "+junta,fala:"Junte as sílabas: "+w.s.join(", ")+". Que palavra forma?",
    ops:ops(w.p,[w.p,errada,outra]),cols:3};
}},
{tag:"Ler palavra",area:"leitura",fn:function(nv){
  var lista=palavras(nv), w=pick(lista);
  var outras=pickN(lista.filter(function(x){return x.p!==w.p;}),2);
  return {txt:"Que palavra é esta figura?",fala:"Que palavra é esta figura?",fig:w.e,figGrande:true,
    ops:shuffle([{t:w.p,ok:true}].concat(outras.map(function(x){return {t:x.p,ok:false};}))),cols:3};
}},
{tag:"Escrita correta",area:"leitura",fn:function(nv){
  var par=pick(ESCRITA[nv]||ESCRITA[2]);
  return {txt:"Qual está escrita do jeito certo?",fala:"Qual está escrita do jeito certo?",
    ops:ops(par[0],[par[0],par[1]]),cols:2};
}},
{tag:"Ler frase",area:"leitura",fn:function(nv){
  var f=pick(FRASES[nv]||FRASES[2]);
  return {txt:"Leia e escolha a figura certa:",fala:f.f,frase:f.f,
    ops:shuffle([{t:f.ok,ok:true}].concat(f.d.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:true};
}},
{tag:"Contrários",area:"leitura",fn:function(nv){
  var par=pick(OPOSTOS), inv=Math.random()<0.5;
  var alvo=inv?par[1]:par[0], certo=inv?par[0]:par[1];
  var outros=pickN(OPOSTOS.filter(function(x){return x[0]!==par[0];}),2).map(function(x){return x[1];});
  return {txt:"Qual é o contrário de "+alvo.toUpperCase()+"?",fala:"Qual é o contrário de "+alvo+"?",
    ops:ops(certo,[certo].concat(outros)),cols:3};
}},
{tag:"Singular e plural",area:"leitura",fn:function(nv){
  var w=pick(palavras(nv));
  var plural=/[rlz]$/.test(w.p)?(w.p+"es"):(/m$/.test(w.p)?w.p.slice(0,-1)+"ns":w.p+"s");
  return {txt:"Como fica MUITOS "+w.p.toUpperCase()+"?",fala:"Como fica no plural: muitos "+w.p+"?",
    fig:w.e,figGrande:true,ops:ops(plural,[plural,w.p+"is",w.p]),cols:3};
}}
];

/* =========================================================
   MATEMÁTICA
   ========================================================= */
function relogio(hora,meia){
  var ah=(hora%12)*30+(meia?15:0), am=meia?180:0, r=52;
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
var EMOJI_CONTA=["🍎","⭐","🐟","🚗","🌻","🧦","🍌","⚽","🎈","🐝"];

var MAT=[
{tag:"Contar",area:"mat",fn:function(nv){
  var n=nv<=1?rnd(3,9):(nv===2?rnd(8,15):rnd(14,24)), e=pick(EMOJI_CONTA);
  return {txt:"Quantos você vê aqui?",fala:"Quantos você vê aqui?",
    fig:new Array(n+1).join(e+" "),ops:opsNum(n,function(){return n+rnd(-3,3);}),cols:3};
}},
{tag:"Soma",area:"mat",fn:function(nv){
  var a,b;
  if(nv<=1){a=rnd(1,5);b=rnd(1,5);} else if(nv===2){a=rnd(3,9);b=rnd(3,9);} else {a=rnd(10,29);b=rnd(5,19);}
  var q={txt:"Quanto é?",fala:a+" mais "+b,conta:a+" + "+b+" = ?",
    ops:opsNum(a+b,function(){return a+b+rnd(-4,4);}),cols:3};
  if(nv<=2) q.fig=new Array(a+1).join("🔵 ")+" + "+new Array(b+1).join("🟢 ");
  return q;
}},
{tag:"Subtração",area:"mat",fn:function(nv){
  var a,b;
  if(nv<=1){a=rnd(3,9);b=rnd(1,a-1);} else if(nv===2){a=rnd(8,18);b=rnd(2,8);} else {a=rnd(20,49);b=rnd(5,19);}
  var q={txt:"Quanto é?",fala:a+" menos "+b,conta:a+" − "+b+" = ?",
    ops:opsNum(a-b,function(){return a-b+rnd(-4,4);}),cols:3};
  if(nv<=1) q.fig=new Array(a+1).join("🔵 ");
  return q;
}},
{tag:"Sequência",area:"mat",fn:function(nv){
  var passo=nv<=1?1:(nv===2?pick([2,5,10]):pick([3,4,25])), ini=passo*rnd(1,4);
  var seq=[ini,ini+passo,ini+passo*2], certo=ini+passo*3;
  return {txt:"Qual número vem depois?",fala:"Qual número vem depois de "+seq.join(", ")+"?",
    conta:seq.join(", ")+", ?",ops:ops(String(certo),[String(certo),String(certo+passo),String(certo-1)]),cols:3};
}},
{tag:"Maior e menor",area:"mat",fn:function(nv){
  var lim=nv<=1?9:(nv===2?99:999);
  var a=rnd(2,lim), b=rnd(2,lim); while(b===a)b=rnd(2,lim);
  var maior=Math.random()<0.5, certo=maior?Math.max(a,b):Math.min(a,b);
  return {txt:"Qual número é "+(maior?"o MAIOR":"o MENOR")+"?",fala:"Qual número é "+(maior?"o maior":"o menor")+"?",
    ops:shuffle([{t:String(a),ok:a===certo},{t:String(b),ok:b===certo}]),cols:2};
}},
{tag:"Dobro e metade",area:"mat",fn:function(nv){
  var dobro=Math.random()<0.5, teto=nv<=1?5:(nv===2?10:20);
  var n=dobro?rnd(2,teto):rnd(1,teto)*2, certo=dobro?n*2:n/2;
  return {txt:(dobro?"O dobro de ":"A metade de ")+n+" é quanto?",fala:(dobro?"O dobro de ":"A metade de ")+n+" é quanto?",
    ops:opsNum(certo,function(){return certo+rnd(-4,4);}),cols:3};
}},
{tag:"Antes e depois",area:"mat",fn:function(nv){
  var lim=nv<=1?20:(nv===2?99:499);
  var n=rnd(3,lim), antes=Math.random()<0.5, certo=antes?n-1:n+1;
  return {txt:"Qual número vem "+(antes?"ANTES":"DEPOIS")+" do "+n+"?",fala:"Qual número vem "+(antes?"antes":"depois")+" do "+n+"?",
    ops:opsNum(certo,function(){return certo+rnd(-5,5);}),cols:3};
}},
{tag:"Probleminha",area:"mat",fn:function(nv){
  var f=nv<=1?1:(nv===2?2:4);
  var mods=[
    function(){var a=rnd(3,6)*f,b=rnd(2,5)*f;return {t:"Eu tinha "+a+" bolinhas de gude e ganhei mais "+b+". Com quantas eu fiquei?",r:a+b};},
    function(){var a=rnd(5,9)*f,b=rnd(2,4)*f;return {t:"Tinha "+a+" balas no pote e comi "+b+". Quantas sobraram?",r:a-b};},
    function(){var a=rnd(3,7)*f,b=rnd(2,5)*f;return {t:"Tinha "+a+" crianças no parque e chegaram mais "+b+". Quantas são agora?",r:a+b};},
    function(){var a=rnd(6,10)*f,b=rnd(2,5)*f;return {t:"Eu tinha "+a+" reais e gastei "+b+". Quanto sobrou?",r:a-b};},
    function(){var a=rnd(2,5);return {t:"Cada caixa tem "+a+" lápis. Quantos lápis tem em "+(nv>=3?3:2)+" caixas?",r:a*(nv>=3?3:2)};}
  ];
  if(nv>=3) mods.push(function(){
    var a=rnd(10,20),b=rnd(3,8),c=rnd(2,5);
    return {t:"Tinha "+a+" figurinhas, ganhei "+b+" e dei "+c+" para um amigo. Com quantas fiquei?",r:a+b-c};
  });
  var m=pick(mods)();
  return {txt:m.t,fala:m.t,ops:opsNum(m.r,function(){return m.r+rnd(-6,6);}),cols:3};
}},
{tag:"Ver as horas",area:"mat",fn:function(nv){
  var h=rnd(1,12), meia=nv<=1?false:(nv===2?Math.random()<0.4:Math.random()<0.6);
  var certo=meia?(h+" e meia"):(h+" horas"), set=[certo];
  while(set.length<3){var h2=rnd(1,12),m2=nv>=2&&Math.random()<0.5;var t=m2?(h2+" e meia"):(h2+" horas");if(set.indexOf(t)<0)set.push(t);}
  return {txt:"Que horas o relógio está mostrando?",fala:"Que horas o relógio está mostrando?",
    svg:relogio(h,meia),ops:ops(certo,set),cols:3};
}},
{tag:"Dinheiro",area:"mat",fn:function(nv){
  var moedas=nv<=1?[1,1,1]:(nv===2?[1,2,5,1]:[2,5,10,5,1]);
  var tot=moedas.reduce(function(s,x){return s+x;},0);
  return {txt:"Quanto dinheiro tem aqui, no total?",fala:"Quanto dinheiro tem aqui no total?",
    fig:moedas.map(function(m){return "🪙"+m;}).join("  "),
    ops:opsNum(tot,function(){return tot+rnd(-5,5);}),cols:3};
}},
{tag:"Formas",area:"mat",fn:function(nv){
  var formas=[{n:"círculo",e:"⭕",l:0},{n:"quadrado",e:"🟦",l:4},{n:"triângulo",e:"🔺",l:3},{n:"retângulo",e:"▬",l:4},{n:"estrela",e:"⭐",l:5}];
  var f=pick(formas);
  if(nv>=3&&f.l>0){
    return {txt:"Quantos lados tem esta forma?",fala:"Quantos lados tem esta forma?",fig:f.e,figGrande:true,
      ops:opsNum(f.l,function(){return rnd(0,6);}),cols:3};
  }
  var outras=pickN(formas.filter(function(x){return x.n!==f.n;}),2);
  return {txt:"Que forma é esta?",fala:"Que forma é esta?",fig:f.e,figGrande:true,
    ops:shuffle([{t:f.n,ok:true}].concat(outras.map(function(x){return {t:x.n,ok:false};}))),cols:3};
}}
];

/* =========================================================
   RACIOCÍNIO E ATENÇÃO
   ========================================================= */
var POOL=["🍎","⚽","🐶","🚗","⭐","🌻","🐟","🧦","🎈","🍌","🔑","🪁","🧩","🎩","🦋","🍕"];
var GRUPOS=[
 {c:"animais",itens:["🐶","🐱","🐴","🐮","🐷","🐰"],fora:["🚗","🍎","👟","🌳","🪑"]},
 {c:"frutas",itens:["🍎","🍌","🍇","🍉","🍓","🍐"],fora:["🐸","🚲","🧦","⚽","🔑"]},
 {c:"transportes",itens:["🚗","🚌","✈️","🚲","🚂","🚁"],fora:["🍕","🐦","🪑","🌻","👕"]},
 {c:"roupas",itens:["👕","👖","🧦","🧢","👗","🧥"],fora:["🍰","🐟","🚀","🔑","🌙"]},
 {c:"comidas",itens:["🍕","🍞","🍰","🧀","🍔","🥗"],fora:["🐝","🚗","📚","⭐","🧦"]},
 {c:"coisas da escola",itens:["✏️","📚","🎒","✂️","📐","🖍️"],fora:["🐄","🍉","🚿","⛰️","🎸"]}
];

var RACIO=[
{tag:"Padrão",area:"racio",fn:function(nv){
  var seq,certo,erradas;
  if(nv<=1){var p=pickN(POOL,2);seq=[p[0],p[1],p[0],p[1],p[0]];certo=p[1];erradas=[p[0],pick(POOL.filter(function(x){return p.indexOf(x)<0;}))];}
  else if(nv===2){var t=pickN(POOL,3);seq=[t[0],t[1],t[2],t[0],t[1]];certo=t[2];erradas=[t[0],t[1]];}
  else {var q=pickN(POOL,2);seq=[q[0],q[1],q[1],q[0],q[1],q[1]];certo=q[0];erradas=[q[1],pick(POOL.filter(function(x){return q.indexOf(x)<0;}))];}
  return {txt:"O que vem agora?",fala:"Olhe bem a sequência. O que vem agora?",
    fig:seq.join(" ")+" ❓",ops:shuffle([{t:certo,ok:true}].concat(erradas.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:true};
}},
{tag:"Achar o intruso",area:"racio",fn:function(nv){
  var g=pick(GRUPOS), n=nv<=1?3:(nv===2?4:5);
  var itens=pickN(g.itens,Math.min(n,g.itens.length)), fora=pick(g.fora);
  return {txt:"Qual não é do grupo das "+g.c+"?",fala:"Qual não é do grupo das "+g.c+"?",
    ops:shuffle(itens.map(function(x){return {t:x,ok:false};}).concat([{t:fora,ok:true}])),cols:nv<=1?2:3,emoji:true};
}},
{tag:"Memória",area:"racio",fn:function(nv){
  var n=nv<=1?4:(nv===2?5:7), seg=nv<=1?6:(nv===2?5:4);
  var itens=pickN(POOL,n), sumido=pick(itens);
  var resto=itens.filter(function(x){return x!==sumido;});
  return {txt:"Qual figura sumiu?",fala:"Qual figura sumiu?",fig:resto.join(" "),
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
    fig:shuffle(mist).join(" "),ops:opsNum(n,function(){return n+rnd(-3,3);}),cols:3};
}},
{tag:"Ordem dos fatos",area:"racio",fn:function(nv){
  var casos=[
    {a:"🥚",b:"🐣",t:"O que acontece primeiro?"},{a:"🌱",b:"🌳",t:"O que acontece primeiro?"},
    {a:"🌧️",b:"🌈",t:"O que acontece primeiro?"},{a:"🥣",b:"🎂",t:"O que vem primeiro quando fazemos um bolo?"},
    {a:"👶",b:"🧒",t:"O que acontece primeiro?"},{a:"🌰",b:"🌻",t:"O que acontece primeiro?"}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,ops:shuffle([{t:c.a,ok:true},{t:c.b,ok:false}]),cols:2,emoji:true};
}},
{tag:"Comparar",area:"racio",fn:function(nv){
  var casos=[
    {ops:["🐘","🐭","🐈"],ok:"🐘",t:"Qual é o maior de verdade?"},
    {ops:["🐜","🐕","🦒"],ok:"🦒",t:"Qual é o maior de verdade?"},
    {ops:["🚲","🚌","🛴"],ok:"🚌",t:"Qual é o maior de verdade?"},
    {ops:["🐋","🐟","🦐"],ok:"🦐",t:"Qual é o menor de verdade?"},
    {ops:["🏠","⛰️","🌳"],ok:"⛰️",t:"Qual é o maior de verdade?"},
    {ops:["🪶","🪨","🎈"],ok:"🪨",t:"Qual é o mais pesado?"}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,ops:shuffle(c.ops.map(function(x){return {t:x,ok:x===c.ok};})),cols:3,emoji:true};
}},
{tag:"Adivinha",area:"racio",fn:function(nv){
  var casos=[
    {t:"Tem quatro patas, late e é amigo do homem. Quem é?",ok:"🐶",d:["🐦","🐟"]},
    {t:"Voa, faz mel e mora numa colmeia. Quem é?",ok:"🐝",d:["🦋","🐜"]},
    {t:"É amarelo, fica no céu e esquenta a gente. O que é?",ok:"☀️",d:["🌙","⭐"]},
    {t:"Tem folhas, dá sombra e fica plantada. O que é?",ok:"🌳",d:["🏠","🚗"]},
    {t:"Serve para escrever e vai ficando pequeno. O que é?",ok:"✏️",d:["📚","✂️"]},
    {t:"Mora na água, tem escamas e nada. Quem é?",ok:"🐟",d:["🐴","🐔"]}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:true};
}}
];

/* =========================================================
   INGLÊS
   ========================================================= */
var EN1=[{en:"dog",pt:"cachorro",e:"🐶"},{en:"cat",pt:"gato",e:"🐱"},{en:"bird",pt:"pássaro",e:"🐦"},
 {en:"fish",pt:"peixe",e:"🐟"},{en:"apple",pt:"maçã",e:"🍎"},{en:"milk",pt:"leite",e:"🥛"},
 {en:"sun",pt:"sol",e:"☀️"},{en:"ball",pt:"bola",e:"⚽"},{en:"car",pt:"carro",e:"🚗"},{en:"house",pt:"casa",e:"🏠"}];
var EN2=[{en:"horse",pt:"cavalo",e:"🐴"},{en:"bread",pt:"pão",e:"🍞"},{en:"water",pt:"água",e:"💧"},
 {en:"book",pt:"livro",e:"📚"},{en:"pencil",pt:"lápis",e:"✏️"},{en:"chair",pt:"cadeira",e:"🪑"},
 {en:"door",pt:"porta",e:"🚪"},{en:"moon",pt:"lua",e:"🌙"},{en:"star",pt:"estrela",e:"⭐"},
 {en:"mother",pt:"mãe",e:"👩"},{en:"father",pt:"pai",e:"👨"},{en:"tree",pt:"árvore",e:"🌳"}];
var EN3=[{en:"butterfly",pt:"borboleta",e:"🦋"},{en:"elephant",pt:"elefante",e:"🐘"},
 {en:"window",pt:"janela",e:"🪟"},{en:"kitchen",pt:"cozinha",e:"🍳"},{en:"teacher",pt:"professora",e:"👩‍🏫"},
 {en:"school",pt:"escola",e:"🏫"},{en:"friend",pt:"amigo",e:"🧑‍🤝‍🧑"},{en:"rain",pt:"chuva",e:"🌧️"},
 {en:"bicycle",pt:"bicicleta",e:"🚲"},{en:"breakfast",pt:"café da manhã",e:"🥐"}];
function vocab(nv){ return nv<=1?EN1:(nv===2?EN1.concat(EN2):EN2.concat(EN3)); }

var CORES=[{en:"red",pt:"vermelho",e:"🟥"},{en:"blue",pt:"azul",e:"🟦"},{en:"green",pt:"verde",e:"🟩"},
 {en:"yellow",pt:"amarelo",e:"🟨"},{en:"orange",pt:"laranja",e:"🟧"},{en:"purple",pt:"roxo",e:"🟪"},
 {en:"brown",pt:"marrom",e:"🟫"},{en:"black",pt:"preto",e:"⬛"},{en:"white",pt:"branco",e:"⬜"}];
var NUM_EN=["one","two","three","four","five","six","seven","eight","nine","ten"];
var CORPO=[{en:"hand",pt:"mão",e:"✋"},{en:"foot",pt:"pé",e:"🦶"},{en:"eye",pt:"olho",e:"👁️"},
 {en:"nose",pt:"nariz",e:"👃"},{en:"mouth",pt:"boca",e:"👄"},{en:"ear",pt:"orelha",e:"👂"}];

var INGLES=[
{tag:"Vocabulário",area:"ingles",fn:function(nv){
  var lista=vocab(nv), w=pick(lista);
  var outras=pickN(lista.filter(function(x){return x.en!==w.en;}),2);
  return {txt:"Como se diz isso em inglês?",fala:"Como se diz isso em inglês?",fig:w.e,figGrande:true,
    ops:shuffle([{t:w.en,ok:true}].concat(outras.map(function(x){return {t:x.en,ok:false};}))),cols:3,opsLang:"en"};
}},
{tag:"Entender inglês",area:"ingles",fn:function(nv){
  var lista=vocab(nv), w=pick(lista);
  var outras=pickN(lista.filter(function(x){return x.en!==w.en;}),2);
  return {txt:'O que quer dizer "'+w.en.toUpperCase()+'"?',fala:w.en,falaLang:"en",
    ops:shuffle([{t:w.pt,ok:true}].concat(outras.map(function(x){return {t:x.pt,ok:false};}))),cols:3};
}},
{tag:"Cores",area:"ingles",fn:function(nv){
  var lista=nv<=1?CORES.slice(0,5):CORES, c=pick(lista);
  var outras=pickN(lista.filter(function(x){return x.en!==c.en;}),2);
  return {txt:"What color is this?",fala:"What color is this?",falaLang:"en",fig:c.e,figGrande:true,
    ops:shuffle([{t:c.en,ok:true}].concat(outras.map(function(x){return {t:x.en,ok:false};}))),cols:3,opsLang:"en"};
}},
{tag:"Números em inglês",area:"ingles",fn:function(nv){
  var teto=nv<=1?5:10, n=rnd(1,teto), e=pick(["⭐","🍎","🐟","⚽"]);
  var certo=NUM_EN[n-1], outros=pickN(NUM_EN.slice(0,teto).filter(function(x){return x!==certo;}),2);
  return {txt:"How many?",fala:"How many?",falaLang:"en",fig:new Array(n+1).join(e+" "),
    ops:shuffle([{t:certo,ok:true}].concat(outros.map(function(x){return {t:x,ok:false};}))),cols:3,opsLang:"en"};
}},
{tag:"Corpo em inglês",area:"ingles",fn:function(nv){
  var c=pick(CORPO), outras=pickN(CORPO.filter(function(x){return x.en!==c.en;}),2);
  return {txt:"Como se diz isso em inglês?",fala:"Como se diz isso em inglês?",fig:c.e,figGrande:true,
    ops:shuffle([{t:c.en,ok:true}].concat(outras.map(function(x){return {t:x.en,ok:false};}))),cols:3,opsLang:"en"};
}},
{tag:"Frases do dia",area:"ingles",fn:function(nv){
  var base=[
    {t:"Quando a gente acorda de manhã, diz:",ok:"good morning",d:["good night","thank you"]},
    {t:"Quando vai dormir, diz:",ok:"good night",d:["good morning","hello"]},
    {t:"Quando alguém te dá um presente, diz:",ok:"thank you",d:["goodbye","please"]},
    {t:"Quando vai embora, diz:",ok:"goodbye",d:["hello","sorry"]},
    {t:"Quando encontra um amigo, diz:",ok:"hello",d:["goodbye","good night"]},
    {t:"Quando quer pedir uma coisa, diz:",ok:"please",d:["thank you","sorry"]}
  ];
  if(nv>=3) base=base.concat([
    {t:'Alguém pergunta "How are you?". Você responde:',ok:"I'm fine, thank you",d:["My name is Ana","See you tomorrow"]},
    {t:'Para dizer seu nome em inglês, você fala:',ok:"my name is...",d:["how old are you","good afternoon"]},
    {t:'Para perguntar a idade de alguém:',ok:"how old are you?",d:["what is this?","where are you?"]}
  ]);
  var c=pick(base);
  return {txt:c.t,fala:c.t,ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),cols:nv>=3?1:3,opsLang:"en"};
}}
];

/* =========================================================
   CIÊNCIAS E MUNDO
   ========================================================= */
var CIENCIAS=[
{tag:"Animais",area:"ciencias",fn:function(nv){
  var casos=[
    {t:"Onde mora o peixe?",ok:"na água",d:["na árvore","embaixo da terra"],e:"🐟"},
    {t:"Qual destes animais voa?",ok:"🦜",d:["🐢","🐄"],emoji:true},
    {t:"O que a vaca come?",ok:"capim",d:["carne","pedra"],e:"🐄"},
    {t:"De onde vem o leite que a gente bebe?",ok:"da vaca",d:["da galinha","do peixe"],e:"🥛"},
    {t:"Qual animal nasce do ovo?",ok:"🐦",d:["🐘","🐕"],emoji:true},
    {t:"O que a abelha produz?",ok:"mel",d:["leite","suco"],e:"🐝"},
    {t:"Qual destes é um inseto?",ok:"🐜",d:["🐍","🐇"],emoji:true}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,fig:c.e,figGrande:!!c.e,
    ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:!!c.emoji};
}},
{tag:"Plantas",area:"ciencias",fn:function(nv){
  var casos=[
    {t:"Do que a planta mais precisa para crescer?",ok:"água e sol",d:["chocolate","barulho"],e:"🌱"},
    {t:"Qual parte da planta fica embaixo da terra?",ok:"a raiz",d:["a flor",  "a folha"],e:"🌳"},
    {t:"De onde nasce a planta?",ok:"da semente",d:["da pedra","da nuvem"],e:"🌰"},
    {t:"O que a árvore nos dá?",ok:"sombra e frutas",d:["chuva","vento"],e:"🌳"}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,fig:c.e,figGrande:true,
    ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),cols:3};
}},
{tag:"Corpo e saúde",area:"ciencias",fn:function(nv){
  var casos=[
    {t:"Com qual parte do corpo a gente escuta?",ok:"👂",d:["👁️","👃"],emoji:true},
    {t:"Com qual parte do corpo a gente sente o cheiro?",ok:"👃",d:["✋","👂"],emoji:true},
    {t:"O que a gente faz antes de comer?",ok:"lavar as mãos",d:["correr","assistir tv"],e:"🧼"},
    {t:"Quantas vezes por dia devemos escovar os dentes?",ok:"3 vezes",d:["1 vez por semana","nenhuma"],e:"🪥"},
    {t:"O que faz bem para o corpo?",ok:"brincar e correr",d:["ficar deitado o dia todo","comer só doce"],e:"⚽"}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,fig:c.e,figGrande:!!c.e,
    ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:!!c.emoji};
}},
{tag:"Tempo e natureza",area:"ciencias",fn:function(nv){
  var casos=[
    {t:"O que aparece no céu à noite?",ok:"🌙",d:["☀️","🌈"],emoji:true},
    {t:"Quando chove, a gente usa o quê?",ok:"☂️",d:["🕶️","🧣"],emoji:true},
    {t:"Em qual estação faz mais frio?",ok:"inverno",d:["verão","primavera"],e:"❄️"},
    {t:"O que vem depois da segunda-feira?",ok:"terça-feira",d:["domingo","sexta-feira"],e:"📅"},
    {t:"Quantos dias tem uma semana?",ok:"7",d:["5","12"],e:"📅"},
    {t:"O gelo é água de que jeito?",ok:"duro, congelado",d:["quente","gasoso"],e:"🧊"}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,fig:c.e,figGrande:!!c.e,
    ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:!!c.emoji};
}},
{tag:"Cuidar do planeta",area:"ciencias",fn:function(nv){
  var casos=[
    {t:"Onde a gente joga o lixo?",ok:"🗑️",d:["🌊","🌳"],emoji:true},
    {t:"O que a gente deve fazer com a torneira ao escovar os dentes?",ok:"fechar",d:["deixar aberta","abrir mais"],e:"🚰"},
    {t:"Garrafa de plástico vai para qual lixo?",ok:"reciclagem",d:["lixo do banheiro","na rua"],e:"♻️"},
    {t:"O que economiza energia?",ok:"apagar a luz ao sair",d:["deixar tudo ligado","abrir a geladeira"],e:"💡"}
  ];
  var c=pick(casos);
  return {txt:c.t,fala:c.t,fig:c.e,figGrande:!!c.e,
    ops:shuffle([{t:c.ok,ok:true}].concat(c.d.map(function(x){return {t:x,ok:false};}))),cols:3,emoji:!!c.emoji};
}}
];

/* ---------- textos para ler em voz alta ---------- */
var TEXTOS_VOZ={
 1:["O sapo pulou na lagoa. Ele viu um peixe azul.",
    "A bola caiu no muro. O cachorro pegou a bola.",
    "O pato e a pata foram nadar. Depois comeram milho.",
    "Meu gato dorme no sofá. Quando acorda, pede comida."],
 2:["A mamãe fez um bolo de milho. A casa ficou cheirosa.",
    "Hoje eu fui na escola. Minha amiga me deu um desenho.",
    "A abelha voa de flor em flor. Ela faz mel para a gente.",
    "O vovô tem um chapéu velho. Ele usa para cuidar da horta."],
 3:["Choveu muito de manhã. Depois o sol apareceu e fez um arco-íris no céu.",
    "Na festa tinha bolo, suco e balão. Todo mundo cantou junto e ganhou doce.",
    "A borboleta era uma lagarta. Ela dormiu dentro do casulo e acordou com asas coloridas.",
    "No sábado fomos ao parque. Andei de bicicleta, tomei sorvete e voltei cansado, mas feliz."]
};

/* ---------- exportação ---------- */
var TIPOS=LEITURA.concat(MAT).concat(RACIO).concat(INGLES).concat(CIENCIAS);

window.QUESTOES={
  areas:{
    leitura:{nome:"Ler e escrever",emo:"📖",ds:"Sílabas, palavras e frases"},
    mat:{nome:"Números",emo:"🔢",ds:"Contas, problemas e formas"},
    racio:{nome:"Detetive",emo:"🔍",ds:"Padrões, memória e atenção"},
    ingles:{nome:"English",emo:"🌎",ds:"Palavras e frases em inglês"},
    ciencias:{nome:"Descobrir",emo:"🔬",ds:"Bichos, plantas, corpo e planeta"},
    voz:{nome:"Ler em voz alta",emo:"🗣️",ds:"Leia para um adulto ouvir"}
  },
  ordem:["leitura","mat","racio","ingles","ciencias","voz"],
  tipos:TIPOS,
  tiposDaArea:function(area){ return TIPOS.filter(function(t){return t.area===area;}); },
  textoVoz:function(nivel,indice){
    var lista=TEXTOS_VOZ[nivel]||TEXTOS_VOZ[2];
    return lista[indice % lista.length];
  },
  utils:{shuffle:shuffle,pick:pick,pickN:pickN,rnd:rnd}
};

})();
