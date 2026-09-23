const CACHE='rc-rock-radio-v19-smart-search';
const ASSETS=['./','./index.html','./styles.css?v=19.0','./app.js?v=19.0','./manifest.webmanifest?v=19.0','./icon.svg?v=19.0','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  if(url.pathname.startsWith('/api/')){
    event.respondWith(fetch(event.request));
    return;
  }

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request,{cache:'no-store'}).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(c=>c.put('./index.html',copy));
        return response;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  const isStatic=/\.(?:css|js|svg|png|webmanifest)$/i.test(url.pathname);
  if(isStatic){
    event.respondWith(
      caches.match(event.request).then(cached=>{
        if(cached) return cached;
        return fetch(event.request).then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(c=>c.put(event.request,copy));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});