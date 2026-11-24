"use client";
import { useState, useEffect } from "react";
import { Entry, EntryType, localDate } from "@/lib/types";
import {
  BookOpen,
  Sun,
  Heart,
  Check,
  Lock,
  PenLine,
  Sparkles,
  ArrowUpRight,
  Mic,
  Images,
  Leaf,
} from "./ui/icons";
const missions: {
  type: EntryType;
  title: string;
  detail: string;
  Icon: typeof Sun;
  color: string;
}[] = [
  {
    type: "mood",
    title: "Meet your mood",
    detail: "Give today’s feeling a name.",
    Icon: Sun,
    color: "butter",
  },
  {
    type: "text",
    title: "Catch a little moment",
    detail: "A tiny story worth keeping.",
    Icon: PenLine,
    color: "lilac",
  },
  {
    type: "reflection",
    title: "Find a good thing",
    detail: "What made you smile today?",
    Icon: Leaf,
    color: "mint",
  },
];
export function DailyAdventure({
  entries,
  date,
  setDate,
  add,
}: {
  entries: Entry[];
  date: string;
  setDate: (date: string) => void;
  add: (type: EntryType) => void;
}) {
  const [tab, setTab] = useState("missions");
  const [collectionDay,setCollectionDay]=useState(()=>Math.floor(Date.now()/259200000));
  useEffect(()=>{const timer=setInterval(()=>setCollectionDay(Math.floor(Date.now()/259200000)),60000);return()=>clearInterval(timer);},[]);
  const collectionEntries=entries.filter(e=>Math.floor(new Date(e.entry_date+"T12:00:00").getTime()/259200000)===collectionDay);
  const themes=[["🌷","🌼","🌻","🌹","🪻","🌸"],["🍓","🍋","🍇","🍒","🍊","🍉"],["🦋","🐝","🐞","🐢","🐬","🦜"]];
  const types = new Set(
    entries.filter((e) => e.entry_date === date).map((e) => e.type),
  );
  const days = new Set(collectionEntries.map((e) => e.entry_date)).size;
  const badges = [
    {
      name: "First chapter",
      detail: "Save your first moment",
      earned: collectionEntries.length > 0,
      Icon: BookOpen,
      color: "butter",
    },
    {
      name: "Feeling finder",
      detail: "Save a mood check-in",
      earned: collectionEntries.some((e) => e.type === "mood"),
      Icon: Heart,
      color: "rose",
    },
    {
      name: "Memory maker",
      detail: "Journal on 3 different days",
      earned: days >= 3,
      Icon: Sparkles,
      color: "lilac",
    },
    {
      name: "Voice of you",
      detail: "Save a voice note",
      earned: collectionEntries.some((e) => e.type === "voice"),
      Icon: Mic,
      color: "mint",
    },
    {
      name: "Little lens",
      detail: "Save a photo moment",
      earned: collectionEntries.some((e) => e.type === "photo"),
      Icon: Images,
      color: "peach",
    },
    {
      name: "Growing story",
      detail: "Save 7 moments this collection",
      earned: collectionEntries.length >= 7,
      Icon: Leaf,
      color: "mint",
    },
  ];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date + "T12:00:00");
    const weekday = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - weekday + i);
    return d;
  });
  return (
    <>
      <div className="week-strip" aria-label="Choose a journal day">
        {week.map((d) => {
          const key = localDate(d);
          const has = entries.some((e) => !e.space_id && !e.metadata.goal_kind && ["text","photo","voice"].includes(e.type) && e.entry_date === key);
          return (
            <button
              key={key}
              onClick={() => setDate(key)}
              aria-pressed={date === key}
              aria-label={d.toLocaleDateString("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            >
              <span>{d.toLocaleDateString("en", { weekday: "short" })}</span>
              <strong>{d.getDate()}</strong>
              <i className={has ? "has-memory" : ""} />
            </button>
          );
        })}
      </div>
      <section className="adventure-hero">
        <div className="adventure-copy">
          <span className="quest-label">
            <Sparkles size={16} /> YOUR EVERYDAY ADVENTURE
          </span>
          <h2>
            Little moments.
            <br />
            <em>Your own adventure.</em>
          </h2>
          <p>
            Collect the laughs, the messy bits, the tiny wins. This story is
            yours.
          </p>
          <button className="primary" onClick={() => add("text")}>
            <PenLine size={18} /> Open my diary <ArrowUpRight size={18} />
          </button>
          <span className="hero-reassurance">
            <Lock size={12} /> Private unless you choose to share
          </span>
        </div>
        <div className="adventure-picture">
          <img
            src="/diary-adventure-3d.png"
            alt="A happy little star carrying its diary through a sunny world"
          />
          <span className="picture-sticker">Make today a keepsake ✦</span>
        </div>
      </section>
    </>
  );
}
