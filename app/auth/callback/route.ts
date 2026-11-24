import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const db = await serverClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    const next = url.searchParams.get("next") ?? "";
    if (!error)
      return NextResponse.redirect(
        new URL(
          url.searchParams.get("next") === "/login?reset=1"
            ? "/login?reset=1"
            : /^\/(my-day|journal|spaces|friends|play|memories|settings|notifications|daily-tasks)(\?|$)/.test(next) ? next : "/my-day",
          url.origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL(
      "/login?error=Unable%20to%20verify%20your%20sign-in%20link",
      url.origin,
    ),
  );
}
