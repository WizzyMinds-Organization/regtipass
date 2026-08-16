import { NextRequest, NextResponse } from "next/server";
import { renderTicketPng } from "@/lib/render-ticket";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const png = await renderTicketPng(ticketId);
  if (!png) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const download = request.nextUrl.searchParams.get("download") === "1";

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="ticket-${ticketId}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
