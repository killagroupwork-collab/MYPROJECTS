import { NextResponse } from "next/server";
import { authenticated, check, failure } from "@/lib/api";
import { profileSchema } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    const { db, user } = await authenticated(request);
    const input = profileSchema.parse(await request.json());
    const { data, error } = await db
      .from("profiles")
      .upsert({ ...input, id: user.id })
      .select()
      .single();
    check(error);
    return NextResponse.json(data);
  } catch (e) {
    return failure(e);
  }
}
