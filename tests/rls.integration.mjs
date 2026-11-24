// Run with a local/test Supabase URL and service-role key. Never run against production.
// This harness creates three temporary users, verifies cross-user denial, then deletes them.
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
const url = process.env.TEST_SUPABASE_URL,
  key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
  anon = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key || !anon)
  throw new Error(
    "Set TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY and TEST_SUPABASE_SERVICE_ROLE_KEY for an isolated test project.",
  );
const admin = createClient(url, key, { auth: { persistSession: false } });
const users = [];
const stamp = Date.now();
try {
  for (let i = 0; i < 3; i++) {
    const email = `dearly-test-${stamp}-${i}@example.com`,
      password = crypto.randomUUID() + "Aa1!";
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.ifError(error);
    users.push(data.user.id);
    const db = createClient(url, anon, { auth: { persistSession: false } });
    assert.ifError(
      (await db.auth.signInWithPassword({ email, password })).error,
    );
    assert.ifError(
      (
        await db
          .from("profiles")
          .insert({
            id: data.user.id,
            display_name: `Test ${i}`,
            username: `t${stamp}_${i}`,
            timezone: "UTC",
          })
      ).error,
    );
    users[i] = { id: data.user.id, db };
  }
  const [a, b, c] = users;
  const own = await a.db
    .from("journal_entries")
    .insert({
      owner_id: a.id,
      type: "text",
      title: "Private",
      entry_date: "2026-10-14",
    })
    .select()
    .single();
  assert.ifError(own.error);
  for (const u of [b, c]) {
    const result = await u.db
      .from("journal_entries")
      .select("*")
      .eq("id", own.data.id);
    assert.ifError(result.error);
    assert.equal(result.data.length, 0);
  }
  const forged = await b.db
    .from("journal_entries")
    .insert({
      owner_id: a.id,
      type: "text",
      title: "Forged",
      entry_date: "2026-10-14",
    });
  assert.ok(forged.error);
  const space = await a.db.rpc("create_space", { space_name: "Security test" });
  assert.ifError(space.error);
  const escalation = await b.db
    .from("shared_space_members")
    .insert({ space_id: space.data, user_id: b.id });
  assert.ok(escalation.error);
  const token = await a.db.rpc("create_invitation", {
    target_space: space.data,
  });
  assert.ifError(token.error);
  assert.ifError(
    (await b.db.rpc("accept_invitation", { invite_token: token.data })).error,
  );
  assert.ifError(
    (
      await a.db
        .from("journal_entries")
        .update({ space_id: space.data })
        .eq("id", own.data.id)
    ).error,
  );
  assert.equal(
    (await b.db.from("journal_entries").select("*").eq("id", own.data.id)).data
      .length,
    1,
  );
  assert.equal(
    (await c.db.from("journal_entries").select("*").eq("id", own.data.id)).data
      .length,
    0,
  );
  const edit = await b.db
    .from("journal_entries")
    .update({ title: "Overwritten" })
    .eq("id", own.data.id)
    .select();
  assert.equal(edit.data?.length ?? 0, 0);
  assert.ok(
    (await b.db.rpc("create_invitation", { target_space: space.data })).error,
  );
  assert.ifError(
    (
      await a.db.rpc("remove_space_member", {
        target_space: space.data,
        target_member: b.id,
      })
    ).error,
  );
  assert.equal(
    (await b.db.from("journal_entries").select("*").eq("id", own.data.id)).data
      .length,
    0,
  );
  assert.ifError(
    (
      await a.db
        .from("space_invitations")
        .update({ revoked: true })
        .eq("space_id", space.data)
    ).error,
  );
  assert.ok(
    (await b.db.rpc("accept_invitation", { invite_token: token.data })).error,
  );
  console.log(
    "PASS: private-entry isolation, forged ownership denial, membership escalation denial, invite/owner checks, shared reads, edit denial, removal and revocation.",
  );
} finally {
  for (const u of users) {
    const { error } = await admin.auth.admin.deleteUser(
      typeof u === "string" ? u : u.id,
    );
    if (error) console.error("Test-user cleanup failed:", error.message);
  }
}
