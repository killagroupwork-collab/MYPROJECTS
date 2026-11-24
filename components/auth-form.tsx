"use client";
import {pinKey} from "@/lib/journal-pin";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Heart } from "@/components/ui/icons";
import { browserClient } from "@/lib/supabase/client";
export function AuthForm({ configured,emailRecovery=false,googleReady=false }: { configured: boolean;emailRecovery?:boolean;googleReady?:boolean }) {
  const router = useRouter();
  const [googleEnabled, setGoogleEnabled] = useState(googleReady);
  useEffect(() => {
    if (!configured || googleReady) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    void fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/settings", {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      cache: "no-store", signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return;
      const settings = await response.json();
      if (!controller.signal.aborted) setGoogleEnabled(settings.external?.google === true);
    }).catch(() => {}).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [configured, googleReady]);
  const [mode, setMode] = useState("signup");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if(query.get("mode")==="login")setMode("signin");
    if(query.has("recovery"))setMode("reset");
    if (query.has("reset")) setMode("update");
    if (query.has("error")) setError(query.get("error")!);
  }, []);
  function destination() {
    const next = new URLSearchParams(location.search).get("next");
    return next && /^\/(my-day|journal|spaces|friends|play|memories|settings|notifications|daily-tasks|savings-goals)(\?|$)/.test(next) ? next : "/my-day";
  }
  async function signInWithGoogle() {
    if (busy || !configured || !googleEnabled) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const callback = new URL("/auth/callback", location.origin);
      callback.searchParams.set("next", destination());
      const { error } = await browserClient().auth.signInWithOAuth({
        provider: "google", options: { redirectTo: callback.toString() },
      });
      if (error) throw error;
    } catch {
      setError("Google sign-in could not start. Please try again or use email.");
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!configured) {
      setError(
        "Accounts are not open yet. Please come back once setup is complete.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const values = new FormData(e.currentTarget);
      const email = String(values.get("email") ?? "").trim();
      const password = String(values.get("password"));
      const db = browserClient();
      let result;
      if (mode === "signup")
        result = await db.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin + "/auth/callback" },
        });
      else if (mode === "reset") {
        if(!emailRecovery)throw new Error("Email recovery is not available until Dearly’s email provider is connected. If you remember your account password, use it to recover your PIN.");
        result = await db.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + "/auth/callback?next=/login?reset=1",
        });
      }
      else if (mode === "update")
        result = await db.auth.updateUser({ password });
      else result = await db.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if(mode==="update"){const {data}=await db.auth.getUser();if(data.user){localStorage.removeItem(pinKey(data.user.id));localStorage.removeItem(pinKey(data.user.id)+":attempts");}}
      if (mode === "signup") {
        if ("session" in result.data && result.data.session) { router.push(destination()); router.refresh(); }
        else setMessage("Check your email to confirm your account, then sign in.");
      }
      else if (mode === "reset")
        setMessage("If an account exists, a reset link is on its way.");
      else router.push(destination());
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Sign-in failed";
      setError(/email rate limit|rate.*exceed/i.test(detail)
        ? "Too many attempts. Please wait a moment and try again."
        : /email not confirmed/i.test(detail)
          ? "Please confirm your email using the link in your inbox before signing in. Check your spam folder too."
          : detail);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <Link href="/about" className="brand">
        <img src="/dearly-logo-clear.png" alt="Dearly"/>
      </Link>
      <div className="auth-card">
        <div className="auth-symbol">
          <Heart />
        </div>
        <p className="eyebrow">YOUR DAYS, HELD CLOSE</p>
        <h1>
          {mode === "signup"
            ? "Register"
            : mode === "reset"
              ? "Reset your password"
              : mode === "update"
                ? "Choose a new password."
                : "Login"}
        </h1>
        <p className="muted">
          {mode === "reset" ? "Enter your registered email to request a password reset link." : "Your journal. Your people. Your space."}
        </p>
        {googleEnabled && (mode === "signin" || mode === "signup") && <button type="button" className="secondary wide" disabled={busy || !configured} onClick={signInWithGoogle}>Continue with Google</button>}
        <form onSubmit={submit}>
          {mode !== "update" && (
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Password
              <input
                type="password"
                name="password"
                minLength={8}
                required
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                placeholder="At least 8 characters"
              />
            </label>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="success" role="status">
              {message}
            </p>
          )}
          <button className="primary wide" disabled={busy || !configured}>
            {busy
              ? "One moment…"
              : mode === "signup"
                ? "Register"
                : mode === "reset"
                  ? "Send reset link"
                  : mode === "update"
                    ? "Save password"
                    : "Login"}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <div className="auth-options">
          <button
            className="register-toggle"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setMessage("");
            }}
          >
            {mode === "signup"
              ? "Already registered? Login"
              : mode === "signin" ? "Register" : "Back to login"}
          </button>
          <button className="secondary" onClick={()=>{setMode("reset");setError("");setMessage("");}}>Forgot password?</button>
        </div>
        {!configured && (
          <p className="demo-note">
            We’re getting your new world ready. Sign-up will open when account
            setup is complete.
          </p>
        )}
      </div>
    </main>
  );
}
