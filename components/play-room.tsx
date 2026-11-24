"use client";
import {useState} from "react";
import {Space} from "@/lib/types";
import {Arcade} from "./arcade";
import {PageTitle} from "./journal-app";
export function PlayRoom({spaces,userId,notify}:{connected:boolean;spaces:Space[];userId:string|null;notify:(s:string)=>void}){const [space,setSpace]=useState("");return <><PageTitle eyebrow="A LITTLE PLAY GOES A LONG WAY" title="Your pocket-sized playground." description="A curious mind, a friendly challenge, a little more joy."/><label className="play-mode">Play mode<select value={space} onChange={e=>setSpace(e.target.value)}><option value="">Solo / same-device play</option>{spaces.map(s=><option key={s.id} value={s.id}>Together · {s.name}</option>)}</select></label><Arcade key={space} spaceId={space||undefined} userId={userId} notify={notify}/></>;}
