import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticated, check, failure } from "@/lib/api";
export async function DELETE(request: Request) {
  try {
    const { db, user } = await authenticated(request);
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
      throw new Error(
        "Account deletion requires the server administrator to configure the service role key.",
      );
    const { confirm, password } = await request.json();
    if (confirm !== "DELETE" || typeof password !== "string")
      throw new Error("Confirm deletion and enter your password.");
    const { error: authError } = await db.auth.signInWithPassword({
      email: user.email!,
      password,
    });
    check(authError);
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    while (true) {
      const { data, error } = await admin.storage
        .from("journal-media")
        .list(user.id, { limit: 100 });
      check(error);
      if (!data?.length) break;
      const removed = await admin.storage
        .from("journal-media")
        .remove(data.map((f) => `${user.id}/${f.name}`));
      check(removed.error);
    }
    const { error } = await admin.auth.admin.deleteUser(user.id);
    check(error);
    await db.auth.signOut();
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
