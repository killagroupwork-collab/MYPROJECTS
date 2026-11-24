# Dearly installation popup and landing update

The Next.js home screen is `app/about/page.tsx` (also rendered by `app/page.tsx`). Its hero places `<InstallButton />` directly after the Register button. Login opens `/login?mode=login`. JSX supplies the HTML structure.

- `public/pwa-modal.js` captures the native event once, detects standalone/iOS, and exposes the controller used by React.
- `components/install-button.tsx` provides the two-tab popup with automatic platform selection, keyboard navigation, real Share icon, and Android native install action.
- `components/ui/dialog.tsx` uses Radix Dialog for Escape/outside-click dismissal, close button, focus trapping and focus restoration.
- `components/dashboard-preview.tsx` renders four responsive 3D interface illustrations for the current Today, Journal, Spaces and Tasks/Games features. These use example entries, not real user content.
- `app/globals.css` contains the scoped install and 3D carousel styles near the end.

Android install is available only when the browser provides `beforeinstallprompt`; otherwise the modal shows manual menu instructions. iOS installation remains manual through Share. Existing standalone installations hide the download button. The existing service-worker registration and offline engine remain in place.

## Complete client logic and UI

### public/pwa-modal.js

```js
/* One shared installation controller: capture the browser event before React mounts. */
(() => {
  if (window.dearlyPwa) return;
  let deferredPrompt = null;
  const mode = window.matchMedia('(display-mode: standalone)');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installed = mode.matches || navigator.standalone === true;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('pwa-dismissed') === 'true'; } catch {}
  const notify = () => window.dispatchEvent(new Event('dearly:pwa-change'));
  window.dearlyPwa = {
    state: () => ({ installed, dismissed, ios, available: !!deferredPrompt }),
    dismiss() { dismissed = true; try { sessionStorage.setItem('pwa-dismissed', 'true'); } catch {} notify(); },
    async install() {
      if (!deferredPrompt) return 'guide';
      const event = deferredPrompt; deferredPrompt = null; notify();
      try { await event.prompt(); const choice = await event.userChoice; return choice.outcome; }
      catch { return 'guide'; }
    }
  };
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; notify(); });
  window.addEventListener('appinstalled', () => { installed = true; deferredPrompt = null; notify(); });
  mode.addEventListener('change', () => { installed = mode.matches || navigator.standalone === true; notify(); });
  notify();
})();

```

### components/install-button.tsx

