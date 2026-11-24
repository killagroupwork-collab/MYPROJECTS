'use client';
import {browserClient} from '@/lib/supabase/client';
import {Entry,localDate} from '@/lib/types';
import {validMedia} from '@/lib/validation';
import {identity,pendingEntries,putPending,updatePending,acknowledge,PendingEntry} from './db';
export const offlineChanged=()=>window.dispatchEvent(new Event('dearly:offline-change'));
let syncing:Promise<void>|undefined;
/** Every new personal entry is saved to the durable outbox BEFORE any network request. */
export async function queueEntry(input:Pick<Entry,'type'|'title'|'body'|'entry_date'|'metadata'>,data?:Blob,expectedOwner?:string|null):Promise<Entry>{
  const account=await identity();if(!account)throw new Error('Sign in online once to prepare your offline journal.');
  if(expectedOwner&&expectedOwner!==account.id)throw new Error('Your account changed. Reopen your journal before saving.');
  if(!['text','photo','voice'].includes(input.type))throw new Error('Only personal text, photos and voice notes can be saved offline.');
  if(input.entry_date>localDate(new Date(),account.profile?.timezone))throw new Error('Choose today or a past day.');
  if(data&&!validMedia(data.type,data.size))throw new Error('Choose an image or audio file under 20 MB.');
  const id=crypto.randomUUID();
  const entry:Entry={...input,id,owner_id:account.id,created_at:new Date().toISOString(),space_id:null,media_path:null};
  try{await putPending({id,owner_id:account.id,entry,data,synced:false,attempts:0,retryAt:0});}
  catch{throw new Error('Could not save on this device. Storage may be full. Your draft is still here.');}
  offlineChanged();void syncPending();
  return {...entry,metadata:{...entry.metadata,offline_pending:'true'},media_url:data?URL.createObjectURL(data):undefined};
}
async function syncOne(row:PendingEntry){
  const db=browserClient();
  if(row.data&&!row.uploadedPath){
    const ext=row.data.type.split(';')[0].split('/')[1];
    const path=`${row.owner_id}/${row.id}.${ext}`;
    // Stable paths and primary keys make response-loss retries idempotent.
    const {error}=await db.storage.from('journal-media').upload(path,row.data,{contentType:row.data.type,upsert:false});
    if(error&&String((error as {statusCode?:string}).statusCode)!=='409')throw error;
    row.uploadedPath=path;await updatePending(row);
  }
  const response=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),body:JSON.stringify({...row.entry,id:undefined,client_id:row.id,client_owner_id:row.owner_id,client_created_at:row.entry.created_at,client_task:row.entry.metadata.goal_kind==='daily',client_modified_at:row.entry.metadata.offline_updated_at,media_path:row.uploadedPath??null})});
  const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not sync this entry');
  if(body.id!==row.id||body.owner_id!==row.owner_id)throw new Error('Account changed. Sign in to the original account to sync.');
  await acknowledge(row,body);offlineChanged();window.dispatchEvent(new Event('dearly:synced'));
}
export function syncPending(force=false):Promise<void>{
  if(syncing)return syncing;
  const run=async()=>{
    if(!navigator.onLine)return;
    const account=await identity();if(!account)return;
    const db=browserClient();const {data,error}=await db.auth.getUser();
    if(error||data.user?.id!==account.id)return;
    const rows=await pendingEntries(account.id);
    for(const row of rows){
      if(!navigator.onLine)break;
      if(!force&&row.retryAt>Date.now())continue;
      if((await identity())?.id!==row.owner_id)break;
      try{await syncOne(row);}catch(e){row.attempts++;row.error=e instanceof Error?e.message:'Sync paused. Your entry is safe on this device.';row.retryAt=Date.now()+Math.min(300000,5000*2**Math.min(row.attempts,6));await updatePending(row);offlineChanged();}
    }
  };
  syncing=(async()=>{try{if(navigator.locks)await navigator.locks.request('dearly-outbox-sync',{mode:'exclusive'},run);else await run();}catch{/* Storage/session failures must never discard pending entries. */}finally{syncing=undefined;}})();
  return syncing;
}

/** Daily tasks use the same durable outbox and preserve their ID when checked/unchecked. */
export async function queueTask(title:string,metadata:Record<string,string>,date:string,existing?:Entry):Promise<Entry>{
 const account=await identity();if(!account)throw new Error('Sign in once to save tasks on this device.');
 if(date!==localDate(new Date(),account.profile?.timezone))throw new Error('Only today’s tasks can be changed.');
 if(existing&&existing.owner_id!==account.id)throw new Error('Account changed. Reopen your tasks.');
 const now=new Date().toISOString();const id=existing?.id??crypto.randomUUID();
 const entry:Entry={id,owner_id:account.id,type:'achievement',title,body:'',entry_date:date,created_at:existing?.created_at??now,space_id:null,media_path:null,metadata:{...metadata,goal_kind:'daily',offline_updated_at:now}};
 delete entry.metadata.offline_pending;
 await putPending({id,owner_id:account.id,entry,synced:false,revision:crypto.randomUUID(),attempts:0,retryAt:0});offlineChanged();void syncPending();
 return {...entry,metadata:{...entry.metadata,offline_pending:'true'}};
}
