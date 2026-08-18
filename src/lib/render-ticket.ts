import "server-only";
import sharp from "sharp";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TemplateAnchor } from "@/lib/supabase/types";
import { TICKET_FONT_BASE64 } from "@/lib/fonts/ticket-font";

const TICKET_FONT_FAMILY = "TicketFont";

// Template artwork rarely changes (image_path is a fresh UUID per upload,
// so a re-upload just gets a new cache entry) but was being re-downloaded
// from Storage on every single render — the dominant cost when a booth
// issues many tickets back-to-back off the same template. Cached per warm
// server instance and can be pre-warmed via warmTemplateBackground() before
// the ticket that needs it even exists yet.
const MAX_CACHE_ENTRIES = 30;
const backgroundCache = new Map<string, Buffer>();

async function getTemplateBackground(
  supabase: ReturnType<typeof createAdminClient>,
  imagePath: string
): Promise<Buffer | null> {
  const cached = backgroundCache.get(imagePath);
  if (cached) return cached;

  const { data: fileData } = await supabase.storage.from("templates").download(imagePath);
  if (!fileData) return null;
  const buffer = Buffer.from(await fileData.arrayBuffer());

  if (backgroundCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = backgroundCache.keys().next().value;
    if (oldestKey) backgroundCache.delete(oldestKey);
  }
  backgroundCache.set(imagePath, buffer);
  return buffer;
}

export async function warmTemplateBackground(imagePath: string): Promise<void> {
  if (backgroundCache.has(imagePath)) return;
  await getTemplateBackground(createAdminClient(), imagePath);
}

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
  // Admin client, deliberately: /api/tickets/[ticketId]/render has no auth
  // check by design — a ticket holder without a staff account still needs
  // to view/download/share their own ticket by ID. RLS requires account
  // membership on tickets/templates/template_anchors, which would otherwise
  // make every unauthenticated view 404. The unguessable ticket ID
  // (TICKET_ID_PATTERN, ~2.9x10^14 combinations) is the access boundary
  // here, not a session.
  const supabase = createAdminClient();

  const { data: ticket } = await supabase.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticket) return null;

  const [{ data: template }, { data: anchors }] = await Promise.all([
    supabase.from("templates").select("*").eq("id", ticket.template_id).maybeSingle(),
    supabase.from("template_anchors").select("*").eq("template_id", ticket.template_id).eq("visible", true),
  ]);
  if (!template) return null;

  const backgroundBuffer = await getTemplateBackground(supabase, template.image_path);
  if (!backgroundBuffer) return null;

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
      `<text x="${anchorX}" y="${anchor.y + anchor.font_size}" font-family="${TICKET_FONT_FAMILY}, sans-serif" ` +
        `font-size="${anchor.font_size}" fill="${escapeXml(anchor.color)}" ` +
        `text-anchor="${textAnchorFor(anchor.align)}">${escapeXml(text)}</text>`
    );
  }

  // sharp's SVG rasterizer has no system fonts to fall back on in a
  // serverless runtime, so "sans-serif" alone resolves to nothing and text
  // renders blank. Embedding the font directly in the SVG guarantees it's
  // always available regardless of what's installed on the host.
  const fontFace = `<defs><style>@font-face { font-family: '${TICKET_FONT_FAMILY}'; src: url(data:font/ttf;base64,${TICKET_FONT_BASE64}) format('truetype'); }</style></defs>`;
  const overlaySvg = `<svg width="${template.image_width}" height="${template.image_height}" xmlns="http://www.w3.org/2000/svg">${fontFace}${textNodes.join("")}</svg>`;

  composites.push({ input: Buffer.from(overlaySvg) });

  const output = await sharp(backgroundBuffer)
    .resize(template.image_width, template.image_height)
    .composite(composites)
    .png()
    .toBuffer();

  return output;
}
