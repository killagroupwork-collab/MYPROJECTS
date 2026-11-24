"use client";
import {useEffect} from 'react';
export function PwaRegistration(){useEffect(()=>{
  if(!('serviceWorker' in navigator))return;
  const message=(event:MessageEvent)=>{if(event.data?.type==='DEARLY_OFFLINE_READY')window.dispatchEvent(new Event('dearly:offline-ready'));};
  navigator.serviceWorker.addEventListener('message',message);
  void navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).then(registration=>{registration.active?.postMessage({type:'DEARLY_OFFLINE_STATUS'});}).catch(error=>console.warn('Dearly offline setup unavailable',error));
  return()=>navigator.serviceWorker.removeEventListener('message',message);
},[]);return null;}
