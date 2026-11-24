import { NextResponse } from "next/server";
import { serverClient, configured } from "./supabase/server";
export async function authenticated(request?: Request) {
  if (request && request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin) {
      const source = new URL(origin);
      // Next may use an internal hostname in request.url. The Host header is
      // the browser's destination, including its port, and cannot be set by JS.
      const destination = request.headers.get("host") ?? new URL(request.url).host;
      if (!["https:", "http:"].includes(source.protocol) || source.host !== destination)
        throw new Error("Forbidden");
    }
  }
  if (!configured()) throw new Error("Supabase is not configured");
  const db = await serverClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { db, user };
}
export function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  return NextResponse.json(
    { error: message },
    {
      status:
        message === "Unauthorized"
          ? 401
          : message === "Forbidden"
            ? 403
            : message.includes("not configured")
              ? 503
              : 400,
    },
  );
}
export function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
