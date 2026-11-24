import { NextResponse } from "next/server";
import { authenticated, check, failure } from "@/lib/api";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    const { db,user } = await authenticated();
    const url = new URL(request.url);
    const username = url.searchParams.get("username");
    if (username) {
      const { data, error } = await db.rpc("find_profile", {
        exact_username: username.trim().replace(/^@/, "").toLowerCase(),
      });
      check(error);
      return NextResponse.json(data);
    }
    const { data, error } = await db.rpc("list_connections");
    check(error);
    const times=await db.from("connections").select("requester,recipient,created_at").order("created_at",{ascending:false});check(times.error);
    const dates=new Map((times.data??[]).map(c=>[c.requester+":"+c.recipient,Date.parse(c.created_at)]));
    type C={requester:string;recipient:string;status:string};
    const rank=(c:C)=>c.status==="pending"?(c.recipient===user.id?0:1):2;
    const at=(c:C)=>dates.get(c.requester+":"+c.recipient)??0;
    return NextResponse.json((data??[]).sort((a:C,b:C)=>rank(a)-rank(b)||at(b)-at(a)));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db } = await authenticated(request);
    const input = z
      .object({
        action: z.enum(["request", "accept", "decline", "remove", "block"]),
        target: z.string().uuid(),
      })
      .parse(await request.json());
    const { data, error } = await db.rpc("connection_action", {
      action_name: input.action,
      target_user: input.target,
    });
    check(error);
    return NextResponse.json(data);
  } catch (e) {
    return failure(e);
  }
}
