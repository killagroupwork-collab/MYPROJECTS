import { notFound, redirect } from "next/navigation";
import { configured, serverClient } from "@/lib/supabase/server";
import { JournalApp } from "@/components/journal-app";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { section } = await params;
  if (["savings-goals"].includes(section)) redirect("/my-day");
  if (
    ![
      "my-day",
      "journal",
      "voice",
      "spaces",
      "friends",
      "play",
      "memories",
      "notifications",
      "settings",
      "daily-tasks",
      "savings-goals",
    ].includes(section)
  )
    notFound();
  let profile = null;
  let userId = null;
  const connected = configured();
  if (!connected && process.env.DEARLY_LOCAL_PREVIEW !== "true")
    redirect("/login");
  if (connected) {
    const db = await serverClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) {
      const { invite } = await searchParams;
      const next = section === "spaces" && invite && /^[a-f0-9]{64}$/.test(invite) ? `/spaces?invite=${invite}` : `/${section}`;
      redirect("/login?next=" + encodeURIComponent(next));
    }
    userId = user.id;
    const { data } = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }
  return (
    <JournalApp
      section={section}
      connected={connected}
      initialProfile={profile}
      userId={userId}
    />
  );
}