```tsx
"use client";
import {useEffect,useId,useRef,useState} from 'react';
import {Dialog} from '@/components/ui/dialog';
type InstallState={installed:boolean;dismissed:boolean;ios:boolean;available:boolean};
declare global {interface Window {dearlyPwa?:{state:()=>InstallState;dismiss:()=>void;install:()=>Promise<string>}}}
function ShareSample(){return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-label="Share: square with upward arrow" role="img"><path d="M8 8H4v13h16V8h-4M12 15V2M8 6l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
export function InstallButton({banner=false}:{banner?:boolean}){
 const [state,setState]=useState<InstallState|null>(null),[open,setOpen]=useState(false),[tab,setTab]=useState<'ios'|'android'>('ios'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const id=useId();const tabs=useRef<HTMLDivElement>(null);
 useEffect(()=>{const update=()=>setState(window.dearlyPwa?.state()||null);update();window.addEventListener('dearly:pwa-change',update);return()=>window.removeEventListener('dearly:pwa-change',update);},[]);
 if(!state||state.installed||(banner&&state.dismissed))return null;
 return <><div className={banner?'pwa-install-card':'pwa-install-inline'}>
 <button className="secondary pwa-download" onClick={()=>{setTab(state.ios?'ios':'android');setMessage('');setOpen(true);}}>✨ Download Dearly App</button>
 {banner&&<button className="text-button" onClick={()=>window.dearlyPwa?.dismiss()}>Use in browser instead</button>}</div>
 <Dialog open={open} onOpenChange={setOpen} title="Install Dearly" description="Your journal, right on your Home Screen." className="install-modal">
 <div ref={tabs} className="install-platform-tabs" role="tablist" aria-label="Choose your device" onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'ios':e.key==='End'?'android':tab==='ios'?'android':'ios';setTab(next);tabs.current?.querySelector<HTMLButtonElement>(`[data-platform="${next}"]`)?.focus();}}>{(['ios','android'] as const).map(platform=><button key={platform} id={`${id}-${platform}`} role="tab" data-platform={platform} tabIndex={tab===platform?0:-1} aria-selected={tab===platform} aria-controls={`${id}-panel`} onClick={()=>{setTab(platform);setMessage('');}}>{platform==='ios'?'🍏 iOS (iPhone)':'🤖 Android'}</button>)}</div>
 <section key={tab} id={`${id}-panel`} className="install-platform-panel" role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0}>
 {tab==='ios'?<><h3>How to install on iPhone:</h3><ol className="install-visual-steps"><li><span className="install-step-icon"><ShareSample/></span><div><strong>1. Tap Share</strong><p>Tap the Share icon at the bottom or top of Safari. If you see <b>•••</b>, tap it first, then Share.</p></div></li><li><span className="install-step-icon">⊞</span><div><strong>2. Add to Home Screen</strong><p>Scroll down the menu and tap <b>Add to Home Screen</b>. If it’s missing, tap <b>Edit Actions</b>.</p></div></li><li><span className="install-step-icon add-sample">Add</span><div><strong>3. Tap Add</strong><p>Tap <b>Add</b> in the top right. Turn on <b>Open as Web App</b> if shown. Dearly’s book icon will appear on your Home Screen.</p></div></li></ol></>:<><div className="install-app-sample"><img src="/app-book-light-192.png" width="64" height="64" alt="Dearly app icon"/><div><strong>Dearly</strong><span>Your journal. Your people.</span></div></div><h3>Instant 1-Click Install:</h3><ul className="install-android-points"><li>Tap the button below to open your browser’s install popup.</li><li>Choose <b>Install</b> to add Dearly to your Home Screen.</li></ul><button className="primary instant-install" disabled={busy||!state.available} onClick={async()=>{setBusy(true);setMessage('');try{const result=await window.dearlyPwa?.install();if(result==='accepted')setOpen(false);else setMessage(result==='dismissed'?'Installation cancelled. You can keep using Dearly in your browser.':'Open the browser menu ⋮ and choose Install app or Add to Home screen.');}finally{setBusy(false);}}}>{busy?'Opening install popup…':'Install Instantly Now'}</button>{!state.available&&<p className="install-fallback">Native installation isn’t available right now. Open your browser menu <b>⋮</b> and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>}</>}
 {message&&<p role="status">{message}</p>}
 </section><button className="install-browser-choice" onClick={()=>{if(banner)window.dearlyPwa?.dismiss();setOpen(false);}}>Use in browser instead</button>
 </Dialog></>;
}

```

### components/ui/dialog.tsx

```tsx
"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@/components/ui/icons";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className={`dialog-content ${className??""}`}>
          <DialogPrimitive.Title className="dialog-title">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="muted">
            {description ?? "A little space for your thoughts."}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="icon-button dialog-close"
            aria-label="Close"
          >
            <X size={20} />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

```

### components/dashboard-preview.tsx

