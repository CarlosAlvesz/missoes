/* Service worker: deixa o app abrir sem internet. */
var CACHE = "missoes-v4";
var ARQUIVOS = [
  "./",
  "./index.html",
  "./estilo.css",
  "./config.js",
  "./js/questoes.js",
  "./js/som.js",
  "./js/musica.js",
  "./js/sync.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./fontes/andika-400.woff2",
  "./fontes/andika-700.woff2",
  "./icones/icone-192.png",
  "./icones/icone-512.png",
  "./icones/icone-maskable-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(ARQUIVOS.map(function(u){
        return c.add(u).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(nomes){
      return Promise.all(nomes.map(function(n){ if(n!==CACHE) return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  /* chamadas ao banco nunca vêm do cache */
  if(url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit){
        /* atualiza por trás, sem travar a abertura */
        fetch(req).then(function(r){
          if(r && r.ok) caches.open(CACHE).then(function(c){ c.put(req, r.clone()); });
        }).catch(function(){});
        return hit;
      }
      return fetch(req).then(function(r){
        if(r && r.ok && r.type === "basic"){
          var copia = r.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return r;
      }).catch(function(){
        if(req.mode === "navigate") return caches.match("./index.html");
        throw new Error("offline");
      });
    })
  );
});
