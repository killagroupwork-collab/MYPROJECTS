"use client";
import {setIdentity,cacheEntries,localEntries,pendingEntries} from "@/lib/offline/db";
import {syncPending} from "@/lib/offline/sync-engine";

import {Arcade} from "./arcade";
import {MicroToday} from "./micro-today";
import {InstallButton} from "./install-button";
import {FirstVisitTip} from "./first-visit-tip";
import {SharedAlerts} from "./shared-alerts";
import {JournalLock} from "./journal-lock";
import {DailyEncouragement} from "./daily-encouragement";
import {ReminderSetup} from "./reminder-setup";
import {GameInvitation} from "./game-invitation";
import Link from "next/link";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  Sun,
  BookOpen,
  Heart,
  Users,
  Gamepad2,
  Images,
  Bell,
  Settings,
  Moon,
  Plus,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  Lock,
  Mic,
  PenLine,
  Sparkles,
  Check,
  Leaf,
  Coffee,
  Utensils,
  MoreHorizontal,
  LogOut,
  CalendarDays,
  X,
} from "@/components/ui/icons";
import { Entry, EntryType, Profile, Space, localDate } from "@/lib/types";
import { Composer, api } from "./composer";
import { Dialog } from "./ui/dialog";
import { browserClient } from "@/lib/supabase/client";
import { SocialSpaces, Friends, Notifications, SettingsPanel } from "./social";
import {useLive,pageCache} from "@/lib/live";
import {VoiceNote} from "./voice-note";
import { TaskReminders } from "./task-reminders";
import { PersonalJournal } from "./personal-journal";
import { Goals } from "./goals";
import { DailyAdventure } from "./daily-adventure";
import { PlayRoom } from "./play-room";
const nav = [
 {id:"my-day",name:"My Day",Icon:Sun},{id:"journal",name:"My Journal",Icon:BookOpen},{id:"spaces",name:"Our Spaces",Icon:Heart},{id:"friends",name:"My People",Icon:Users},{id:"play",name:"Play Together",Icon:Gamepad2},{id:"daily-tasks",name:"Daily tasks",Icon:Check},
];
export function JournalApp({
  section: initialSection,
  connected,
  initialProfile,
  userId,
}: {
  section: string;
  connected: boolean;
  initialProfile: Profile | null;
  userId: string | null;
}) {
  const [section,setSection]=useState(initialSection);
  const [online,setOnline]=useState(true);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  const localUrls=useRef<string[]>([]);
  useEffect(()=>()=>{localUrls.current.forEach(url=>URL.revokeObjectURL(url));},[]);
  useEffect(()=>{if(userId)void setIdentity({id:userId,profile:initialProfile}).then(()=>syncPending()).catch(()=>{});},[userId,initialProfile]);
  useEffect(()=>{let active=true;const changed=()=>{if(!userId)return;void Promise.all([pendingEntries(userId),localEntries(userId)]).then(([rows,saved])=>{if(!active)return;const combined=[...saved.filter(r=>!rows.some(p=>p.id===r.id)),...rows];const local=combined.map(row=>{const url=row.data?URL.createObjectURL(row.data):undefined;if(url)localUrls.current.push(url);return {...row.entry,metadata:{...row.entry.metadata,...(rows.some(r=>r.id===row.id)?{offline_pending:'true'}:{})},media_url:url};});setEntries(current=>[...local.map(e=>({...e,media_url:e.media_url??current.find(r=>r.id===e.id)?.media_url})),...current.filter(e=>!local.some(r=>r.id===e.id))]);}).catch(()=>{});};changed();window.addEventListener('dearly:offline-change',changed);return()=>{active=false;window.removeEventListener('dearly:offline-change',changed);};},[userId]);
  useEffect(()=>setSection(initialSection),[initialSection]);
  const [calendarFilter,setCalendarFilter]=useState(true);
  const requests=useRef<AbortController|null>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [entries, setEntries] = useState<Entry[]>(()=>pageCache.get(userId??"")?.entries??[]);
  const [spaces, setSpaces] = useState<Space[]>(()=>pageCache.get(userId??"")?.spaces??[]);
  const [date, setDate] = useState(localDate(new Date(), profile?.timezone));
  const [loading, setLoading] = useState(connected&&!pageCache.has(userId??""));
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [composer, setComposer] = useState<{
    type: EntryType;
    entry?: Entry;
    meal?: string;
  } | null>(null);
  const [personal, setPersonal] = useState<{entry?:Entry;type:EntryType}|null>(null);
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [onboard, setOnboard] = useState(connected && !initialProfile);
  const notify = useCallback((message: string) => setToast(message), []);
  const refresh = useCallback(async () => {
    if (!connected) return;
    if(!navigator.onLine&&userId){const [saved,pending]=await Promise.all([localEntries(userId),pendingEntries(userId)]);const combined=[...saved.filter(r=>!pending.some(p=>p.id===r.id)),...pending];setEntries(combined.map(row=>{const url=row.data?URL.createObjectURL(row.data):undefined;if(url)localUrls.current.push(url);return {...row.entry,metadata:{...row.entry.metadata,...(pending.some(r=>r.id===row.id)?{offline_pending:'true'}:{})},media_url:url};}));setLoading(false);setError("");return;}
    requests.current?.abort(); const controller=new AbortController();requests.current=controller;
    try {
      setError("");
      const [data, worlds] = await Promise.all([
        api<Entry[]>("/api/entries",undefined,"GET",controller.signal),
        api<Space[]>("/api/spaces",undefined,"GET",controller.signal),
      ]);
      if(controller.signal.aborted)return;
      pageCache.set(userId??"",{entries:data,spaces:worlds,at:Date.now()});
      if(userId)void cacheEntries(userId,data).catch(()=>{});
      const queued=userId?await pendingEntries(userId).catch(()=>[]):[];
      setEntries([...queued.map(r=>({...r.entry,metadata:{...r.entry.metadata,offline_pending:'true'}})),...data.filter(e=>!queued.some(r=>r.id===e.id))]);
      setSpaces(worlds);
    } catch (e) {
      if(controller.signal.aborted)return;
      if(!navigator.onLine&&userId){const cached=await localEntries(userId).catch(()=>[]);const queued=await pendingEntries(userId).catch(()=>[]);setEntries([...cached.map(r=>r.entry),...queued.map(r=>({...r.entry,metadata:{...r.entry.metadata,offline_pending:'true'}}))]);setError("");}else setError(e instanceof Error ? e.message : "Unable to load your journal");
    } finally {
      setLoading(false);
    }
  }, [connected,userId]);
  useEffect(() => {
    if (connected && (!pageCache.has(userId??"") || Date.now()-(pageCache.get(userId??"")?.at??0)>60000)) void refresh();
    else if (!connected) setEntries([]);
    const savedTheme = localStorage.getItem("dearly-theme");
    setDark(savedTheme === "dark");
    return()=>requests.current?.abort();
  }, [connected, refresh,userId]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("dearly-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(id);
  }, [toast]);
  useLive(["journal_entries","shared_spaces","shared_space_members"],()=>void refresh(),undefined,online);
  useEffect(()=>{if(online)void refresh();},[online,refresh]);
  useEffect(()=>{const valid=new Set([...nav.map(n=>n.id),"voice","memories","settings","notifications"]);const navigate=()=>{const dest=location.pathname.slice(1);if(valid.has(dest)){requests.current?.abort();setSection(dest);setPersonal(null);window.dispatchEvent(new CustomEvent("dearly:navigate",{detail:dest}));if(!pageCache.has(userId??"")||Date.now()-(pageCache.get(userId??"")?.at??0)>60000)void refresh();document.querySelectorAll("details[open]").forEach(d=>d.removeAttribute("open"));document.querySelector(".main")?.scrollTo(0,0);}};const click=(event:MouseEvent)=>{const link=(event.target as HTMLElement).closest("a");if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0||link.target)return;const url=new URL(link.href);if(url.origin===location.origin&&valid.has(url.pathname.slice(1))){event.preventDefault();history.pushState(null,"",url.pathname+url.search+url.hash);navigate();}};document.addEventListener("click",click);window.addEventListener("popstate",navigate);return()=>{document.removeEventListener("click",click);window.removeEventListener("popstate",navigate);};},[refresh]);
  const [unread,setUnread]=useState(0);
  const countUnread=useCallback(async()=>{if(!online||!userId)return;const {count,error}=await browserClient().from("notifications").select("id",{head:true,count:"exact"}).eq("user_id",userId).is("read_at",null);if(!error)setUnread(count??0);},[online,userId]);
  useEffect(()=>{setUnread(0);void countUnread();window.addEventListener("dearly:notice-read",countUnread);window.addEventListener("focus",countUnread);return()=>{window.removeEventListener("dearly:notice-read",countUnread);window.removeEventListener("focus",countUnread);};},[countUnread]);
  useLive(["notifications"],()=>void countUnread(),userId?{column:"user_id",value:userId}:undefined,online&&!!userId);
  const badge=unread>0?<span className="notice-count">{unread>99?"99+":unread}</span>:null;
  const dayEntries = entries.filter((e) => !e.space_id && !e.metadata.goal_kind && e.entry_date === date);
  const name = profile?.display_name?.split(" ")[0] ?? "friend";
  const today = localDate(new Date(), profile?.timezone);
  const currentMood = dayEntries.find((e) => e.type === "mood")?.title;
  const dayCount = new Set(entries.map((e) => e.entry_date)).size;
  const changeDate = (delta: number) => {
    const value = new Date(date + "T12:00:00");
    value.setDate(value.getDate() + delta);
    setDate(localDate(value));
  };
  const add = (type: EntryType = "text", entry?: Entry, meal?: string) => {
    if ((entry?.entry_date??date)>today) {notify("You can write for today or a past day, not the future.");return;}
    if(!entry?.space_id){setDate(entry?.entry_date??date);setPersonal({entry,type});setSection("journal");history.pushState(null,"","/journal");return;}
    setComposer({type,entry,meal});
  };
  async function mood(value: string) {
    const existing = dayEntries.find((e) => e.type === "mood");
    const input = {
      ...(existing ? { id: existing.id } : {}),
      type: "mood",
      title: value,
      body: "",
      entry_date: date,
      space_id: null,
      metadata: {},
      media_path: null,
    };
    try {
      if (connected) {
        await api("/api/entries", input);
        await refresh();
        notify("Mood saved. Thank you for checking in.");
      } else {
        setEntries((v) => [
          {
            ...input,
            id: existing?.id ?? crypto.randomUUID(),
            owner_id: "demo",
            created_at: new Date().toISOString(),
          } as Entry,
          ...v.filter((e) => e.id !== existing?.id),
        ]);
        notify("Mood added to demo · not saved to an account");
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save mood");
    }
  }
  async function remove() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      if (connected) await api("/api/entries", { id: deleting.id }, "DELETE");
      setEntries((v) => v.filter((e) => e.id !== deleting.id));
      setDeleting(null);
      notify(connected ? "Moment deleted." : "Removed from this demo.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Deletion failed");
    } finally {
      setDeleteBusy(false);
    }
  }
  const visible = entries.filter(
    (e) =>
      !e.space_id && !e.metadata.goal_kind && (filter === "all" || e.type === filter) && (search.trim() || e.entry_date === date) &&
      `${e.title} ${e.body} ${e.type} ${e.type === "photo" ? "image" : ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <JournalLock userId={userId}><div className="app-shell">
      <FirstVisitTip section={section}/>{online&&<><ReminderSetup userId={userId}/><SharedAlerts userId={userId}/></>}<TaskReminders entries={entries} notify={notify}/>
      <aside className="sidebar">
        <Link href="/about" className="brand">
          <img className="sidebar-book" src="/dearly-book.svg" alt="Dearly"/>
        </Link>
        <div className="workspace-label">
          <span className="tiny-dot" /> MY LITTLE WORLD
        </div>
        <nav>
          {nav.map(({ id, name, Icon }) => (
            <Link
              className={section === id ? "nav-link active" : "nav-link"}
              href={"/" + id}
              key={id}
            >
              <Icon size={19} />
              <span>{name}</span>
              {section === id && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-star">✧</div>
          <p>
            Big feelings.
            <br />
            Little moments.
            <br />
            <strong>All of you.</strong>
          </p>
          <span>A little space to just be.</span>
        </div>
        <div className="sidebar-bottom">
          <Link
            className={
              section === "notifications" ? "nav-link active" : "nav-link"
            }
            href="/notifications"
          >
            <Bell size={19} />
            Notifications {badge}
          </Link>
          <Link
            className={section === "settings" ? "nav-link active" : "nav-link"}
            href="/settings"
          >
            <Settings size={19} />
            Settings
          </Link>
          <div className="profile-row">
            <Link href="/settings" className="profile-link">
              <span className="avatar">{profile?.avatar_path?<img src={profile.avatar_path} alt="Your profile"/>:name[0].toUpperCase()}</span>
              <div>
                <strong>{profile?.display_name ?? "Your little world"}</strong>
                <small>
                  {connected ? "Personal journal" : "Design preview"}
                </small>
              </div>
            </Link>
            <button
              className="icon-button"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <Link className="brand dashboard-brand" href="/my-day" aria-label="Dearly dashboard"><img src="/dearly-logo-clear.png" alt="Dearly"/></Link><div className="breadcrumb">
            My little world <span>/</span>
            <strong>
              {nav.find((n) => n.id === section)?.name ??
                (section === "settings" ? "Settings" : "Notifications")}
            </strong>
          </div>
          <div className="top-actions">
            <span className="private-label">
              <Lock size={13} /> A space that’s yours
            </span>
            <Link
              aria-label={`Notifications, ${unread} unread`}
              className="icon-button"
              href="/notifications"
            >
              <Bell size={18} />{badge}
            </Link>
            <Link href="/settings" className="avatar small">
              {profile?.avatar_path?<img src={profile.avatar_path} alt="Your profile"/>:name[0].toUpperCase()}
            </Link>
          </div>
        </header>
        <div className="page-content">
          {!connected && (
            <div className="demo-banner">
              <span>
                <span className="tiny-dot" /> Local design preview. Changes stay
                in this page only.
              </span>
              <Link href="/login">
                Account sign-in <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={refresh}>Retry</button>
            </div>
          )}
          {section === "my-day" ? (
            <><InstallButton banner/><DailyEncouragement/><div className="page-heading"><div><p className="eyebrow">{new Date(date+"T12:00:00").toLocaleDateString("en",{weekday:"long",month:"long",day:"numeric"})}</p><h1>Hey, {name}! ✨</h1><p className="muted">Ready for a little adventure in being you?</p></div><button className="primary" onClick={()=>add()}>＋ New moment</button></div><div className="dashboard-grid"><div className="main-column"><DailyAdventure entries={entries} date={date} setDate={setDate} add={add}/><section><div className="section-heading outside"><h2>Your little moments</h2><Link href="/journal">Your journal →</Link></div>{dayEntries.filter(e=>['text','photo','voice'].includes(e.type)).slice(0,2).map(e=><EntryCard key={e.id} entry={e} edit={()=>add(e.type,e)} remove={()=>setDeleting(e)}/>)}{!dayEntries.some(e=>['text','photo','voice'].includes(e.type))&&<Empty title="A new page awaits" text="Keep a little piece of today." action={()=>add()} label="Write a moment"/>}</section></div><aside className="right-column"><section className="voice-card"><div className="voice-icon"><Mic size={22}/></div><h3>Some days,<br/>just say it.</h3><p>Your voice tells a story, too.</p><button className="secondary" onClick={()=>add("voice")}>Record a voice note ↗</button></section><section className="card shared-card"><h3>Better, together.</h3><div className="together-3d" role="img" aria-label="Friends sharing a journal"/><Link href="/spaces">Visit your spaces →</Link></section><Link className="card daily-task-illustrated" href="/daily-tasks"><span className="task-art" aria-hidden="true">📝<i>✨</i></span><div><small>ONE LITTLE STEP</small><h3>Your daily tasks</h3><p>Make a plan. Tick it off.</p></div><ArrowUpRight size={28}/></Link></aside></div></>
          ) : section === "voice" ? (
            <PersonalJournal ownerId={userId} key="voice-screen" entries={entries} date={date} today={today} initialType="voice" close={()=>{setSection("my-day");history.pushState(null,"","/my-day");}} refresh={refresh} notify={notify}/>
          ) : section === "journal" && personal ? (
            <PersonalJournal ownerId={userId} key={`${date}:${personal.entry?.id??personal.type}`} entries={entries} date={date} today={today} initial={personal.entry} initialType={personal.type} close={()=>setPersonal(null)} refresh={refresh} notify={notify}/>
          ) : section === "journal" || section === "memories" ? (
            <><PageTitle eyebrow="YOUR LITTLE WORLD" title="Moments worth keeping." description="Your words, photos, and voice."/><button className="primary" onClick={()=>add()}>＋ Write a moment</button><Calendar entries={entries.filter(e=>!e.space_id&&!e.metadata.goal_kind&&["text","photo","voice"].includes(e.type))} date={date} select={setDate}/><div className="history-controls"><input aria-label="Search journal" placeholder="Search your journal…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="entry-tabs">{[["all","All"],["text","Journal"],["photo","Photos"],["voice","Voice"]].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>{visible.filter(e=>['text','photo','voice'].includes(e.type)).map(e=><EntryCard key={e.id} entry={e} edit={()=>add(e.type,e)} remove={()=>setDeleting(e)}/>)}</>
          ) : section === "daily-tasks" ? (
            <><PageTitle eyebrow="LITTLE STEPS" title="Your daily tasks" description="One little step at a time."/><Goals entries={entries} date={date} timezone={profile?.timezone} refresh={refresh} notify={notify} mode="daily"/></>
          ) : !online&&["spaces","friends","notifications"].includes(section) ? (
            <section className="card"><h2>{section==="spaces"?"Your shared spaces":section==="friends"?"My People":"Notifications"}</h2><p>Connect to see new messages and play with friends. Your personal journal, tasks and solo games are available now.</p><Link className="primary" href="/journal">Open journal</Link></section>
          ) : section === "spaces" ? (
            <SocialSpaces
              connected={connected}
              spaces={spaces}
              userId={userId}
              refresh={refresh}
              notify={notify}
            />
          ) : section === "friends" ? (
            <Friends connected={connected} userId={userId} notify={notify} />
          ) : section === "play" ? (
            <>{!online?<Arcade offline userId={userId} notify={notify}/>:<PlayRoom
              connected={connected}
              spaces={spaces}
              userId={userId}
              notify={notify}
            />}</>
          ) : section === "notifications" ? (
            <Notifications connected={connected} notify={notify} />
          ) : (
            <><InstallButton/><SettingsPanel
              connected={connected}
              profile={profile}
              setProfile={setProfile}
              dark={dark}
              setDark={setDark}
              notify={notify}
            /></>
          )}
          <footer className={`page-footer ${section === "settings" ? "settings-footer" : "quiet-footer"}`}>
            <span>
              made for the beautifully ordinary.{" "}
              {section === "settings" && <a
                className="icon-credit"
                href="https://www.streamlinehq.com"
                target="_blank"
                rel="noreferrer"
              >
                Icons by Streamline
              </a>}
            </span>
            <span>
              dearly
            </span>
            {section === "settings" && <a
              className="maker-credit"
              href="https://francisfahvie.framer.website/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">👋</span>
              <span>
                Made with care by <strong>Francis Favour</strong>
                <small>Meet the maker & get in touch ↗</small>
              </span>
            </a>}
          </footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Main navigation"><Link href="/my-day" aria-current={section==="my-day"?"page":undefined}><Sun/><span>Today</span></Link><Link href="/daily-tasks" aria-current={section==="daily-tasks"?"page":undefined}><Check/><span>Task</span></Link><button className="nav-add" aria-label="Write a moment" onClick={()=>add()}><Plus/></button><Link href="/spaces" aria-current={section==="spaces"?"page":undefined}><Heart/><span>Spaces</span></Link><details className="mobile-more"><summary><MoreHorizontal/><span>More</span></summary><div><Link href="/memories"><Images/>Memories</Link>{nav.filter(n=>['friends','play'].includes(n.id)).map(({id,name,Icon})=><Link href={'/'+id} key={id}><Icon/>{name}</Link>)}<Link href="/settings"><Settings/>Settings</Link></div></details></nav>
      {composer && (
        <Composer
          key={composer.entry?.id ?? composer.type}
          open
          close={() => setComposer(null)}
          entry={composer.entry}
          type={composer.type}
          date={date}
          spaces={spaces}
          defaultMeal={composer.meal}
          connected={connected}
          onSaved={(e) => {
            if (connected) void refresh();
            else setEntries((v) => [e, ...v.filter((x) => x.id !== e.id)]);
            notify(
              connected
                ? "Your moment is saved."
                : "Added to the demo · not saved to an account.",
            );
          }}
        />
      )}
      <Dialog
        open={!!deleting}
        onOpenChange={(v) => !v && !deleteBusy && setDeleting(null)}
        title="Let this moment go?"
        description="This removes the entry from your journal and any space it was shared with."
      >
        <div className="dialog-footer">
          <button className="secondary" onClick={() => setDeleting(null)}>
            Keep it
          </button>
          <button className="danger" disabled={deleteBusy} onClick={remove}>
            {deleteBusy ? "Deleting…" : "Delete moment"}
          </button>
        </div>
      </Dialog>
      <Dialog
        open={onboard}
        onOpenChange={setOnboard}
        title="Make yourself at home."
        description="Choose a name, a unique username, and your timezone before saving your first memory."
      >
        <SettingsPanel
          compact
          connected={connected}
          profile={profile}
          setProfile={(p) => {
            setProfile(p);
            setOnboard(false);
            void refresh();
          }}
          dark={dark}
          setDark={setDark}
          notify={notify}
        />
      </Dialog>
      {toast && (
        <div className="toast" role="status">
          <Sparkles size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div></JournalLock>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action && (
        <button className="primary" onClick={action}>
          <Plus size={17} />
          Add a moment
        </button>
      )}
    </div>
  );
}
export function Empty({
  title,
  text,
  action,
  label,
}: {
  title: string;
  text: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">✧</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="secondary" onClick={action}>
          {label}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
export function EntryCard({
  entry,
  edit,
  remove,
}: {
  entry: Entry;
  edit?: () => void;
  remove?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const hold=useRef<ReturnType<typeof setTimeout>|null>(null);
  return (
    <article className={"entry-card type-" + entry.type} onContextMenu={e=>{if(remove){e.preventDefault();setMenu(true);}}} onPointerDown={e=>{if(!remove||(e.target as HTMLElement).closest("button,a,input"))return;hold.current=setTimeout(()=>setMenu(true),650);}} onPointerUp={()=>{if(hold.current)clearTimeout(hold.current);}} onPointerMove={()=>{if(hold.current)clearTimeout(hold.current);}} onPointerCancel={()=>{if(hold.current)clearTimeout(hold.current);}}>
      <div className="entry-head">
        <div className="entry-category">
          <span>
            {entry.type === "achievement"
              ? "🏆"
              : entry.type === "voice"
                ? "🎙️"
                : entry.type === "mood"
                  ? "🥰"
                  : entry.type === "meal"
                    ? "🥐"
                    : "📖"}
          </span>
          {entry.type === "text"
            ? "A LITTLE THOUGHT"
            : entry.type === "achievement"
              ? "A SMALL WIN"
              : entry.type.toUpperCase()}
          <span className="entry-time">
            {new Date(entry.entry_date + "T12:00:00").toLocaleDateString("en", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        {edit && (
          <div className="entry-menu">
            <button
              aria-label={"Options for " + entry.title}
              className="icon-button"
              onClick={() => setMenu(!menu)}
            >
              <MoreHorizontal size={17} />
            </button>
            {menu && (
              <div className="dropdown">
                <button
                  onClick={() => {
                    setMenu(false);
                    edit();
                  }}
                >
                  Edit moment
                </button>
                <button
                  onClick={() => {
                    setMenu(false);
                    remove?.();
                  }}
                >
                  Delete moment
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <h3>{entry.title}</h3>
      <p className="entry-body entry-preview">{entry.body}</p>
      {entry.body && edit && <button className="text-button" onClick={edit}>Open & keep writing <ArrowUpRight size={20}/></button>}
      {entry.media_url &&
        (entry.type === "voice" ? (
          <VoiceNote src={entry.media_url}/>
        ) : (
          <img
            className="entry-photo"
            src={entry.media_url}
            alt={entry.title}
            loading="lazy"
          />
        ))}
      <div className="entry-footer">
        <span>
          <Lock size={11} />
          {entry.space_id ? "Shared in your space" : "Only me"} · {new Date(entry.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
        </span>
        {edit && (
          <button onClick={edit} aria-label={"Open " + entry.title}>
            <ArrowUpRight size={16} />
          </button>
        )}
      </div>
    </article>
  );
}
function Calendar({
  entries,
  date,
  select,
}: {
  entries: Entry[];
  date: string;
  select: (d: string) => void;
}) {
  const [month, setMonth] = useState(date.slice(0, 7));
  const first = new Date(month + "-01T12:00:00");
  const count = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  function move(n: number) {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    setMonth(localDate(d).slice(0, 7));
  }
  return (
    <div className="card calendar">
      <div className="section-heading">
        <button
          className="icon-button"
          aria-label="Previous month"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={26} />
        </button>
        <h3>
          {first.toLocaleDateString("en", { month: "long", year: "numeric" })}
        </h3>
        <button
          className="icon-button"
          aria-label="Next month"
          onClick={() => move(1)}
        >
          <ChevronRight size={26} />
        </button>
      </div>
      <div className="calendar-grid">
        {"SMTWTFS".split("").map((v, i) => (
          <span key={i}>{v}</span>
        ))}
        {Array.from({ length: first.getDay() }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const value = month + "-" + String(i + 1).padStart(2, "0");
          return (
            <button
              className={`${date === value ? "selected" : ""} ${entries.some((e) => e.entry_date === value) ? "has-entry" : ""}`}
              key={value}
              onClick={() => select(value)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="muted small-text">A little dot, a little memory.</p>
    </div>
  );
}