```tsx
"use client";
import {useRef,useState} from 'react';
import {Sun,Check,Heart,MoreHorizontal,Plus,Mic,Images,ArrowUpRight} from './ui/icons';
const slides=[{title:'Today, all in one place',body:'Your calendar, recent memories and a daily task card.'},{title:'Write it. Say it. Keep it.',body:'Text, photos and voice notes, saved to your personal journal.'},{title:'A space for your people',body:'One conversation with messages, photos, voice notes and games.'},{title:'Small tasks. A play break.',body:'Tick off your daily tasks, then choose a favourite game.'}];
function MiniNav({index}:{index:number}){return <div className="tour-nav"><span className={index===0?'selected':''}><Sun/>Today</span><span className={index===3?'selected':''}><Check/>Task</span><b><Plus/></b><span className={index===2?'selected':''}><Heart/>Spaces</span><span><MoreHorizontal/>More</span></div>}
export function DashboardPreview(){const track=useRef<HTMLDivElement>(null),[active,setActive]=useState(0);function go(index:number){const el=track.current,child=el?.children[index] as HTMLElement|undefined;if(el&&child)el.scrollTo({left:child.offsetLeft-el.offsetLeft,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
return <section className="dashboard-tour"><div className="tour-heading"><div><span className="pill">TAKE A LITTLE LOOK INSIDE</span><h2>Your Dearly.<br/><em>Made for everyday life.</em></h2><p>Slide through four 3D interface previews. Example entries show how your own days can look.</p></div><div className="tour-arrows"><button aria-label="Previous preview" disabled={active===0} onClick={()=>go(active-1)}>←</button><button aria-label="Next preview" disabled={active===3} onClick={()=>go(active+1)}>→</button></div></div>
<div ref={track} className="tour-track tour-3d-track" tabIndex={0} aria-label="Dearly interface previews" onScroll={()=>{const el=track.current;if(el){const nearest=Array.from(el.children).reduce((best,child,i,all)=>Math.abs((child as HTMLElement).offsetLeft-el.offsetLeft-el.scrollLeft)<Math.abs((all[best] as HTMLElement).offsetLeft-el.offsetLeft-el.scrollLeft)?i:best,0);setActive(nearest);}}}>
{slides.map((slide,i)=><article className={`tour-slide tour-${i}`} key={slide.title}><div className="tour-device-stage"><span className="tour-orbit" aria-hidden="true"/><div className="tour-device"><div className="tour-device-status"><span>9:41</span><i/><span>▰ ▰</span></div><div className="tour-screen"><div className="tour-brand"><img src="/dearly-logo-clear.png" alt="Dearly"/><span>Preview</span></div>
{i===0?<><h3>Hey, Alex! ✨</h3><p>Ready for a little adventure?</p><div className="tour-week">{['M','T','W','T','F','S','S'].map((day,n)=><div className={n===3?'current':''} key={n}><small>{day}</small><b>{19+n}</b>{[0,2,3].includes(n)&&<i/>}</div>)}</div><div className="tour-adventure"><img src="/diary-adventure-3d.png" alt="Star holding a journal in Dearly’s illustrated landscape" loading="lazy"/><div><small>YOUR EVERYDAY ADVENTURE</small><strong>Little moments.<br/>Big memories.</strong><span>Write an entry <ArrowUpRight size={18}/></span></div></div><div className="tour-mini-task"><span>📝</span><div><strong>Your daily tasks</strong><small>Make a plan. Tick it off.</small></div><ArrowUpRight size={20}/></div></>:i===1?<><h3>My journal</h3><div className="tour-tabs"><b>Write</b><span>Photos</span><span>Voice</span></div><time>Today · 9:41 AM</time><p className="tour-writing">The morning light was beautiful. I took a little walk and made time for myself.</p><div className="tour-photo-note"><img src="/diary-adventure-3d.png" alt="Example journal image" loading="lazy"/><small>10:12 AM · Photo</small></div><div className="tour-wave"><Mic size={16}/> ▁▃▆▂▅▇▃▂▆▁ <small>0:24</small></div><div className="tour-colour-compose"><span>Keep writing…</span><strong>Save & keep writing <ArrowUpRight size={17}/></strong></div></>:i===2?<><h3>Our shared space 💜</h3><small>Space created since 12 October</small><div className="tour-space-actions"><b>Play together</b><span>Invite people</span></div><div className="tour-mini-search">⌕ Search messages, photos or voice</div><div className="tour-bubble"><small>Sam · Journal · 9:41</small><p>I finished my book! 📚</p></div><div className="tour-bubble own"><small>You · Journal · 9:42</small><p>Tell me your favourite part 💛</p></div><div className="tour-bubble"><small>Sam · Voice · 9:43</small><div className="tour-wave">▶ ▁▃▆▂▅▇▃▂ <small>0:12</small></div></div><div className="tour-colour-compose"><span>Write a message…</span><div><Images size={19}/><Mic size={19}/><strong>Send <ArrowUpRight size={18}/></strong></div></div></>:<><h3>Daily tasks</h3><small>Today · Your next small step</small><div className="tour-tasks-card"><div className="tour-task">✅ Read for ten minutes</div><div className="tour-task">✅ Take a short walk</div><div className="tour-task">◯ Write in my journal</div><span className="tour-task-time">◷ Reminder · 6:00 PM</span></div><h4>Take a play break</h4><div className="tour-mini-games"><div><span className="tour-marbles">🔴🟡<br/>🟢🔵</span><strong>Marble garden</strong></div><div><span>🍪</span><strong>Sweet matches</strong></div><div><span>🔤</span><strong>Words of wonder</strong></div><div><span>🧠</span><strong>Curious minds</strong></div></div><small>Solo games available offline after setup</small></>}
<MiniNav index={i}/></div></div></div><h3>{slide.title}</h3><p>{slide.body}</p></article>)}
</div><div className="tour-dots" aria-label="Choose preview">{slides.map((slide,i)=><button key={slide.title} aria-label={`Show ${slide.title}`} aria-pressed={active===i} onClick={()=>go(i)}/>)}</div></section>;
}

```

