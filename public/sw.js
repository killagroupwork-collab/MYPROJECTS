/* Public offline application shell; no authenticated HTML/API/media in CacheStorage. */
const CACHE = 'dearly-offline-build';
const ASSETS_TO_CACHE = ['/offline.html','/offline.css','/offline.js','/manifest.json','/pwa-handler.js','/pwa-modal.js','/app-book-light-192.png','/app-book-light-512.png'];
self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const response=await fetch('/offline-assets.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Offline asset manifest unavailable');
    const manifest=await response.json();
    const cache=await caches.open(CACHE);
    const assets=[...new Set([...ASSETS_TO_CACHE,...manifest.assets])];
    // Bounded batches avoid exhausting memory on phones. Install fails safely if any core asset is missing.
    for(let i=0;i<assets.length;i+=6)await cache.addAll(assets.slice(i,i+6));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  // Keep the immediately previous version for pages still running its hashed chunks.
  const old=(await caches.keys()).filter(key=>key.startsWith('dearly-offline-')&&key!==CACHE);
  for(const key of old.slice(0,-1))await caches.delete(key);
  await self.clients.claim();
  for(const client of await self.clients.matchAll())client.postMessage({type:'DEARLY_OFFLINE_READY'});
})()));
self.addEventListener('message',event=>{
  if(event.data?.type==='DEARLY_OFFLINE_STATUS')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);event.source?.postMessage({type:await cache.match('/offline-app')?'DEARLY_OFFLINE_READY':'DEARLY_OFFLINE_PREPARING'});
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      // Strict cache-first for the public offline UI. All modules and games were preloaded together.
      if(url.pathname==='/offline-app'){const page=await cache.match('/offline-app');if(page)return page;}
      try{return await fetch(request);}catch{
        if(await cache.match('/offline-app'))return Response.redirect(new URL('/offline-app?from='+encodeURIComponent(url.pathname.slice(1)||'my-day'),self.location.origin).href,302);
        return (await cache.match('/offline.html'))||new Response('Reconnect once to prepare Dearly for offline use.',{status:503});
      }
    })());return;
  }
  if(url.pathname.startsWith('/api/')||request.headers.get('RSC'))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);const saved=await cache.match(request,{ignoreSearch:false});
    if(saved)return saved;
    // Only immutable build assets may enter the runtime cache. Never cache private uploads or auth responses.
    if(url.pathname.startsWith('/_next/static/')){const old=await caches.match(request);if(old)return old;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}
    return fetch(request);
  })());
});
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{data={body:event.data?.text()};}
 const url=data.url==='/journal'?'/journal':'/daily-tasks';
 const options={body:typeof data.body==='string'?data.body:'A little time for yourself.',icon:'/app-book-light-192.png',badge:'/dearly-logo-clear.png',tag:data.tag||'dearly-reminder',silent:data.sound===false,data:{url}};
 if(data.sound!==false)options.vibrate=[200,100,200];
 event.waitUntil(self.registration.showNotification(data.title||'A little reminder from Dearly',options));
});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification.data?.url==='/journal'?'/journal':'/daily-tasks';event.waitUntil((async()=>{const tabs=await self.clients.matchAll({type:'window',includeUncontrolled:true});const tab=tabs.find(t=>new URL(t.url).origin===self.location.origin);if(tab){await tab.navigate(url);await tab.focus();}else await self.clients.openWindow(url);})());});
