"use client";
import {useEffect,useRef} from "react";
import {browserClient} from "./supabase/client";
export function useLive(tables:string[],refresh:()=>void,scope?:{column:string;value:string},enabled=true){
 const latest=useRef(refresh);latest.current=refresh;const key=tables.join(",");
 useEffect(()=>{if(!enabled)return;const db=browserClient();let timer:ReturnType<typeof setTimeout>;let subscribed=false;const queue=()=>{clearTimeout(timer);timer=setTimeout(()=>latest.current(),100);};let channel=db.channel(`live:${key}:${scope?.value??"self"}:${Math.random()}`);for(const table of key.split(","))channel=channel.on("postgres_changes",{event:"*",schema:"public",table,...(scope?{filter:`${scope.column}=eq.${scope.value}`}:{})},queue);channel.subscribe(status=>{if(status==="SUBSCRIBED"){if(subscribed)queue();subscribed=true;}});const focus=()=>queue();window.addEventListener("online",focus);return()=>{clearTimeout(timer);window.removeEventListener("online",focus);void db.removeChannel(channel);};},[key,scope?.column,scope?.value,enabled]);
}
export const pageCache=new Map<string,{entries:import('./types').Entry[];spaces:import('./types').Space[];at:number}>();
export const spaceCache=new Map<string,{entries:import('./types').Entry[];members:{user_id:string;display_name:string;username:string}[];at:number}>();
export function clearCaches(){pageCache.clear();spaceCache.clear();}