## CSS

```css

.landing-main-actions{display:flex;flex-direction:column;align-items:flex-start;gap:14px;margin-top:28px}.landing-main-actions>.primary,.landing-main-actions .pwa-download{min-height:50px;width:auto;max-width:100%}.landing-login{font-size:14px;font-weight:650;margin-top:2px}.pwa-install-inline{display:inline-flex}.pwa-download{white-space:normal}.pwa-install-card{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.install-modal{max-width:540px!important;border-radius:28px!important;padding:28px!important;background:#fff9ef;color:#432952}.install-modal .dialog-title{padding-right:36px}.install-platform-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:7px;background:#eee4f5;border-radius:18px;margin:22px 0}.install-platform-tabs button{border:0;background:transparent;color:#684c78;border-radius:12px;padding:12px 8px;font-weight:750;font-size:15px;min-height:48px}.install-platform-tabs button[aria-selected=true]{background:#563769;color:#fff;box-shadow:0 3px 8px #56376925}.install-platform-panel{animation:install-panel-in .18s ease-out}.install-platform-panel h3{font-size:20px;margin:20px 0 16px}.install-visual-steps{padding:0;list-style:none;display:grid;gap:18px}.install-visual-steps li{display:flex;gap:14px;align-items:flex-start}.install-step-icon{display:flex;align-items:center;justify-content:center;flex:0 0 48px;height:48px;border:1px solid #d3c2de;border-radius:14px;background:#eee2f6;color:#654080;font-size:30px;box-shadow:0 3px 0 #d4c1e0}.install-step-icon.add-sample{font-size:16px;font-weight:750;color:#1762ad;background:#e4f0fb}.install-visual-steps strong{font-size:16px}.install-visual-steps p,.install-fallback,.install-android-points{font-size:14px;line-height:1.65}.install-visual-steps p{margin:4px 0 0}.install-app-sample{display:flex;align-items:center;gap:16px;padding:20px;background:#f3e9f8;border-radius:20px}.install-app-sample span{display:block;font-size:14px;margin-top:4px}.install-android-points{padding-left:20px}.install-android-points li{margin:10px 0}.instant-install{width:100%;min-height:50px;justify-content:center;margin-top:12px}.instant-install:disabled{opacity:.55;cursor:not-allowed}.install-fallback{padding:14px;background:#fff0c7;border-radius:14px}.install-browser-choice{display:block;border:0;background:transparent;font-size:14px;text-decoration:underline;text-underline-offset:4px;margin:20px auto 0;padding:10px;color:inherit}.install-modal button:focus-visible{outline:3px solid #bf8ed7;outline-offset:3px}[data-theme=dark] .install-modal{background:#282031;color:#eee2f6}[data-theme=dark] :is(.install-platform-tabs,.install-app-sample,.install-step-icon){background:#3a2b47;color:#eadcf4}[data-theme=dark] .install-fallback{background:#453a27}@keyframes install-panel-in{from{opacity:.3;transform:translateY(4px)}to{opacity:1;transform:none}}@media(max-width:480px){.install-modal{padding:24px 18px!important;width:calc(100vw - 24px)!important}.install-platform-tabs button{font-size:14px;padding:12px 4px}.landing-main-actions{gap:12px;margin-top:24px}}
/* Perspective-built interface graphics: crisp, responsive and based on the current app. */
.tour-3d-track{position:relative;padding:22px 8px 32px}.tour-device-stage{perspective:1200px;position:relative;padding:24px 24px 36px;border-radius:36px;background:radial-gradient(ellipse at 50% 25%,#f9f0ff,#e3d3ef);overflow:hidden;min-height:740px;display:flex;align-items:center;justify-content:center}.tour-1 .tour-device-stage{background:radial-gradient(ellipse at 50% 25%,#fffae9,#f4d995)}.tour-2 .tour-device-stage{background:radial-gradient(ellipse at 50% 25%,#f0fff9,#bee0d3)}.tour-3 .tour-device-stage{background:radial-gradient(ellipse at 50% 25%,#fff0ec,#efc0b5)}.tour-device{width:100%;max-width:350px;padding:9px;border-radius:38px;background:linear-gradient(125deg,#fff,#c9bdd3 60%,#faf6ff);box-shadow:8px 12px 0 #b5a3c2,18px 28px 32px #45305230,inset 0 0 0 1px #fff;transform:rotateY(-8deg) rotateX(5deg) rotateZ(-2deg);position:relative}.tour-1 .tour-device,.tour-3 .tour-device{transform:rotateY(8deg) rotateX(5deg) rotateZ(2deg)}.tour-device-status{height:30px;background:#fffaf2;border-radius:30px 30px 0 0;padding:10px 18px 0;display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:800;color:#432952}.tour-device-status i{width:66px;height:16px;border-radius:20px;background:#392442}.tour-device .tour-screen{border:0;border-radius:0 0 30px 30px;box-shadow:none;padding:16px;gap:12px;min-height:610px}.tour-device .tour-screen h3{font-size:22px}.tour-device .tour-screen p{font-size:13px;line-height:1.55}.tour-device .tour-brand img{width:70px;height:40px}.tour-device .tour-tabs{gap:8px;font-size:12px}.tour-device .tour-tabs b{padding:8px 12px}.tour-week{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.tour-week>div{text-align:center;display:grid;justify-items:center;gap:4px;padding:7px 0;border-radius:16px;position:relative}.tour-week b{width:29px;height:29px;border:1px solid #ddd0e6;border-radius:50%;font-size:13px;display:grid;place-items:center}.tour-week .current{background:#eddef5}.tour-week .current b{background:#ffdf70;box-shadow:0 3px 0 #d6b344}.tour-week i{width:4px;height:4px;background:#805494;border-radius:50%;position:absolute;bottom:1px}.tour-adventure{border:1px solid #ddbb60;border-radius:20px;overflow:hidden;background:#ffdf70}.tour-adventure>img{width:100%;height:130px;object-fit:cover;display:block}.tour-adventure>div{padding:14px;display:grid;gap:6px}.tour-adventure small{font-size:9px;letter-spacing:.07em;font-weight:800}.tour-adventure strong{font-size:25px;line-height:1.1}.tour-adventure span{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:750}.tour-mini-task{display:flex;gap:10px;padding:14px;border-radius:18px;background:#eddef5;align-items:center;font-size:12px}.tour-mini-task>span{font-size:30px}.tour-mini-task small{display:block;font-size:10px;margin-top:3px}.tour-mini-task>svg{margin-left:auto}.tour-device .tour-nav{display:grid;grid-template-columns:repeat(5,1fr);gap:2px;margin-top:auto;padding:10px 0 2px;border-top:1px solid #ddcce7;font-size:10px;align-items:center}.tour-nav>span{display:grid;justify-items:center;gap:4px;padding:7px 0}.tour-nav svg{width:19px;height:19px}.tour-nav>span.selected{background:#563769;color:#fff;border-radius:14px}.tour-nav>b{display:grid;place-items:center;justify-self:center;width:43px;height:43px;border-radius:15px;background:#ffdf70;color:#432952;border:1px solid #c9a549;box-shadow:0 4px 0 #c9a549}.tour-nav>b svg{width:26px;height:26px}.tour-colour-compose{border:1px solid #cdb6dd;background:#eee2f6;border-radius:16px;padding:13px;font-size:12px;display:grid;gap:16px;margin-top:auto}.tour-colour-compose strong{display:flex;align-items:center;justify-content:flex-end;gap:8px;font-size:11px}.tour-colour-compose>div{display:flex;align-items:center;gap:12px}.tour-colour-compose>div strong{margin-left:auto}.tour-photo-note{border:5px solid #fff;border-bottom-width:16px;border-radius:10px;box-shadow:0 5px 12px #43295216;transform:rotate(-2deg)}.tour-photo-note img{width:100%;height:112px;object-fit:cover;border-radius:5px}.tour-photo-note small{display:block;padding:3px 6px}.tour-device .tour-wave{font-size:20px;display:flex;align-items:center;gap:8px}.tour-space-actions{display:flex;gap:8px;font-size:11px}.tour-space-actions>*{padding:8px;background:#eee2f6;border-radius:10px}.tour-mini-search{font-size:10px;padding:10px;border:1px solid #dacbe2;border-radius:12px;color:#765f82}.tour-device .tour-bubble{padding:12px}.tour-device .tour-bubble small{font-size:10px}.tour-tasks-card{background:#eee2f6;border-radius:18px;padding:14px}.tour-tasks-card .tour-task{font-size:13px}.tour-task-time{font-size:10px;font-weight:700;display:block;margin-top:10px}.tour-mini-games{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tour-mini-games>div{background:#ffebaf;border-radius:18px;padding:14px 8px;text-align:center;display:grid;gap:10px;box-shadow:0 4px 0 #dcc78a}.tour-mini-games>div:nth-child(2n){background:#efdcf7;box-shadow:0 4px 0 #cbb4d8}.tour-mini-games span{font-size:34px;line-height:1.1}.tour-mini-games .tour-marbles{font-size:19px;letter-spacing:-3px}.tour-mini-games strong{font-size:11px}.tour-orbit{position:absolute;width:260px;height:260px;border-radius:50%;background:#ffffff55;top:30px;right:-70px}@media(max-width:700px){.tour-device-stage{padding:18px 16px 26px;min-height:710px}.tour-device{max-width:320px;transform:rotateY(-4deg) rotateX(3deg) rotateZ(-1deg)}.tour-1 .tour-device,.tour-3 .tour-device{transform:rotateY(4deg) rotateX(3deg) rotateZ(1deg)}.tour-device .tour-screen{padding:13px}.tour-slide{flex-basis:92%}.tour-device .tour-screen h3{font-size:21px}}@media(prefers-reduced-motion:reduce){.install-platform-panel{animation:none}.tour-track{scroll-behavior:auto}}

```
