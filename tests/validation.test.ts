import test from "node:test";
import assert from "node:assert/strict";
import { entrySchema, profileSchema, validMedia } from "../lib/validation";
import { localDate } from "../lib/types";
const entry = {
  type: "text",
  title: "A real moment",
  entry_date: "2026-10-14",
};
test("entries default to private and strip forged owner identifiers", () => {
  const parsed = entrySchema.parse({ ...entry, owner_id: "someone-else" });
  assert.equal(parsed.space_id, null);
  assert.equal("owner_id" in parsed, false);
});
test("rejects invalid dates, blank titles, invalid spaces and excessive body sizes", () => {
  for (const value of [
    { ...entry, entry_date: "2026-02-30" },
    { ...entry, title: "   " },
    { ...entry, space_id: "invalid-id" },
    { ...entry, body: "x".repeat(20001) },
  ])
    assert.equal(entrySchema.safeParse(value).success, false);
});
test("all seven entry types validate and arbitrary types fail", () => {
  for (const type of [
    "text",
    "voice",
    "photo",
    "meal",
    "achievement",
    "mood",
    "reflection",
  ])
    assert.equal(entrySchema.safeParse({ ...entry, type }).success, true);
  assert.equal(
    entrySchema.safeParse({ ...entry, type: "script" }).success,
    false,
  );
});
test("upload validation rejects HTML, SVG, empty and oversized uploads", () => {
  assert.equal(validMedia("image/jpeg", 12345), true);
  assert.equal(validMedia("audio/webm;codecs=opus", 2000), true);
  for (const [type, size] of [
    ["text/html", 300],
    ["image/svg+xml", 200],
    ["image/png", 0],
    ["image/png", 21 * 1024 * 1024],
  ] as const)
    assert.equal(validMedia(type, size), false);
});
test("profile validation protects username format and timezone", () => {
  const profile = {
    display_name: "Ada",
    username: "ada_123",
    timezone: "Africa/Lagos",
  };
  assert.equal(profileSchema.safeParse(profile).success, true);
  assert.equal(
    profileSchema.safeParse({ ...profile, timezone: "Mars/Nowhere" }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ ...profile, username: "<script>" }).success,
    false,
  );
});
test("journal day respects the profile timezone near midnight", () => {
  const moment = new Date("2026-10-14T23:30:00Z");
  assert.equal(localDate(moment, "Africa/Lagos"), "2026-10-15");
  assert.equal(localDate(moment, "America/New_York"), "2026-10-14");
});
