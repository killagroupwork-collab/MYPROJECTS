import { NextResponse } from "next/server";
import { authenticated, check, failure } from "@/lib/api";
import {localDate} from "@/lib/types";
import { entrySchema } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    const { db, user } = await authenticated();
    const url = new URL(request.url);
    const space = url.searchParams.get("space");
    let query = db
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    query = space ? query.eq("space_id", space) : query.eq("owner_id", user.id);
    const { data, error } = await query;
    check(error);
    const paths=[...new Set((data??[]).flatMap(e=>e.media_path?[e.media_path]:[]))];
    const signed=paths.length?await db.storage.from("journal-media").createSignedUrls(paths,3600):null;
    const urls=new Map((signed?.data??[]).map(item=>[item.path,item.signedUrl]));
    const entries=(data??[]).map(e=>({...e,media_url:e.media_path?urls.get(e.media_path):undefined}));
    return NextResponse.json(entries);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user } = await authenticated(request);
    const { id, client_id, client_owner_id, client_created_at, client_task, client_modified_at, ...input } = entrySchema.parse(await request.json());
    if(client_id){
      if(id || client_owner_id!==user.id || input.space_id || !(['text','photo','voice'].includes(input.type)||(client_task&&input.type==='achievement'&&input.metadata.goal_kind==='daily')))throw new Error("Forbidden");
      const existing=await db.from("journal_entries").select("*").eq("id",client_id).eq("owner_id",user.id).maybeSingle();
      check(existing.error);
      if(existing.data){
        if(!client_task)return NextResponse.json(existing.data);
        const {data:taskProfile}=await db.from("profiles").select("timezone").eq("id",user.id).single();
        if(existing.data.metadata.goal_kind!=="daily"||existing.data.entry_date!==input.entry_date||!client_modified_at||localDate(new Date(client_modified_at),taskProfile?.timezone||"UTC")!==input.entry_date||Date.parse(client_modified_at)>Date.now()+60000)throw new Error("Only tasks changed on their own day can sync");
        if((existing.data.metadata.offline_updated_at||"")>=client_modified_at)return NextResponse.json(existing.data);
        const update=await db.from("journal_entries").update({...input,metadata:{...input.metadata,offline_updated_at:client_modified_at}}).eq("id",client_id).eq("owner_id",user.id).select().single();check(update.error);return NextResponse.json(update.data);
      }
    }
    const {data:profile}=await db.from("profiles").select("timezone").eq("id",user.id).single();
    const today=localDate(new Date(),profile?.timezone||"UTC");
    if(input.type==="reflection" || (input.type==="achievement"&&input.metadata.goal_kind!=="daily"))throw new Error("Use a mood or activity check-in instead");
    if(input.metadata.goal_kind && input.metadata.goal_kind!=="daily")throw new Error("This feature has been retired");
    if(["meal","mood"].includes(input.type))throw new Error("Meal and mood entries have been removed");
    if(input.entry_date>today)throw new Error("You cannot write entries for a future day");
    if(id){const {data:existing,error:readError}=await db.from("journal_entries").select("metadata,entry_date").eq("id",id).eq("owner_id",user.id).single();check(readError);if(!existing?.metadata?.goal_kind&&(existing?.entry_date!==today||input.entry_date!==today))throw new Error("Only today’s journal entries can be edited");if(existing?.metadata?.goal_kind==="daily"&&(existing.entry_date!==today||input.entry_date!==today||input.metadata.goal_kind!=="daily"))throw new Error("Only today’s daily tasks can be changed");}
    if(input.metadata.goal_kind==="daily"&&input.entry_date!==today&&!(client_task&&client_id&&client_modified_at&&localDate(new Date(client_modified_at),profile?.timezone||"UTC")===input.entry_date&&Date.parse(client_modified_at)<=Date.now()))throw new Error("Daily tasks can only be created or changed for today");
    if (input.media_path && !input.media_path.startsWith(user.id + "/"))
      throw new Error("Forbidden");
    if (input.media_path) {
      const { data, error } = await db.storage
        .from("journal-media")
        .createSignedUrl(input.media_path, 60);
      check(error);
      if (!data) throw new Error("Upload not found");
    }
    const query = id
      ? db
          .from("journal_entries")
          .update(input)
          .eq("id", id)
          .eq("owner_id", user.id)
      : db.from("journal_entries").insert({ ...input, owner_id: user.id,...(client_id?{id:client_id}:{}),...(client_id&&client_created_at&&Date.parse(client_created_at)<=Date.now()+60000?{created_at:client_created_at}:{}) });
    const { data, error } = await query.select().single();
    if(error?.code==='23505'&&client_id){const replay=await db.from("journal_entries").select("*").eq("id",client_id).eq("owner_id",user.id).single();check(replay.error);return NextResponse.json(replay.data);}
    check(error);
    return NextResponse.json(data);
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const { db, user } = await authenticated(request);
    const { id } = await request.json();
    const [{data:profile},{data:existing,error:readError}]=await Promise.all([db.from("profiles").select("timezone").eq("id",user.id).single(),db.from("journal_entries").select("metadata,entry_date").eq("id",id).eq("owner_id",user.id).single()]);check(readError);
    if(existing?.metadata?.goal_kind==="daily"&&existing.entry_date!==localDate(new Date(),profile?.timezone||"UTC"))throw new Error("Past daily tasks are read-only");
    const { data, error } = await db
      .from("journal_entries")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("id")
      .single();
    check(error);
    return NextResponse.json(data);
  } catch (e) {
    return failure(e);
  }
}
