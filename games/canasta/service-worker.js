const CACHE='ai-canasta-v1';
const ASSETS=['./','index.html','style.css?v=1','app.js?v=1','engine.js?v=1','touch.js?v=1','manifest.json?v=1','icons/icon.svg?v=1','icons/icon-180.png?v=1','icons/icon-192.png?v=1','icons/icon-512.png?v=1'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ai-canasta-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!u.pathname.startsWith(new URL('./',location.href).pathname))return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('./'):Response.error())));});
