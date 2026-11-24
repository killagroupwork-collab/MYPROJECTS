'use client';
import {useEffect,useState} from 'react';
import {identity,OfflineIdentity} from '@/lib/offline/db';
import {JournalApp} from './journal-app';
export function OfflineApp(){
 const [account,setAccount]=useState<OfflineIdentity|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{const load=()=>void identity().then(user=>setAccount(user??null)).finally(()=>setReady(true));load();window.addEventListener('dearly:account-cleared',load);return()=>window.removeEventListener('dearly:account-cleared',load);},[]);
 if(!ready)return <main className="offline-app">Opening Dearly…</main>;
 if(!account)return <main className="offline-app"><h1>Welcome to Dearly</h1><p>Connect and sign in once to prepare your journal on this device.</p><a className="primary" href="/login">Login</a></main>;
 const requested=new URLSearchParams(typeof location==='undefined'?'':location.search).get('from')||'my-day';
 const section=['my-day','journal','voice','memories','daily-tasks','play','spaces','friends','settings','notifications'].includes(requested)?requested:'my-day';
 return <JournalApp section={section} connected initialProfile={account.profile} userId={account.id}/>;
}
