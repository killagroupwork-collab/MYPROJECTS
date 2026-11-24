import type {Entry,Profile} from '@/lib/types';
export type OfflineIdentity={id:string;profile:Profile|null};
export type PendingEntry={id:string;owner_id:string;entry:Entry;data?:Blob;synced:false;revision?:string;attempts:number;retryAt:number;error?:string;uploadedPath?:string};
export type LocalEntry={id:string;owner_id:string;entry:Entry;data?:Blob};
let opened:Promise<IDBDatabase>|undefined;
export function database():Promise<IDBDatabase>{
  if(!opened)opened=new Promise((resolve,reject)=>{
    const request=indexedDB.open('dearly_offline_db',1);
    request.onupgradeneeded=()=>{const db=request.result;for(const name of ['pending_entries','entries']){const store=db.createObjectStore(name,{keyPath:'id'});store.createIndex('owner_id','owner_id');}db.createObjectStore('settings');};
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opened=undefined;};resolve(request.result);};
    request.onerror=()=>{opened=undefined;reject(request.error);};
    request.onblocked=()=>{opened=undefined;reject(new Error('Close other Dearly tabs, then try again.'));};
  });
  return opened;
}
/** Resolve writes only after the transaction commits, never on request success alone. */
async function write(stores:string[],action:(tx:IDBTransaction)=>void){const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(stores,'readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Device save was interrupted'));action(tx);});}
async function read<T>(store:string,action:(store:IDBObjectStore)=>IDBRequest):Promise<T>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly');const req=action(tx.objectStore(store));req.onsuccess=()=>resolve(req.result as T);req.onerror=()=>reject(req.error);});}
export const identity=()=>read<OfflineIdentity|undefined>('settings',s=>s.get('identity'));
export const setIdentity=(value:OfflineIdentity)=>write(['settings'],tx=>tx.objectStore('settings').put(value,'identity'));
export const clearIdentity=()=>write(['settings'],tx=>tx.objectStore('settings').delete('identity'));
export const pendingEntries=(owner:string)=>read<PendingEntry[]>('pending_entries',s=>s.index('owner_id').getAll(owner));
export const localEntries=(owner:string)=>read<LocalEntry[]>('entries',s=>s.index('owner_id').getAll(owner));
export const putPending=(value:PendingEntry)=>write(['pending_entries'],tx=>tx.objectStore('pending_entries').put(value));
export const acknowledge=(value:PendingEntry,entry:Entry)=>write(['pending_entries','entries'],tx=>{tx.objectStore('entries').put({id:value.id,owner_id:value.owner_id,entry,data:value.data});const store=tx.objectStore('pending_entries');const read=store.get(value.id);read.onsuccess=()=>{if(read.result?.revision===value.revision)store.delete(value.id);};});
export async function cacheEntries(owner:string,entries:Entry[]){const existing=await localEntries(owner);const byId=new Map(existing.map(row=>[row.id,row]));await write(['entries'],tx=>{for(const entry of entries.filter(e=>e.owner_id===owner&&!e.space_id)){const {media_url,...safe}=entry;void media_url;tx.objectStore('entries').put({id:entry.id,owner_id:owner,entry:safe,data:byId.get(entry.id)?.data});}});}
export const removeLocal=(id:string)=>write(['entries'],tx=>tx.objectStore('entries').delete(id));

/** Update retry metadata only if the user has not changed this queued task meanwhile. */
export async function updatePending(value:PendingEntry){await write(['pending_entries'],tx=>{const store=tx.objectStore('pending_entries');const read=store.get(value.id);read.onsuccess=()=>{if(read.result?.revision===value.revision)store.put(value);};});}
