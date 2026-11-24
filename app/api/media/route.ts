import { NextResponse } from "next/server";
import { authenticated, check, failure } from "@/lib/api";
import { validMedia } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    const { db, user } = await authenticated(request);
    const { type, size } = await request.json();
    if (
      typeof type !== "string" ||
      typeof size !== "number" ||
      !validMedia(type, size)
    )
      throw new Error("Choose an image or audio file under 20 MB.");
    const ext = type.split(";")[0].split("/")[1];
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await db.storage
      .from("journal-media")
      .createSignedUploadUrl(path);
    check(error);
    return NextResponse.json(data);
  } catch (e) {
    return failure(e);
  }
}
