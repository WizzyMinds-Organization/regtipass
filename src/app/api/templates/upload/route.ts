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
  const priceRaw = formData.get("price");
  const price = priceRaw ? Number(priceRaw) : 0;

  if (!eventId || !name || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Price must be a non-negative number." }, { status: 400 });
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
      price,
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from("templates").remove([path]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await copyAnchorsFromPreviousTemplate(supabase, eventId, template);

  return NextResponse.json({ templateId: template.id });
}

// New templates usually need the same QR/ticket-ID/field layout as the
// event's existing templates, just on different artwork. Copy the most
// recently created template's anchors over as a starting point, scaled
// proportionally in case the new artwork has different pixel dimensions,
// so the organizer only has to touch what's actually different.
async function copyAnchorsFromPreviousTemplate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  newTemplate: { id: string; image_width: number; image_height: number }
) {
  const { data: previous } = await supabase
    .from("templates")
    .select("id, image_width, image_height")
    .eq("event_id", eventId)
    .neq("id", newTemplate.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!previous) return;

  const { data: anchors } = await supabase
    .from("template_anchors")
    .select("*")
    .eq("template_id", previous.id);

  if (!anchors || anchors.length === 0) return;

  const scaleX = newTemplate.image_width / previous.image_width;
  const scaleY = newTemplate.image_height / previous.image_height;
  const scaleFont = (scaleX + scaleY) / 2;

  await supabase.from("template_anchors").insert(
    anchors.map((a) => ({
      template_id: newTemplate.id,
      kind: a.kind,
      field_key: a.field_key,
      x: Math.round(a.x * scaleX),
      y: Math.round(a.y * scaleY),
      width: Math.round(a.width * scaleX),
      height: Math.round(a.height * scaleY),
      font: a.font,
      font_size: Math.round(a.font_size * scaleFont),
      align: a.align,
      color: a.color,
      visible: a.visible,
    }))
  );
}
