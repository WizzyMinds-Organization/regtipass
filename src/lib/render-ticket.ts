import "server-only";
import sharp from "sharp";
import QRCode from "qrcode";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TemplateAnchor } from "@/lib/supabase/types";
import { TICKET_FONT_BASE64 } from "@/lib/fonts/ticket-font";

const TICKET_FONT_FAMILY = "TicketFont";

// sharp's SVG text rendering goes through librsvg -> Pango -> fontconfig,
// which needs a working fonts.conf on disk to lay out ANY text at all —
// including an embedded @font-face, since font matching still routes
// through that same broken chain. Vercel's Node runtime has no fontconfig
// config file ("Fontconfig error: Cannot load default config file"), so
// every <text> node rendered blank while the QR (a plain raster composite,
// no text layout involved) rendered fine. @napi-rs/canvas is a
// self-contained Rust canvas engine with its own font loader — no
// fontconfig, no Pango, nothing OS-dependent — so text is drawn on a
// canvas layer and composited as a plain PNG instead of going through SVG.
let fontRegistered = false;
function ensureFontRegistered() {
  if (fontRegistered) return;
  GlobalFonts.register(Buffer.from(TICKET_FONT_BASE64, "base64"), TICKET_FONT_FAMILY);
  fontRegistered = true;
}

// One client per warm Lambda instance instead of one per request: each
// render does 3 sequential Supabase calls (ticket, template+anchors,
// storage), and createAdminClient() per call meant paying a fresh TLS
// handshake on every single one of them even within the same warm
// container, since Node's fetch client had nothing to keep a connection
// alive across. A lazily-created singleton lets the underlying HTTP agent
// reuse connections across calls in the same invocation and across
// invocations on the same warm instance, without touching env vars at
// module-import time.
let cachedAdminClient: ReturnType<typeof createAdminClient> | null = null;
function getAdminClient() {
  if (!cachedAdminClient) cachedAdminClient = createAdminClient();
  return cachedAdminClient;
}

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
  await getTemplateBackground(getAdminClient(), imagePath);
}

function canvasAlign(align: string): CanvasTextAlign {
  if (align === "center") return "center";
  if (align === "right") return "right";
  return "left";
}

export async function renderTicketPng(ticketId: string): Promise<Buffer | null> {
  // Admin client, deliberately: /api/tickets/[ticketId]/render has no auth
  // check by design — a ticket holder without a staff account still needs
  // to view/download/share their own ticket by ID. RLS requires account
  // membership on tickets/templates/template_anchors, which would otherwise
  // make every unauthenticated view 404. The unguessable ticket ID
  // (TICKET_ID_PATTERN, ~2.9x10^14 combinations) is the access boundary
  // here, not a session.
  const adminClient = getAdminClient();
  const { data: ticket } = await adminClient.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticket) return null;

  const [{ data: template }, { data: anchors }] = await Promise.all([
    adminClient.from("templates").select("*").eq("id", ticket.template_id).maybeSingle(),
    adminClient.from("template_anchors").select("*").eq("template_id", ticket.template_id).eq("visible", true),
  ]);
  if (!template) return null;

  const backgroundBuffer = await getTemplateBackground(adminClient, template.image_path);
  if (!backgroundBuffer) return null;

  const participantData = ticket.participant_data as Record<string, string>;

  const composites: Array<{ input: Buffer; left?: number; top?: number }> = [];
  const textAnchors: TemplateAnchor[] = [];

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
    textAnchors.push(anchor);
  }

  if (textAnchors.length > 0) {
    ensureFontRegistered();
    const canvas = createCanvas(template.image_width, template.image_height);
    const ctx = canvas.getContext("2d");

    for (const anchor of textAnchors) {
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

      ctx.font = `${anchor.font_size}px "${TICKET_FONT_FAMILY}"`;
      ctx.fillStyle = anchor.color;
      ctx.textAlign = canvasAlign(anchor.align);
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text, anchorX, anchor.y + anchor.font_size);
    }

    composites.push({ input: canvas.toBuffer("image/png") });
  }

  const output = await sharp(backgroundBuffer)
    .resize(template.image_width, template.image_height)
    .composite(composites)
    .png()
    .toBuffer();

  return output;
}
