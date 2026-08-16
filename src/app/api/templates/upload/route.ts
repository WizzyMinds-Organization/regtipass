import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const eventId = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const file = formData.get("file");

  if (!eventId || !name || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (ctx.event.status !== "active") {
    return NextResponse.json({ error: "Event is closed." }, { status: 409 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, or WebP images are allowed." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 8MB)." }, { status: 413 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // Re-encode server-side so nothing user-uploaded is served as-is.
  let output: Buffer;
  let width: number;
  let height: number;
  try {
    const image = sharp(inputBuffer, { limitInputPixels: 40_000_000 }).rotate();
    const metadata = await image.metadata();
    width = metadata.width ?? 0;
    height = metadata.height ?? 0;
    if (!width || !height) throw new Error("invalid image");
    output = await image.png().toBuffer();
  } catch {
    return NextResponse.json({ error: "Could not read image." }, { status: 400 });
  }

  const supabase = await createClient();
  const path = `${ctx.event.account_id}/${eventId}/${crypto.randomUUID()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("templates")
    .upload(path, output, { contentType: "image/png", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: template, error: insertError } = await supabase
    .from("templates")
    .insert({
      event_id: eventId,
      name,
      image_path: path,
      image_width: width,
      image_height: height,
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from("templates").remove([path]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ templateId: template.id });
}
