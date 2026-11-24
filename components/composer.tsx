"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Pause,
  Play,
  Upload,
  Lock,
  Trash2,
} from "@/components/ui/icons";
import { Dialog } from "./ui/dialog";
import { Entry, EntryType, Space, entryTypes } from "@/lib/types";
import {preparePhoto} from "@/lib/prepare-photo";
import {browserClient} from "@/lib/supabase/client";
import { validMedia } from "@/lib/validation";
export async function api<T>(
  url: string,
  body?: unknown,
  method = "POST",
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    signal,
    method: body === undefined ? "GET" : method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error || "Something went wrong. Please try again.");
  return value;
}
export function Composer({
  open,
  close,
  entry,
  type = "text",
  date,
  spaces,
  connected,
  onSaved,
  defaultSpace = "",
  defaultMeal = "Breakfast",
}: {
  open: boolean;
  close: () => void;
  entry?: Entry;
  type?: EntryType;
  date: string;
  spaces: Space[];
  connected: boolean;
  onSaved: (entry: Entry) => void;
  defaultSpace?: string;
  defaultMeal?: string;
}) {
  const [kind, setKind] = useState<EntryType>(entry?.type ?? type);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [day, setDay] = useState(entry?.entry_date ?? date);
  const [space, setSpace] = useState(entry?.space_id ?? defaultSpace);
  const [meal, setMeal] = useState(entry?.metadata.meal ?? defaultMeal);
  const [time, setTime] = useState(entry?.metadata.time ?? "08:00");
  const [skipped, setSkipped] = useState(entry?.metadata.skipped === "true");
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [level, setLevel] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const animation = useRef<number>(0);
  const preview = useRef("");
  useEffect(
    () => () => {
      if (recorder.current?.state !== "inactive") recorder.current?.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animation.current);
      void context.current?.close();
      if (preview.current) URL.revokeObjectURL(preview.current);
    },
    [],
  );
  useEffect(() => {
    if (!recording || paused) return;
    const timer = setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [recording, paused]);
  async function start() {
    try {
      setError("");
      if (!navigator.mediaDevices || !window.MediaRecorder)
        throw new Error(
          "Voice recording is unavailable in this browser. You can upload an audio file instead.",
        );
      stream.current = stream.current?.active ? stream.current : await navigator.mediaDevices.getUserMedia({audio:true});
      stream.current.getAudioTracks().forEach(t=>t.enabled=true);
      const ac = new AudioContext();
      context.current = ac;
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      ac.createMediaStreamSource(stream.current).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      const measure = () => {
        analyser.getByteFrequencyData(samples);
        setLevel(samples.reduce((a, b) => a + b, 0) / samples.length / 128);
        animation.current = requestAnimationFrame(measure);
      };
      measure();
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType });
        const f = new File(
          [blob],
          "voice-diary." + (rec.mimeType.includes("mp4") ? "mp4" : "webm"),
          { type: rec.mimeType },
        );
        setFile(f);
        if (preview.current) URL.revokeObjectURL(preview.current);
        preview.current = URL.createObjectURL(blob);
        setAudioUrl(preview.current);
        stream.current?.getAudioTracks().forEach(t=>t.enabled=false);
        cancelAnimationFrame(animation.current);
        void ac.close();
        context.current = null;
        setLevel(0);
        setRecording(false);
        setPaused(false);
      };
      rec.start();
      setSeconds(0);
      setRecording(true);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(
        e instanceof Error ? e.message : "Microphone permission was denied.",
      );
    }
  }
  async function upload(original: File) {
    const f=original.type.startsWith("audio/")?original:await preparePhoto(original);
    if (!validMedia(f.type, f.size))
      throw new Error("Use an image or audio file under 20 MB.");
    const signed=await api<{path:string;token:string}>("/api/media",{type:f.type,size:f.size});
    const {error}=await browserClient().storage.from("journal-media").uploadToSignedUrl(signed.path,signed.token,f,{contentType:f.type});
    if(error)throw new Error(error.message);setProgress(100);
    return signed.path;
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (
        (kind === "voice" || kind === "photo") &&
        !file &&
        !entry?.media_path &&
        !entry?.media_url
      )
        throw new Error(
          kind === "voice"
            ? "Record or upload your voice note first."
            : "Choose a photo first.",
        );
      const input = {
        ...(entry ? { id: entry.id } : {}),
        type: kind,
        title: kind === "meal" ? (title.trim() || `${meal}${skipped ? " skipped" : " eaten"}`) : title.trim() || (kind === "photo" ? "A photo worth keeping" : "A little voice note"),
        body,
        entry_date: day,
        space_id: space || null,
        metadata:
          kind === "meal"
            ? { meal, time, skipped: String(skipped), status: skipped ? "skipped" : "ate" }
            : kind === "voice"
              ? { duration: String(seconds) }
              : {},
        media_path: entry?.media_path ?? null,
      };
      if (!connected) {
        onSaved({
          ...input,
          id: entry?.id ?? crypto.randomUUID(),
          owner_id: "demo",
          created_at: entry?.created_at ?? new Date().toISOString(),
          media_url: file ? URL.createObjectURL(file) : entry?.media_url,
        } as Entry);
        close();
        return;
      }
      if (file) input.media_path = await upload(file);
      const result = await api<Entry>("/api/entries", input);
      onSaved(result);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) close();
      }}
      title={entry ? "Revisit a moment" : "What’s on your mind?"}
      description={
        connected
          ? "Every little moment belongs here."
          : "Demo editor · Temporary edits, not saved to an account."
      }
    >
      <form onSubmit={save} className="moment-form">
        <div className="composer-mascot" aria-hidden="true">{kind === "meal" ? "🥐" : kind === "mood" ? "🥰" : kind === "achievement" ? "🏆" : "📖"}</div>
        <div className="type-tabs">
          {entryTypes.map((t) => (
            <button
              type="button"
              key={t}
              className={kind === t ? "selected" : ""}
              onClick={() => setKind(t)}
            >
              {t === "text"
                ? "📖 Journal"
                : t === "voice"
                  ? "🎙️ Voice"
                  : t === "photo"
                    ? "📸 Photo"
                    : t === "meal"
                      ? "🥐 Meal"
                      : t === "achievement"
                        ? "🏆 Win"
                        : t === "mood"
                          ? "🥰 Mood"
                          : "🌤️ Reflection"}
            </button>
          ))}
        </div>
        <label>
          {kind === "meal" ? "What did you eat?" : "✨ Title"}
          <input
            required={!["meal","photo","voice"].includes(kind)}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === "meal" ? "e.g. Jollof rice and chicken (optional)" : kind === "achievement"
                ? "A small win worth celebrating…"
                : "Give this moment a name…"
            }
          />
        </label>
        {!["meal","photo","voice"].includes(kind) && (
        <label>
          💭 Your thoughts
          <textarea
            rows={5}
            value={body}
            maxLength={20000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="No perfect words needed. Just you, being you."
          />
        </label>
        )}
        {kind === "meal" && (
          <div className="field-row">
            <label>
              🥐 Meal
              <select value={meal} onChange={(e) => setMeal(e.target.value)}>
                {["Breakfast", "Lunch", "Dinner", "Snack"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              🕒 Time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <fieldset className="meal-status"><legend>Did you eat?</legend><label className={!skipped?"picked":""}><input type="radio" name="meal-status" checked={!skipped} onChange={()=>setSkipped(false)}/> I ate ✓</label><label className={skipped?"picked":""}><input type="radio" name="meal-status" checked={skipped} onChange={()=>setSkipped(true)}/> I skipped it</label></fieldset>
          </div>
        )}
        {kind === "voice" && (
          <div className="recorder">
            <div
              className="record-level"
              style={{ transform: `scale(${1 + level * 0.5})` }}
            >
              <Mic size={24} />
            </div>
            <strong>
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </strong>
            {!recording ? (
              <button type="button" className="secondary" onClick={start}>
                <Mic size={16} />
                Record
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={paused ? "Resume recording" : "Pause recording"}
                  onClick={() => {
                    if (paused) recorder.current?.resume();
                    else recorder.current?.pause();
                    setPaused(!paused);
                  }}
                >
                  {paused ? <Play /> : <Pause />}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Stop recording"
                  onClick={() => recorder.current?.stop()}
                >
                  <Square />
                </button>
              </>
            )}
            {audioUrl && (
              <>
                <audio controls src={audioUrl} />
                <button
                  type="button"
                  aria-label="Discard recording"
                  className="icon-button"
                  onClick={() => {
                    setAudioUrl("");
                    setFile(undefined);
                    URL.revokeObjectURL(preview.current);
                    preview.current = "";
                    setSeconds(0);
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        )}
        {["photo", "meal", "voice", "achievement"].includes(kind) && (
          <label className="upload">
            <Upload size={18} />
            {file ? file.name : kind === "meal" ? "Add a meal photo (optional)" : "Add a photo or audio file · up to 20 MB"}
            <input
              type="file"
              accept={
                kind === "voice"
                  ? "audio/*"
                  : "image/*"
              }
              onChange={(e) => {
                setFile(e.target.files?.[0]);
                setError("");
              }}
            />
          </label>
        )}
        <div className="field-row">
          <label>
            🗓️ Date
            <input
              type="date"
              required
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
          <label>
            <Lock size={13} /> Visibility
            <select value={space} onChange={(e) => setSpace(e.target.value)}>
              <option value="">Only me · Private</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {busy && file && (
          <progress value={progress} max={100} aria-label="Upload progress" />
        )}
        <div className="dialog-footer">
          <span>
            <Lock size={12} /> Yours to keep. Yours to share.
          </span>
          <button className="primary" disabled={busy || recording}>
            {busy ? "Saving…" : connected ? "Save my moment" : "Add to demo"}{" "}
            <span>↗</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
