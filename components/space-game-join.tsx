"use client";
import {useEffect,useState,useCallback} from 'react';
import {browserClient} from '@/lib/supabase/client';
import {useLive} from '@/lib/live';
export function SpaceGameJoin({spaceId,userId,onJoin}:{spaceId:string;userId:string|null;onJoin:()=>void}){
 const [ready,setReady]=useState(false);
 const load=useCallback(async()=>{const {data}=await browserClient().from('arcade_rooms').select('game,owner_id,guest_id,state').eq('space_id',spaceId).order('created_at',{ascending:false}).limit(20);setReady(!!data?.some(r=>['xo','trivia','wordsearch'].includes(r.game)&&!r.state.winner&&Object.keys(r.state.scores??{}).length<2&&(!r.guest_id||r.guest_id===userId||r.owner_id===userId)));},[spaceId,userId]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),4000);return()=>clearInterval(timer);},[load]);useLive(['arcade_rooms'],()=>void load(),{column:'space_id',value:spaceId});
 return ready?<button className="primary space-game-join" onClick={onJoin}>🎮 Click here to play together <span aria-hidden="true">→</span></button>:null;
}
