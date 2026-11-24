"use client";
import { useState,useEffect } from "react";
import { Entry,localDate } from "@/lib/types";


import { queueTask } from "@/lib/offline/sync-engine";
export function Goals({entries,date,refresh,notify,mode,timezone}:{entries:Entry[];date:string;refresh:()=>Promise<void>;notify:(s:string)=>void;mode:"daily";timezone?:string}) {
  const [daily,setDaily]=useState(""); const [taskTime,setTaskTime]=useState(""); const [reminder,setReminder]=useState("0"); const [busy,setBusy]=useState(false);
  const editable=date===localDate(new Date(),timezone);
  const [recent,setRecent]=useState<Entry[]>([]);
 useEffect(()=>{setRecent(current=>current.map(e=>entries.find(r=>r.id===e.id)??e));},[entries]);
 const goals=[...recent,...entries.filter(e=>!recent.some(r=>r.id===e.id))].filter(e=>e.metadata.goal_kind==="daily" && e.entry_date===date);
  async function save(title:string,metadata:Record<string,string>,entry?:Entry) {
    if(!editable){notify("Only today’s tasks can be changed.");return false;}
    setBusy(true);
    try { const result = await queueTask(title,metadata,entry?.entry_date??date,entry);
      setRecent(v=>[result,...v.filter(e=>e.id!==result.id)]);void refresh(); return true; }
    catch(e){notify(e instanceof Error?e.message:"Could not save your goal");return false;} finally{setBusy(false);}
  }
  return <section className="goals-board">
    {mode === "daily" && <><div className="card daily-goals"><div className="goal-heading"><span aria-hidden="true">🎯</span><div><h3>Your little goals</h3><p>{goals.filter(g=>g.metadata.done==="true").length} of {goals.length} completed · {date}</p></div></div>
      {editable?<form onSubmit={async e=>{e.preventDefault();if(await save(daily.trim(),{goal_kind:"daily",done:"false",time:taskTime,due_at:taskTime?new Date(`${date}T${taskTime}`).toISOString():"",reminder_minutes:reminder}))setDaily("");}}><label htmlFor="daily-goal">What will you do today?</label><div className="goal-input-row"><input id="daily-goal" value={daily} onChange={e=>setDaily(e.target.value)} placeholder="Take a walk, read 10 pages…" maxLength={160} required/><button className="primary" disabled={busy||!daily.trim()}>Add ↗</button></div><div className="field-row"><label>Task time<input type="time" value={taskTime} onChange={e=>setTaskTime(e.target.value)}/></label><label>Reminder<select value={reminder} onChange={e=>setReminder(e.target.value)}><option value="0">At task time</option><option value="5">5 minutes before</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option></select></label></div><p className="reminder-help">Times use this device’s timezone. Offline chimes work while Dearly is open. Notifications when closed need a connection.</p></form>:<p className="task-locked">🔒 This day’s tasks are read-only. Choose today to add or change tasks.</p>}
      <div className="goal-checklist">{goals.map(g=><label key={g.id} className={g.metadata.done==="true"?"goal-complete":""}><input type="checkbox" checked={g.metadata.done==="true"} disabled={busy||!editable} onChange={async e=>{const done=e.target.checked;if(await save(g.title,{...g.metadata,done:String(done)},g))notify(done?"One little win collected! 🎉":"Goal reopened.");}}/><span>{g.title}{g.metadata.time && <small className="task-time">🕒 {g.metadata.time}</small>}</span>{g.metadata.done==="true"&&<span aria-hidden="true">✨</span>}</label>)}</div>
    </div><section className="card goal-records"><h3>Your task records</h3><p>Completed and open tasks for the selected day.</p>{Array.from(new Set(entries.filter(e=>e.metadata.goal_kind==="daily"&&e.entry_date===date).map(e=>e.entry_date))).sort().reverse().map(day=><div key={day} className="task-record-day"><h4>{new Date(day+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</h4>{entries.filter(e=>e.metadata.goal_kind==="daily"&&e.entry_date===day).map(e=><label key={e.id}><input type="checkbox" checked={e.metadata.done==="true"} disabled={busy||!editable} onChange={ev=>void save(e.title,{...e.metadata,done:String(ev.target.checked)},e)}/><span>{e.title}</span><small>{e.metadata.done==="true"?"Done":"Open"}</small></label>)}</div>)}{!goals.length&&<p>Your first task will appear here. 🌱</p>}</section></>}
  </section>;
}
function downloadReminder(entry:Entry){
 const escape=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
 const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""); const start=new Date(entry.metadata.due_at); const end=new Date(start.getTime()+30*60000);
 const body=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Dearly//Daily Tasks//EN","BEGIN:VEVENT",`UID:${entry.id}@dearly`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`SUMMARY:${escape(entry.title)}`,"BEGIN:VALARM",`TRIGGER:-PT${Number(entry.metadata.reminder_minutes)||0}M`,"ACTION:DISPLAY",`DESCRIPTION:${escape(entry.title)}`,"END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");const url=URL.createObjectURL(new Blob([body],{type:"text/calendar;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="dearly-task.ics";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
