# Dearly installation implementation

Next.js serves files in `public/` at the website root: `public/manifest.json` becomes `/manifest.json`; `public/sw.js` becomes `/sw.js`. There is no `index.html` in this application: `app/layout.tsx`, `app/page.tsx`, and the Today branch of `components/journal-app.tsx` are the layout and home components.

## Behaviour and limits

- Android/compatible browsers: use the native install prompt when the browser emits `beforeinstallprompt`; otherwise show menu instructions.
- iPhone/iPad: show manual Share → Add to Home Screen instructions. Websites cannot open the native iOS installation dialog automatically.
- Standalone mode hides the install card. Use in Browser dismisses it for the session; Settings can reopen help.
- Offline support becomes available after the first successful online service-worker installation. The cached fallback lets users save and copy a device-local text draft. It does **not** make account history, shared spaces, uploads, games or server reminders available offline. Drafts do not automatically sync. Full offline parity requires an account-scoped local database, media downloads and a conflict-aware sync queue.
- Private HTML and API responses are never cached. Static hashed Next.js JS/CSS assets use cache-first. Navigations use network-first with a cached standalone offline fallback, since `/` redirects signed-in users and cannot safely be treated as a public static page.
- The existing `/service-worker.js` registration imports `/sw.js`, preserving its root scope and existing push subscriptions. Do not register a second worker separately.
- Actual Dearly icons replace placeholder icon paths. Portrait is requested through the manifest; browser/platform support determines whether it is enforced.
- Browser storage may be cleared by users or the operating system. This is not a substitute for account backup.

## Home component placement

```tsx
import { InstallButton } from '@/components/install-button';
// Put this in the main home viewport (already integrated in Landing and Today):
<InstallButton banner />
// Settings keeps the manual entry point:
<InstallButton />
```

## Complete implementation files

### public/manifest.json

```json
{
  "name": "Dearly \u2014 Your days, held close",
  "short_name": "Dearly",
  "id": "/",
  "start_url": "/my-day",
  "scope": "/",
  "display": "standalone",
  "background_color": "#fff9ef",
  "theme_color": "#563769",
  "icons": [
    {
      "src": "/app-book-light-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/app-book-light-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "orientation": "portrait",
  "description": "Your private journal, daily tasks and shared memories.",
  "lang": "en"
}

```

### public/sw.js

```js
/* Cache only public assets, never authenticated HTML, API responses or private media. */
const CACHE = 'dearly-public-v1';
const CORE = ['/offline.html','/offline.css','/offline.js','/manifest.json','/pwa-handler.js','/app-book-light-192.png','/app-book-light-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('dearly-public-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Network-first navigation keeps signed-in pages fresh and out of shared caches.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html')) || new Response('You are offline. Reconnect to open Dearly.', {status:503,headers:{'Content-Type':'text/plain'}})));
    return;
  }
  // Next.js uses hashed filenames: cache-first is safe for these immutable bundles.
  if (!CORE.includes(url.pathname) && !url.pathname.startsWith('/_next/static/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      if(keys.length > 160) { const removable=keys.find(key=>!CORE.includes(new URL(key.url).pathname));if(removable)await cache.delete(removable); }
    }
    return response;
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

```

### public/service-worker.js

```js
/* Compatibility entry point preserves existing reminder subscriptions. */
importScripts('/sw.js');

```

### public/pwa-handler.js

```js
/* One shared installation controller: capture the browser event before React mounts. */
(() => {
  if (window.dearlyPwa) return;
  let pending = null;
  const mode = window.matchMedia('(display-mode: standalone)');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installed = mode.matches || navigator.standalone === true;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('pwa-dismissed') === 'true'; } catch {}
  const notify = () => window.dispatchEvent(new Event('dearly:pwa-change'));
  window.dearlyPwa = {
    state: () => ({ installed, dismissed, ios, available: !!pending }),
    dismiss() { dismissed = true; try { sessionStorage.setItem('pwa-dismissed', 'true'); } catch {} notify(); },
    async install() {
      if (!pending) return 'guide';
      const event = pending; pending = null; notify();
      try { await event.prompt(); const choice = await event.userChoice; return choice.outcome; }
      catch { return 'guide'; }
    }
  };
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pending = event; notify(); });
  window.addEventListener('appinstalled', () => { installed = true; pending = null; notify(); });
  mode.addEventListener('change', () => { installed = mode.matches || navigator.standalone === true; notify(); });
  notify();
})();

```

### components/install-button.tsx

