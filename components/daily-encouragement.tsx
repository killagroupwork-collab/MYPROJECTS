"use client";
import {useEffect,useState,useRef} from 'react';
import {motivations} from '@/lib/motivations';
const nextSteps=[
 'Take one small step today. It counts.',
 'Start gently. You can build from here.',
 'Choose one kind action for yourself.',
 'Your next chapter starts with one choice.',
 'Give yourself credit for showing up.',
 'Keep going at a pace you can sustain.',
];
export function DailyEncouragement(){
 const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null),remaining=useRef(5000),started=useRef(0);const [held,setHeld]=useState(false);
 const [message,setMessage]=useState<{lead:string;step:string}|null>(null);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;let stopped=false;
  const key=`dearly-motivation-shown:${new Date().toLocaleDateString('en-CA')}`;
  try{if(localStorage.getItem(key))return;}catch{}
  const show=()=>{
   if(stopped)return;
   // Let installation and other dialogs finish before starting the five seconds.
   if(document.querySelector('[role="dialog"][data-state="open"]')){timer=setTimeout(show,1000);return;}
   let index=Math.floor(Math.random()*motivations.length);
   try{const previous=Number(localStorage.getItem('dearly-motivation-index')??-1);if(index===previous)index=(index+1)%motivations.length;localStorage.setItem('dearly-motivation-index',String(index));localStorage.setItem(key,'1');}catch{}
   setMessage({lead:motivations[index],step:nextSteps[index%nextSteps.length]});
   started.current=Date.now();timerRef.current=setTimeout(()=>setMessage(null),remaining.current);
  };
  timer=setTimeout(show,450);
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){clearTimeout(timer);setMessage(null);}};
  window.addEventListener('keydown',escape);
  return()=>{if(timerRef.current)clearTimeout(timerRef.current);stopped=true;clearTimeout(timer);window.removeEventListener('keydown',escape);};
 },[]);
 if(!message)return null;
 return <aside className="motivation-popup" aria-label="Your daily encouragement" tabIndex={0} onPointerDown={e=>{if((e.target as HTMLElement).closest("button"))return;e.currentTarget.setPointerCapture(e.pointerId);if(timerRef.current)clearTimeout(timerRef.current);remaining.current=Math.max(0,remaining.current-(Date.now()-started.current));setHeld(true);}} onPointerUp={()=>{setHeld(false);started.current=Date.now();timerRef.current=setTimeout(()=>setMessage(null),remaining.current);}} onPointerCancel={()=>{setHeld(false);started.current=Date.now();timerRef.current=setTimeout(()=>setMessage(null),remaining.current);}}>
  <button className="motivation-dismiss" onClick={()=>setMessage(null)} aria-label="Dismiss encouragement">×</button>
  <span className="motivation-star" aria-hidden="true">✦</span>
  <small>{held?"TAKE YOUR TIME · RELEASE TO CONTINUE":"A LITTLE COURAGE FOR TODAY"}</small>
  <div role="status" aria-live="polite"><p>{message.lead}</p><p>{message.step}</p><p>You’re still growing. Your story is not standing still.</p></div>
  <div className="motivation-countdown" style={{animationPlayState:held?"paused":"running"}} aria-hidden="true"/>
 </aside>;
}
