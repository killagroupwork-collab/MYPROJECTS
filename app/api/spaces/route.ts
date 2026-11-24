import { NextResponse } from "next/server";
import { authenticated, check, failure } from "@/lib/api";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    const { db, user } = await authenticated(request);
    const target = new URL(request.url).searchParams.get("with");
    if (target) {
      z.string().uuid().parse(target);
      const own = await db.from("shared_space_members").select("space_id").eq("user_id", user.id);
      check(own.error);
      const ids = (own.data || []).map(m => m.space_id);
      if (!ids.length) return NextResponse.json([]);
      const common = await db.from("shared_space_members").select("space_id").eq("user_id", target).in("space_id", ids);
      check(common.error);
      const shared = (common.data || []).map(m => m.space_id);
      if (!shared.length) return NextResponse.json([]);
      const result = await db.from("shared_spaces").select("*").in("id", shared).order("created_at");
      check(result.error);
      return NextResponse.json(result.data);
    }
    const { data, error } = await db
      .from("shared_spaces")
      .select("*,journal_entries(created_at)")
      .order("created_at",{referencedTable:"journal_entries",ascending:false}).limit(1,{referencedTable:"journal_entries"});
    check(error);
    return NextResponse.json((data??[]).map(({journal_entries,...s})=>({...s,last_activity:journal_entries?.[0]?.created_at??s.created_at})).sort((a,b)=>Date.parse(b.last_activity)-Date.parse(a.last_activity)));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user } = await authenticated(request);
    const input = z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("create"),
          name: z.string().trim().min(1).max(60),
        }),
        z.object({ action: z.literal("invite"), space_id: z.string().uuid() }),
        z.object({ action: z.literal("invite_person"), space_id: z.string().uuid(), target: z.string().uuid() }),
        z.object({
          action: z.literal("join"),
          token: z.string().min(20).max(200),
        }),
        z.object({
          action: z.literal("revoke"),
          invitation_id: z.string().uuid(),
        }),
        z.object({
          action: z.literal("remove"),
          space_id: z.string().uuid(),
          member_id: z.string().uuid(),
        }),
      ])
      .parse(await request.json());
    let result;
    if (input.action === "create")
      result = await db.rpc("create_space", { space_name: input.name });
    else if (input.action === "invite_person")
      result = await db.rpc("invite_connection_once", { target_space: input.space_id, target_user: input.target });
    else if (input.action === "invite")
      result = await db.rpc("create_invitation", {
        target_space: input.space_id,
      });
    else if (input.action === "join")
      result = await db.rpc("accept_invitation", { invite_token: input.token });
    else if (input.action === "remove")
      result = await db.rpc("remove_space_member", {
        target_space: input.space_id,
        target_member: input.member_id,
      });
    else
      result = await db
        .from("space_invitations")
        .update({ revoked: true })
        .eq("id", input.invitation_id);
    check(result.error);
    if(input.action==="invite_person")return NextResponse.json({result:result.data?.sent?"sent":null,redirect:result.data?.url,pending:result.data?.pending});
    if(input.action==="join"&&result.data){await db.from("notifications").update({body:`/spaces?space=${result.data}`,read_at:new Date().toISOString()}).eq("user_id",user.id).eq("body",`/spaces?invite=${input.token}`);}
    return NextResponse.json({ result: result.data });
  } catch (e) {
    return failure(e);
  }
}