```tsx
"use client";
import {useEffect,useState} from 'react';
import {Dialog} from '@/components/ui/dialog';

type InstallState={installed:boolean;dismissed:boolean;ios:boolean;available:boolean};
declare global { interface Window { dearlyPwa?: {state:()=>InstallState;dismiss:()=>void;install:()=>Promise<string>} } }

/** Home banners respect session dismissal; Settings remains available to reopen help. */
export function InstallButton({banner=false}:{banner?:boolean}) {
  const [state,setState]=useState<InstallState|null>(null);
  const [guide,setGuide]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{const update=()=>setState(window.dearlyPwa?.state()||null);update();window.addEventListener('dearly:pwa-change',update);return()=>window.removeEventListener('dearly:pwa-change',update);},[]);
  if(!state||state.installed||(banner&&state.dismissed))return null;
  return <><section className={banner?'pwa-install-card':'pwa-install-settings'} aria-label="Install Dearly">
    {banner&&<div><strong>Your little world, one tap away.</strong><p>Add Dearly to your Home Screen.</p></div>}
    <div className="pwa-install-actions"><button className="primary" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await window.dearlyPwa?.install();if(result==='guide')setGuide(true);}finally{setBusy(false);}}}>✨ Download Dearly App</button>
    {banner&&<button className="secondary" onClick={()=>window.dearlyPwa?.dismiss()}>🌐 Use in Browser Instead</button>}</div>
  </section><Dialog open={guide} onOpenChange={setGuide} title="Keep Dearly close" description="Add Dearly to your Home Screen.">
    <ol className="pwa-install-steps">{state.ios?<>
      <li>In Safari, tap <strong>Share</strong> <span aria-label="Share icon">⇧</span> in the toolbar. In some layouts, tap <strong>•••</strong> first, then Share.</li>
      <li>Scroll down and tap <strong>Add to Home Screen</strong> ⊞. If missing, look in <strong>Edit Actions</strong>.</li>
      <li>Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</li>
    </>:<><li>Open your browser menu <strong>⋮</strong>.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, then confirm.</li><li>If unavailable, open Dearly in a browser that supports app installation.</li></>}</ol>
    <p className="muted">Offline drafts stay on this device. Shared spaces and syncing need internet.</p>
    <button className="primary" onClick={()=>setGuide(false)}>Got it</button>
    <button className="secondary" onClick={()=>{window.dearlyPwa?.dismiss();setGuide(false);}}>🌐 Use in Browser Instead</button>
  </Dialog></>;
}

```

### components/pwa-registration.tsx

```tsx
"use client";
import {useEffect} from 'react';
export function PwaRegistration(){useEffect(()=>{
  if('serviceWorker' in navigator)void navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'}).catch(error=>console.warn('Dearly offline setup unavailable',error));
},[]);return null;}

```

### app/layout.tsx

```tsx
import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
import {PwaRegistration} from "@/components/pwa-registration";
import { WebAnalytics } from "@/components/web-analytics";
export const metadata: Metadata = {
  manifest:"/manifest.json",
  icons:{icon:"/dearly-book.svg",apple:"/app-book-light-192.png"},
  metadataBase:new URL("https://dearly.com.ng"),
  openGraph:{title:"Dearly — Your days, held close",description:"Your days. Your people. Your little world.",images:["/opengraph-image"]},
  twitter:{card:"summary_large_image",images:["/opengraph-image"]},
  title: "Dearly — Your days, held close",
  description:
    "Your private journal. Your favorite people. Capture the little things that make a life.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Script src="/pwa-handler.js" strategy="beforeInteractive" />{children}<WebAnalytics /><PwaRegistration /></body>
    </html>
  );
}

```

### public/offline.html

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#563769"><title>Dearly · Offline journal</title><link rel="stylesheet" href="/offline.css"><script defer src="/offline.js"></script></head>
<body><main><img src="/app-book-light-192.png" width="72" height="72" alt="Dearly"><p class="eyebrow">YOUR OFFLINE CORNER</p><h1>Your words can stay here.</h1><p>You’re offline. Write a draft now, then copy it into your journal when you’re connected.</p><label for="draft">A little piece of today</label><textarea id="draft" rows="8" placeholder="What would you like to remember?"></textarea><p class="note">Saved only on this device, not to your account. Anyone using this browser can see this draft.</p><div class="actions"><button id="save">Save draft on this device</button><button id="copy">Copy draft</button><button id="clear">Clear draft</button><a href="/my-day">Back to Dearly →</a></div><p id="status" role="status"></p><p class="note">Shared spaces, account history, uploads, games and reminders need a connection. This draft does not sync automatically.</p></main></body></html>

```

### public/offline.css

```css
*{box-sizing:border-box}body{margin:0;background:#fff9ef;color:#432952;font:16px/1.6 system-ui,sans-serif}main{max-width:640px;margin:auto;padding:32px 22px calc(32px + env(safe-area-inset-bottom))}h1{font-size:clamp(28px,6vw,42px);line-height:1.15}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.12em}label{display:block;font-weight:700;margin-top:28px}textarea{width:100%;margin:10px 0;padding:18px;background:#eee2f6;border:2px solid #ceb7dd;border-radius:20px;color:inherit;font:inherit;resize:vertical}.actions{display:flex;flex-wrap:wrap;gap:12px}button,a{border:1px solid #bea0d0;border-radius:14px;padding:12px 16px;background:#eee2f6;color:inherit;font:600 14px system-ui;cursor:pointer;text-decoration:none}#save{background:#ffdf70}.note{font-size:13px;color:#695574}@media(prefers-color-scheme:dark){body{background:#211b2b;color:#eee2f6}textarea,button,a{background:#342940;color:#eee2f6}.note{color:#c9b7d4}#save{color:#432952}}

```

### public/offline.js

```js
/* Explicit device-local draft; never pretend an offline draft was synced. */
const field=document.getElementById('draft'),status=document.getElementById('status');
try{field.value=localStorage.getItem('dearly-offline-draft')||'';}catch{}
document.getElementById('save').onclick=()=>{try{localStorage.setItem('dearly-offline-draft',field.value);status.textContent='Draft saved on this device.';}catch{status.textContent='Device storage is unavailable. Copy your draft to keep it.';}};
document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(field.value);status.textContent='Copied. Paste it into your journal when you reconnect.';}catch{field.select();status.textContent='Select and copy your draft.';}};
document.getElementById('clear').onclick=()=>{try{localStorage.removeItem('dearly-offline-draft');field.value='';status.textContent='Draft cleared.';}catch{status.textContent='Could not clear device storage.';}};
window.addEventListener('online',()=>{status.textContent='Connection restored. Copy your draft, then return to Dearly.';});

```
