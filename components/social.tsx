"use client";
import {clearIdentity} from "@/lib/offline/db";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  Heart,
  Users,
  Lock,
  Sun,
  Moon,
  LogOut,
  Check,
  Trash2,
  RefreshCw,
  Copy,
  Share2,

} from "@/components/ui/icons";
import { Entry, Profile, Space, localDate } from "@/lib/types";
import { browserClient } from "@/lib/supabase/client";
import { api, Composer } from "./composer";
import { PageTitle, Empty, EntryCard } from "./journal-app";
import {useLive,spaceCache,clearCaches} from "@/lib/live";



import {SpaceMilestone} from "./space-milestone";
import {PinSettings} from "./journal-lock";
import {SpaceGameJoin} from "./space-game-join";
import {Arcade} from "./arcade";
import {SharedConversation} from "./shared-conversation";
import {ReminderPreference} from "./task-reminders";
import { ChatMedia } from "./chat-media";
import { Dialog } from "./ui/dialog";
type Notice = (text: string) => void;
export function SocialSpaces({
  connected,
  spaces,
  userId,
  refresh,
  notify,
}: {
  connected: boolean;
  spaces: Space[];
  userId: string | null;
  refresh: () => Promise<void>;
  notify: Notice;
}) {
  const [sharedText,setSharedText]=useState("");
  const [conversationSearch,setConversationSearch]=useState("");
  const [sharedType,setSharedType]=useState("text");
  const [sharedMeal,setSharedMeal]=useState("Breakfast"),[sharedMood,setSharedMood]=useState("😊 Happy"),[attached,setAttached]=useState(false);
  const mediaSend=useRef<(()=>Promise<void>)|null>(null);
  const [replyTarget,setReplyTarget]=useState<{id:string;text:string}|null>(null);
  useEffect(()=>{const reply=(event:Event)=>{setReplyTarget((event as CustomEvent).detail);document.querySelector<HTMLTextAreaElement>("#shared-message-form textarea")?.focus();};window.addEventListener("dearly:reply",reply);return()=>window.removeEventListener("dearly:reply",reply);},[]);
  const [joinGame,setJoinGame]=useState(false);const [showGames,setShowGames]=useState(false),[showBucket,setShowBucket]=useState(false);
  const readRequest=useRef<AbortController|null>(null);
  const [entryFilter,setEntryFilter]=useState("all");
  const [historyDate,setHistoryDate]=useState("");
  const [joining,setJoining]=useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [selected, setSelected] = useState<Space | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [compose, setCompose] = useState(false);
  const [composeType,setComposeType] = useState<"text"|"photo"|"voice">("text");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<{ user_id: string; display_name: string; username: string }[]>([]);
  const [people, setPeople] = useState<{ requester: string; recipient: string; status: string; display_name: string }[]>([]);
  const [person, setPerson] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { const query = new URLSearchParams(location.search); const code = query.get("invite"); if(code) setToken(code); const id = query.get("space"); if(id) setSelected(spaces.find(s => s.id === id) ?? null); }, [spaces]);
  useEffect(()=>{if(selected?.name.startsWith("Game ·"))setShowGames(true);},[selected?.id,selected?.name]);
  async function copyInvite(link = false) {
    const value = link ? `${location.origin}/spaces?invite=${invite}` : invite;
    try { await navigator.clipboard.writeText(value); setCopied(true); notify(link ? "Invitation link copied." : "Invitation code copied."); }
    catch { notify("Copy is unavailable in this browser. Press and hold the invitation field to copy it."); }
  }
  const [invites, setInvites] = useState<
    { id: string; expires_at: string; revoked: boolean }[]
  >([]);
  const [manage, setManage] = useState(false);
  const load = useCallback(async () => {
    if (!selected || !connected) return;
    readRequest.current?.abort();const controller=new AbortController();readRequest.current=controller;
    try {
      const fresh=await api<Entry[]>("/api/entries?space=" + selected.id,undefined,"GET",controller.signal);
      if(controller.signal.aborted)return;setEntries(fresh);
      const db = browserClient();
      const [m, i] = await Promise.all([
        db.rpc("space_member_profiles", { target_space: selected.id }),
        db
          .from("space_invitations")
          .select("id,expires_at,revoked")
          .eq("space_id", selected.id),
      ]);
      if (m.error) throw m.error;
      if(controller.signal.aborted)return;
      setMembers(m.data ?? []);
      spaceCache.set(`${userId}:${selected.id}`,{entries:fresh,members:m.data??[],at:Date.now()});
      setInvites(i.data ?? []);
      setPeople(await api("/api/social"));
    } catch (e) {
      if(controller.signal.aborted)return;
      notify(e instanceof Error ? e.message : "Could not load space");
    }
  }, [selected, connected, notify,userId]);
  useEffect(() => {
    const cached=spaceCache.get(`${userId}:${selected?.id}`);if(cached){setEntries(cached.entries);setMembers(cached.members);}else{setEntries([]);setMembers([]);}void load();return()=>readRequest.current?.abort();
  }, [load,selected?.id,userId]);
  useLive(["journal_entries"],()=>void load(),selected?{column:"space_id",value:selected.id}:undefined);

  async function action(value: unknown) {
    if (!connected) {
      notify("Connect an account to create or join private shared spaces.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ result: string; redirect?:string; pending?:boolean }>("/api/spaces", value);
      if(result.redirect){window.location.href=result.redirect;return;}if(result.pending){notify("An invitation is already waiting for your friend.");return;}await refresh();
      return result.result ?? "ok";
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to update space");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {selected && <button className="secondary space-back" onClick={()=>{setSelected(null);history.replaceState(null,"","/spaces");}}>← All spaces</button>}
      <PageTitle
        eyebrow="A LITTLE CLOSER, EVERY DAY"
        title={selected ? selected.name : "Your people. Your little worlds."}
        description=""
      />
      {selected ? (
        <>
          <SpaceMilestone key={selected.id} createdAt={selected.created_at}/>
          <label className="conversation-search">Search your shared journal<input type="search" value={conversationSearch} onChange={e=>setConversationSearch(e.target.value)} placeholder="Search words, photos or voice…"/></label>
          <div className="space-toolbar">



          <button className="primary game-space-button" onClick={()=>{setJoinGame(false);setShowBucket(false);setShowGames(!showGames);}}>🎮 {showGames?"Journal":"Play together"}</button>            {selected.owner_id === userId && (
              <button className="secondary" onClick={() => setManage(true)}>
                Invite people
              </button>
            )}</div>
          {!showGames&&<SpaceGameJoin spaceId={selected.id} userId={userId} onJoin={()=>{setJoinGame(true);setShowGames(true);}}/>}
          
          {showGames && <Arcade autoJoin={joinGame} spaceId={selected.id} userId={userId} notify={notify}/>}
          {!showGames&&!showBucket&&<><div className="history-controls"><div className="entry-tabs" role="group" aria-label="Shared journal categories">{[["all","✨ All"],["text","📖 Journal"],["photo","📸 Photos"],["voice","🎙️ Voice"]].map(([value,label])=><button key={value} aria-pressed={entryFilter===value} onClick={()=>setEntryFilter(value)}>{label}</button>)}</div><label>Day<input type="date" value={historyDate} onChange={e=>setHistoryDate(e.target.value)}/></label><button className="secondary" onClick={()=>setHistoryDate("")}>All dates</button></div>
          <SharedConversation search={conversationSearch} entries={entries} members={members} userId={userId} date={historyDate} category={entryFilter} notify={notify}/></>}
          <div className={`unified-composer ${showGames||showBucket?"composer-hidden":""}`}><h3>Our journal 💬</h3>{replyTarget&&<div className="reply-preview"><span>Replying to: {replyTarget.text}</span><button onClick={()=>setReplyTarget(null)} aria-label="Cancel reply">×</button></div>}<form id="shared-message-form" onSubmit={async e=>{e.preventDefault();if(attached){await mediaSend.current?.();return;}setBusy(true);try{const saved=await api<Entry>("/api/entries",{type:sharedType,title:sharedType==="mood"?sharedMood:sharedText.trim().slice(0,80)||sharedMeal,body:sharedText.trim(),entry_date:localDate(),space_id:selected.id,metadata:replyTarget?{reply_to:replyTarget.id,reply_quote:replyTarget.text}:sharedType==="meal"?{meal:sharedMeal}:sharedType==="mood"?{mood:sharedMood}:{},media_path:null});setEntries(v=>[saved,...v.filter(e=>e.id!==saved.id)]);setSharedText("");setReplyTarget(null);}catch(e){notify(e instanceof Error?e.message:"Could not send");}finally{setBusy(false);}}}><label>From<select value={sharedType} onChange={e=>setSharedType(e.target.value)}><option value="text">📖 Journal</option></select></label>{sharedType==="meal"&&<label>Meal<select value={sharedMeal} onChange={e=>setSharedMeal(e.target.value)}>{["Breakfast","Lunch","Dinner","Snack"].map(m=><option key={m}>{m}</option>)}</select></label>}{sharedType==="mood"&&<label>Mood<select value={sharedMood} onChange={e=>setSharedMood(e.target.value)}>{["😊 Happy","😌 Calm","🥰 Loved","🤩 Excited","😔 Sad","😟 Anxious","😠 Angry","😴 Tired","🤕 In pain"].map(m=><option key={m}>{m}</option>)}</select></label>}<textarea rows={2} aria-label="Message to your shared journal" placeholder="Tell your people about your day…" value={sharedText} onChange={e=>setSharedText(e.target.value)} required={!attached&&sharedType!=="mood"} maxLength={240}/></form><ChatMedia spaceId={selected.id} message={sharedText} onMessageSent={()=>setSharedText("")} onAttachmentChange={setAttached} sendRef={mediaSend} onBusy={setBusy} onSaved={entry=>{if(entry)setEntries(v=>[entry,...v.filter(e=>e.id!==entry.id)]);}} notify={notify}/><button form="shared-message-form" className="primary shared-send" disabled={busy||(!attached&&!sharedText.trim()&&sharedType!=="mood")}>{busy?"Sending…":"Send"}<ArrowUpRight size={22}/></button></div>
          {compose && (
            <Composer
              open
              close={() => setCompose(false)}
              type={composeType}
              date={localDate()}
              spaces={[selected]}
              defaultSpace={selected.id}
              connected
              onSaved={() => {
                void load();
                notify("Moment saved.");
              }}
            />
          )}
          <Dialog
            open={manage}
            onOpenChange={setManage}
            title="Your little circle"
            description="Only the owner can invite or remove members."
          >
            <div className="invite-panel"><div className="invite-intro"><span aria-hidden="true">💌</span><p>Bring your people into this little world. Send a friend an invite, or share a link with someone new.</p></div>
            <label>Invite a connected friend
              <select value={person} onChange={(e) => setPerson(e.target.value)}>
                <option value="">Choose a friend</option>
                {people.filter(p => p.status === "accepted").map(p => { const id = p.requester === userId ? p.recipient : p.requester; return <option key={id} value={id} disabled={members.some(m => m.user_id === id)}>{p.display_name}{members.some(m => m.user_id === id) ? " · already joined" : ""}</option>; })}
              </select>
            </label>
            <button className="primary wide" disabled={busy || !person} onClick={async () => { const sent = await action({ action: "invite_person", space_id: selected.id, target: person }); if(sent) { setPerson(""); notify("Invitation sent! Your friend can accept it in Notifications."); } }}>Send invitation <ArrowUpRight size={18}/></button>
            <p className="muted"><Link className="invite-find-link" href="/friends">Find and connect with people <ArrowUpRight size={24}/></Link></p>
            <h3>{members.length} members</h3>
            {members.map((m) => (
              <div className="list-row" key={m.user_id}>
                <span>
                  {m.user_id === userId ? "You · Owner" : `${m.display_name} · @${m.username}`}
                </span>
                {m.user_id !== userId && (
                  <button
                    className="secondary"
                    onClick={async () => {
                      if (confirm("Remove this member from the space?")) {
                        await action({
                          action: "remove",
                          space_id: selected.id,
                          member_id: m.user_id,
                        });
                        await load();
                      }
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                const code = await action({
                  action: "invite",
                  space_id: selected.id,
                });
                if (code) {
                  setInvite(code);
                  setCopied(false);
                  await load();
                }
              }}
            >
              Create invitation code
            </button>
            {invite && (
              <div className="invite-share"><label>
                Invitation code · expires in 7 days
                <input
                  readOnly
                  value={invite}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <div className="invite-actions">
                <button className="secondary" onClick={() => copyInvite()}><Copy size={18}/>{copied ? "Copied!" : "Copy code"}</button>
                <button className="secondary" onClick={() => copyInvite(true)}><Copy size={18}/>Copy link</button>
                <button className="primary" onClick={async () => { try { if(navigator.share) await navigator.share({title: selected.name, text: "Join my little world on Dearly", url: `${location.origin}/spaces?invite=${invite}`}); else await copyInvite(true); } catch(e) { if(!(e instanceof Error && e.name === "AbortError")) notify("Sharing is unavailable. Use Copy link instead."); } }}><Share2 size={18}/>Share</button>
              </div></div>
            )}
            <h3>Invitations</h3>
            {invites.map((i) => (
              <div className="list-row" key={i.id}>
                <span>
                  {i.revoked
                    ? "Revoked"
                    : "Expires " + new Date(i.expires_at).toLocaleDateString()}
                </span>
                {!i.revoked && (
                  <button
                    className="text-button"
                    onClick={async () => {
                      await action({ action: "revoke", invitation_id: i.id });
                      await load();
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}</div>
          </Dialog>
        </>
      ) : (
        <>
          {token && <div className="card invitation-banner"><span aria-hidden="true">💌</span><h2>Your shared journal is waiting</h2><p>Accept this invitation to join and see the moments inside.</p><button className="primary" disabled={busy} onClick={async () => { const id = await action({action: "join", token: token.trim()}); if(id) { const joined = await api<Space[]>("/api/spaces"); setSelected(joined.find(s => s.id === id) ?? null); setToken(""); history.replaceState(null, "", `/spaces?space=${id}`); notify("You’re in! Welcome to your shared journal."); } }}>Accept & open journal</button></div>}
          <div className="space-toolbar"><button className="primary" onClick={()=>setCreating(true)}>Create a space <Plus/></button><button className="secondary" onClick={()=>setJoining(true)}>Join a space <ArrowUpRight/></button></div><div className="spaces-grid">
            {spaces.map((s, i) => (
              <button
                className={"space-tile theme-" + (i % 3)}
                key={s.id}
                onClick={() => { setSelected(s); setInvite(""); setCopied(false); }}
              >
                <div className="space-illustration">{i % 2 ? "🪐" : "🏡"}</div>
                <div>
                  <span className="pill">
                    <Lock size={11} /> PRIVATE SPACE
                  </span>
                  <h2>{s.name}</h2>
                  <p>A little world, just for you.</p>
                  <ArrowUpRight />
                </div>
              </button>
            ))}
            <button
              className="space-tile new-space"
              onClick={() => setCreating(true)}
            >
              <div className="space-illustration">
                <Plus size={40} />
              </div>
              <h2>Make a little world.</h2>
              <p>
                For your person, your friends,
                <br />
                or the whole family.
              </p>
              <span className="secondary">
                Create a space <ArrowUpRight size={16} />
              </span>
            </button>
          </div>
          <Dialog open={joining} onOpenChange={setJoining} title="Join a space" description="Paste your invitation code or link.">
            <div>
              <h3>Been invited somewhere lovely?</h3>
              <p className="muted">
                Paste your invitation code to join a private space.
              </p>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                let code = token.trim();
                try { code = new URL(code).searchParams.get("invite") || code; } catch {}
                const result = await action({ action: "join", token: code });
                if (result) {
                  setToken("");
                  history.replaceState(null, "", "/spaces");
                  const joined = await api<Space[]>("/api/spaces");
                  setSelected(joined.find(s => s.id === result) ?? null);
                  setJoining(false);notify("Welcome to your shared space.");
                }
              }}
            >
              <input
                aria-label="Invitation code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste invitation code or link"
                required
                minLength={20}
              />
              <button className="primary" disabled={busy}>
                Join space
              </button>
            </form>
          </Dialog>
          <div className="privacy-note">
            <Lock />
            <div>
              <h3>A shared space. A private story.</h3>
              <p>
                Only members can see what’s shared here. Your personal journal
                stays yours until you choose to share an entry.
              </p>
            </div>
          </div>
        </>
      )}
      <Dialog
        open={creating}
        onOpenChange={setCreating}
        title="A world of your own"
        description="Give your private shared space a name."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const id = await action({ action: "create", name });
            if (id) {
              setCreating(false);
              setSelected({ id, name, owner_id: userId! } as Space);
              setManage(true);
              setName("");
              notify(
                "Your space is ready. Create an invitation to bring someone in.",
              );
            }
          }}
        >
          <label>
            Space name
            <input
              value={name}
              maxLength={60}
              required
              onChange={(e) => setName(e.target.value)}
              placeholder="Our little world"
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Creating…" : "Create our space"}
          </button>
        </form>
        {!connected && (
          <p className="demo-note">
            Private spaces require an account and a connected backend.
          </p>
        )}
      </Dialog>
    </>
  );
}
function senderColor(id: string) { const colors = ["#e5dcff", "#d8efff", "#ffe3d9", "#def3e3", "#fff0bd", "#f6dff0"]; return colors[Array.from(id).reduce((n,c) => n + c.charCodeAt(0), 0) % colors.length]; }
function Comments({ entry, notify, members, userId, onSaved }: { entry: Entry; notify: Notice; members: {user_id: string; display_name: string}[]; userId: string | null; onSaved:()=>void }) {
  const [comments, setComments] = useState<{ id: string; body: string; user_id: string; created_at: string }[]>([]);
  const [text, setText] = useState("");
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const db = browserClient();
    const [
      { data, error },
      { data: reactions, error: rError },
      {
        data: { user },
      },
    ] = await Promise.all([
      db
        .from("entry_comments")
        .select("id,body,user_id,created_at")
        .eq("entry_id", entry.id)
        .order("created_at"),
      db.from("entry_reactions").select("*").eq("entry_id", entry.id),
      db.auth.getUser(),
    ]);
    if (error || rError) {
      notify(error?.message ?? rError!.message);
      return;
    }
    setComments(data ?? []);
    setCount(reactions?.length ?? 0);
    setLiked(!!reactions?.some((r) => r.user_id === user?.id));
  }, [entry.id, notify]);
  useEffect(() => {
    void load();
    
  }, [load]);
  useLive(["entry_comments","entry_reactions"],()=>void load(),{column:"entry_id",value:entry.id});
  return (
    <div className="comments">
      <button
        aria-pressed={liked}
        className={liked ? "text-button purple" : "text-button"}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const db = browserClient();
            const {
              data: { user },
            } = await db.auth.getUser();
            if (!user) throw new Error("Sign in again");
            const { error } = liked
              ? await db
                  .from("entry_reactions")
                  .delete()
                  .eq("entry_id", entry.id)
                  .eq("user_id", user.id)
              : await db.from("entry_reactions").insert({
                  entry_id: entry.id,
                  user_id: user.id,
                  emoji: "heart",
                });
            if (error) throw error;
            await load();
          } catch (e) {
            notify(e instanceof Error ? e.message : "Could not react");
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="love-heart" aria-hidden="true">{liked?"❤️":"🤍"}</span>
        {count} little loves
      </button>
      <div className="conversation" aria-live="polite" aria-label="Replies">
      {comments.map((c) => (
        <div key={c.id} className={`chat-bubble ${c.user_id === userId ? "mine" : "theirs"}`} style={{background: senderColor(c.user_id)}}>
          <strong>{c.user_id === userId ? "You" : members.find(m => m.user_id === c.user_id)?.display_name || "Space member"}</strong>
          <p>{c.body}</p><time dateTime={c.created_at}>{new Date(c.created_at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</time>
        </div>
      ))}</div>
      {entry.space_id && <ChatMedia spaceId={entry.space_id} onSaved={onSaved} notify={notify}/>}
      <div className="quick-replies" aria-label="Quick reply"><button type="button" onClick={() => setText("Love this! 🥰")}>🥰 Love this</button><button type="button" onClick={() => setText("That made me smile ✨")}>✨ Made me smile</button></div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const db = browserClient();
            const {
              data: { user },
            } = await db.auth.getUser();
            const { error } = await db
              .from("entry_comments")
              .insert({ entry_id: entry.id, user_id: user?.id, body: text.trim() });
            if (error) throw error;
            setText("");
            await load();
          } catch (e) {
            notify(e instanceof Error ? e.message : "Could not add comment");
          } finally {
            setBusy(false);
          }
        }}
      >
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Leave a little love…"
          required
          maxLength={2000}
          aria-label="Comment"
        />
        <button className="primary" disabled={busy || !text.trim()}>
          {busy ? "Sending…" : "Send ↗"}
        </button>
      </form>
    </div>
  );
}
export function Friends({
  connected,
  userId,
  notify,
}: {
  connected: boolean;
  userId: string | null;
  notify: Notice;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<
    {
      requester: string;
      recipient: string;
      status: string;
      display_name: string;
      username: string;
    }[]
  >([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!connected) return;
    try {
      setConnections(await api("/api/social"));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not load connections");
    }
  }, [connected, notify]);
  useEffect(() => {
    void load();
  }, [load]);
  useLive(["connections","notifications"],()=>void load());
  async function action(kind: string, target: string) {
    try {
      setBusy(true);
      await api("/api/social", { action: kind, target });
      await load();
      notify(kind === "accept" ? "You’re connected! Open a space or add your friend to one." : "Connection updated.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to update connection");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="THE PEOPLE WHO FEEL LIKE HOME"
        title="Keep your favorites close."
        description="A smaller circle. A deeper connection. Search by name or @username, then send a connection request."
      />
      <form
        className="card friend-search"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!connected) {
            notify(
              "User search is available after connecting Supabase and signing in.",
            );
            return;
          }
          setBusy(true);
          try {
            setResults(
              await api("/api/social?username=" + encodeURIComponent(search.trim().replace(/^@/, ""))),
            );
            setSearched(true);
          } catch (e) {
            notify(e instanceof Error ? e.message : "Search failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Find someone
          <input
            required
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or @username"
            minLength={2}
            maxLength={60}
          />
        </label>
        <button className="primary" disabled={busy}>
          Find my person <ArrowUpRight size={16} />
        </button>
      </form>
      {results.map((p) => (
        <div className="card list-row" key={p.id}>
          <span className="avatar">{p.display_name[0]}</span>
          <div>
            <h3>{p.display_name}</h3>
            <p>@{p.username}</p>
          </div>
          {p.id !== userId && (
            <button
              className="secondary"
              disabled={busy || connections.some(c => c.requester === p.id || c.recipient === p.id)}
              onClick={() => action("request", p.id)}
            >
              {connections.some(c => (c.requester === p.id || c.recipient === p.id) && c.status === "accepted") ? "Connected" : connections.some(c => c.requester === p.id || c.recipient === p.id) ? "Request pending" : "Connect"}
            </button>
          )}
        </div>
      ))}
      {searched && !results.length && (
        <p className="muted">No matching profile yet. Ask your friend to finish setting their name and username in Settings, then search again.</p>
      )}
      <div className="space-toolbar" id="requests"><h2>Your requests & circle</h2><button className="secondary" onClick={load}><RefreshCw size={18}/>Refresh requests</button></div>
      {connections.length ? (
        connections.map((c) => {
          const target = c.requester === userId ? c.recipient : c.requester;
          return (
            <div className="card list-row" key={target}>
              <Users />
              <div>
                <strong>
                  {c.display_name} <span className="muted">@{c.username}</span>
                </strong>
                <p className="muted">
                  {c.status === "pending"
                    ? c.recipient === userId
                      ? "Wants to connect with you"
                      : "Request sent"
                    : c.status}
                </p>
              </div>
              {c.status === "accepted"&&<FriendSpaceActions target={target} notify={notify}/>}
              {c.status === "pending" && c.recipient === userId ? (
                <>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => action("accept", target)}
                  >
                    Accept request
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => action("decline", target)}
                  >
                    Decline
                  </button>
                </>
              ) : (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => action("remove", target)}
                >
                  {c.status === "blocked" ? "Unblock" : "Remove"}
                </button>
              )}
              {c.status !== "blocked" && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "Block this person? They will not be able to find your profile or connect.",
                      )
                    )
                      void action("block", target);
                  }}
                >
                  Block
                </button>
              )}
            </div>
          );
        })
      ) : (
        <Empty
          title="Good things begin with a hello."
          text="Search for a friend, sibling, or someone special to start building your circle."
        />
      )}
    </>
  );
}
export function Notifications({
  connected,
  notify,
}: {
  connected: boolean;
  notify: Notice;
}) {
  const [items, setItems] = useState<
    {
      id: string;
      title: string;
      body: string;
      read_at: string | null;
      created_at: string;
    }[]
  >([]);
  const load = useCallback(async () => {
    if (!connected) return;
    const { data, error } = await browserClient()
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) notify(error.message);
    else setItems(data ?? []);
  }, [connected, notify]);
  useEffect(() => {
    void load();
  }, [load]);
  useLive(["notifications"],()=>void load());
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE KNOCK AT YOUR DOOR"
        title="The latest from your world."
        description={`${items.filter((i) => !i.read_at).length} unread updates from the people and spaces you care about.`}
      />
      <div className="space-toolbar">
        <button className="secondary" onClick={load}>
          Refresh
        </button>
        <button
          className="secondary"
          onClick={async () => {
            if (!connected) return;
            const { error } = await browserClient()
              .from("notifications")
              .update({ read_at: new Date().toISOString() })
              .is("read_at", null);
            if (error) notify(error.message);
            else { window.dispatchEvent(new Event("dearly:notice-read")); await load(); }
          }}
        >
          Mark all as read
        </button>
      </div>
      {items.length ? (
        items.map((i) => (
          <div className="card list-row" key={i.id}>
            <Heart className="purple" />
            <div>
              <h3>{i.title}</h3>
              {/^\/spaces\?space=[a-f0-9-]{36}$/.test(i.body) ? <Link className="primary" href={i.body}>Enter shared space <ArrowUpRight size={18}/></Link> : /^\/spaces\?invite=[a-f0-9]{64}$/.test(i.body) ? <Link className="primary" href={i.body}>Accept invitation → <ArrowUpRight size={18}/></Link> : <p>{i.body}</p>}
              {i.title === "A new connection request" && <Link className="secondary" href="/friends#requests">Review & accept request</Link>}
              <small>{new Date(i.created_at).toLocaleString()}</small>
            </div>
            {!i.read_at && <span className="tiny-dot" />}
          </div>
        ))
      ) : (
        <Empty
          title="A lovely little quiet."
          text="Connection requests and new shared memories will find you here."
        />
      )}
    </>
  );
}
export function SettingsPanel({
  connected,
  profile,
  setProfile,
  dark,
  setDark,
  notify,
  compact = false,
}: {
  connected: boolean;
  profile: Profile | null;
  setProfile: (p: Profile) => void;
  dark: boolean;
  setDark: (b: boolean) => void;
  notify: Notice;
  compact?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [timezone, setTimezone] = useState(
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [notifications, setNotifications] = useState(
    profile?.notifications_enabled ?? true,
  );
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  return (
    <>
      {!compact && (
        <PageTitle
          eyebrow="MAKE YOURSELF AT HOME"
          title="A space that feels like you."
          description="The little details that make this world yours."
        />
      )}
      <form
        className={compact ? "" : "card settings-form"}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            if (!connected) {
              setProfile({
                id: "demo",
                display_name: name,
                username,
                timezone,
                notifications_enabled: notifications,
              });
              notify("Profile updated in this demo only.");
              return;
            }
            setProfile(
              await api<Profile>("/api/profile", {
                display_name: name,
                username,
                timezone,
                notifications_enabled: notifications,
              }),
            );
            notify("Profile saved.");
          } catch (e) {
            notify(e instanceof Error ? e.message : "Could not save profile");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>The everyday you</h3>
        <div className="profile-photo-editor">{profile?.avatar_path?<img src={profile.avatar_path} alt="Your profile picture"/>:<span>😊</span>}<label className="secondary">Upload profile picture<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async e=>{const f=e.target.files?.[0];if(!f||!profile)return;setBusy(true);try{if(f.size>10*1024*1024)throw new Error("Choose a photo under 10 MB");const bitmap=await createImageBitmap(f);const canvas=document.createElement("canvas");canvas.width=canvas.height=192;const ctx=canvas.getContext("2d")!;const side=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,192,192);bitmap.close();const avatar_path=canvas.toDataURL("image/webp",.8);const updated=await api<Profile>("/api/profile",{display_name:profile.display_name,username:profile.username,timezone:profile.timezone,avatar_path});setProfile(updated);notify("Profile picture saved.");}catch(e){notify(e instanceof Error?e.message:"Could not upload profile photo");}finally{setBusy(false);}}}/></label></div>
        <div className="field-row">
          <label>
            Display name
            <input
              value={name}
              required
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
            />
          </label>
          <label>
            Username
            <input
              value={username}
              required
              pattern="[a-z0-9_]{3,24}"
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="your_unique_name"
            />
            <small>3–24 lowercase letters, numbers, or underscores</small>
          </label>
        </div>
        <label>
          Timezone
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {Intl.supportedValuesOf("timeZone")
              .concat("UTC")
              .map((z) => (
                <option key={z}>{z}</option>
              ))}
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
          Notify me about new shared memories
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save my preferences"}
          <Check size={16} />
        </button>
      </form>
      {profile&&<PinSettings userId={profile.id}/>}<div className="card reminder-settings"><h3>Reminders & Home Screen</h3><p>Set task alerts, choose a daily journal time, turn notification sounds off, or see how to install Dearly.</p><button className="secondary" onClick={()=>window.dispatchEvent(new Event("dearly:reminders"))}>Edit reminders & installation ↗</button></div>
      {!compact && (
        <>
          <div className="card list-row">
            <div>
              <h3>Your favorite light</h3>
              <p className="muted">A soft glow, or a quiet night.</p>
            </div>
            <button className="secondary" onClick={() => setDark(!dark)}>
              {dark ? <Sun size={17} /> : <Moon size={17} />}Use{" "}
              {dark ? "light" : "dark"} mode
            </button>
          </div>
          <div className="privacy-note">
            <Lock />
            <div>
              <h3>Privacy starts with you.</h3>
              <p>
                Every new entry is private. Sharing with a space is always your
                choice. Dearly never sends your journal to an AI service.
              </p>
            </div>
          </div>
          <div className="card list-row">
            <Link href="/about" className="secondary settings-about-button">
              About Dearly
              <ArrowUpRight size={15} />
            </Link>
            {connected ? (
              <button
                className="secondary"
                onClick={async () => {
                  const { error } = await browserClient().auth.signOut();
                  if (error) notify(error.message);
                  else {await clearIdentity();clearCaches();router.push("/login");}
                }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            ) : (
              <Link className="secondary" href="/login">
                Account sign-in
              </Link>
            )}
          </div>
          {connected && (
            <button
              className="text-button danger-text"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={15} />
              Delete my account and memories
            </button>
          )}
        </>
      )}
      <Dialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Say goodbye to your journal?"
        description="This permanently deletes your account, uploads, entries, and spaces you own. This cannot be undone."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api(
                "/api/account",
                { confirm: confirmation, password },
                "DELETE",
              );
              router.push("/login");
            } catch (e) {
              notify(e instanceof Error ? e.message : "Deletion failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Type DELETE
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              pattern="DELETE"
            />
          </label>
          <label>
            Current password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button disabled={busy} className="danger">
            {busy ? "Deleting…" : "Permanently delete account"}
          </button>
        </form>
      </Dialog>
    </>
  );
}

function FriendSpaceActions({target,notify}:{target:string;notify:(s:string)=>void}) {
  const [spaces,setSpaces]=useState<Space[]>([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(false);
  const [creating,setCreating]=useState(false),[name,setName]=useState("Our space"),[created,setCreated]=useState<string|null>(null);
  async function invite(spaceId:string) {
    const r=await api<{redirect?:string;pending?:boolean}>("/api/spaces",{action:"invite_person",space_id:spaceId,target});
    notify(r.pending?"Invitation already sent":"Invitation sent");
    window.location.href=r.redirect || `/spaces?space=${spaceId}`;
  }
  return <div className="friend-space-actions">
    <button className="primary" disabled={busy} onClick={async()=>{
      setBusy(true);
      try {const shared=await api<Space[]>(`/api/spaces?with=${encodeURIComponent(target)}`);
        if(shared.length) window.location.href=`/spaces?space=${shared[0].id}`;
        else setCreating(true);
      } catch(e){notify(e instanceof Error?e.message:"Could not open space");} finally{setBusy(false);}
    }}>Open shared space <ArrowUpRight size={20}/></button>
    <button className="secondary" disabled={busy} onClick={async()=>{try{setSpaces(await api<Space[]>("/api/spaces"));setOpen(!open);}catch{notify("Could not load spaces");}}}>Add to shared space</button>
    {open&&<div>{spaces.map(s=><button key={s.id} disabled={busy} className="secondary" onClick={async()=>{setBusy(true);try{await invite(s.id);}catch(e){notify(e instanceof Error?e.message:"Could not invite");}finally{setBusy(false);}}}>{s.name} <ArrowUpRight size={20}/></button>)}{!spaces.length&&<button className="secondary" onClick={()=>setCreating(true)}>Create shared space</button>}</div>}
    <Dialog open={creating} onOpenChange={setCreating} title="Create your shared space" description="You don’t share a space yet. Create one and invite your friend.">
      <form onSubmit={async e=>{e.preventDefault();setBusy(true);try{
        const shared=await api<Space[]>(`/api/spaces?with=${encodeURIComponent(target)}`);
        if(shared.length){window.location.href=`/spaces?space=${shared[0].id}`;return;}
        let id=created;
        if(!id){const r=await api<{result:string}>("/api/spaces",{action:"create",name});id=r.result;setCreated(id);}
        await invite(id);
      }catch(e){notify(e instanceof Error?e.message:"Could not create space");}finally{setBusy(false);}}}>
        <label>Space name<input value={name} onChange={e=>setName(e.target.value)} required maxLength={60}/></label>
        <button className="primary" disabled={busy}>{busy?"Opening…":created?"Invite friend":"Create & invite"}<ArrowUpRight size={20}/></button>
      </form>
    </Dialog>
  </div>;
}
