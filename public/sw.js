const CACHE="bringo-admin-shell-v1";
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(["/","/admin-icon.svg","/manifest.webmanifest"])));self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener("fetch",event=>{const request=event.request;if(request.method!=="GET"||new URL(request.url).origin!==self.location.origin)return;if(request.mode==="navigate"){event.respondWith(fetch(request).catch(()=>caches.match("/")));return;}event.respondWith(fetch(request).catch(()=>caches.match(request)));});
