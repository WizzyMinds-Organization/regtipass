import "server-only";
import sharp from "sharp";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import type { FormField, TemplateAnchor } from "@/lib/supabase/types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textAnchorFor(align: string): string {
  if (align === "center") return "middle";
  if (align === "right") return "end";
  return "start";
}

export async function renderTicketPng(ticketId: string): Promise<Buffer | null> {
  const supabase = await createClient();

  const { data: ticket } = await supabase.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticket) return null;

  const [{ data: template }, { data: fields }] = await Promise.all([
    supabase.from("templates").select("*").eq("id", ticket.template_id).maybeSingle(),
    supabase.from("form_fields").select("*").eq("event_id", ticket.event_id),
  ]);
  if (!template) return null;

  const { data: anchors } = await supabase
    .from("template_anchors")
    .select("*")
    .eq("template_id", template.id)
    .eq("visible", true);

  const { data: fileData } = await supabase.storage.from("templates").download(template.image_path);
  if (!fileData) return null;
  const backgroundBuffer = Buffer.from(await fileData.arrayBuffer());

  const fieldByKey = new Map<string, FormField>((fields ?? []).map((f) => [f.key, f]));
  const participantData = ticket.participant_data as Record<string, string>;

  const composites: Array<{ input: Buffer; left?: number; top?: number }> = [];
  const textNodes: string[] = [];

  for (const anchor of (anchors ?? []) as TemplateAnchor[]) {
    if (anchor.kind === "qr") {
      const qrBuffer = await QRCode.toBuffer(ticket.id, {
        margin: 1,
        width: Math.round(anchor.width),
      });
      const qrResized = await sharp(qrBuffer)
        .resize(Math.round(anchor.width), Math.round(anchor.height))
        .png()
        .toBuffer();
      composites.push({ input: qrResized, left: Math.round(anchor.x), top: Math.round(anchor.y) });
      continue;
    }

    let text = "";
    if (anchor.kind === "ticket_id") {
      text = ticket.id;
    } else if (anchor.kind === "field" && anchor.field_key) {
      text = participantData?.[anchor.field_key] ?? "";
    }
    if (!text) continue;

    const anchorX =
      anchor.align === "center"
        ? anchor.x + anchor.width / 2
        : anchor.align === "right"
        ? anchor.x + anchor.width
        : anchor.x;

    textNodes.push(
      `<text x="${anchorX}" y="${anchor.y + anchor.font_size}" font-family="sans-serif" ` +
        `font-size="${anchor.font_size}" fill="${escapeXml(anchor.color)}" ` +
        `text-anchor="${textAnchorFor(anchor.align)}">${escapeXml(text)}</text>`
    );
  }

  const overlaySvg = `<svg width="${template.image_width}" height="${template.image_height}" xmlns="http://www.w3.org/2000/svg">${textNodes.join("")}</svg>`;

  composites.push({ input: Buffer.from(overlaySvg) });

  const output = await sharp(backgroundBuffer)
    .resize(template.image_width, template.image_height)
    .composite(composites)
    .png()
    .toBuffer();

  return output;
}
