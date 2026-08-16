import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TICKET_ID_PATTERN } from "@/lib/slug";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ticketId = String(body?.ticketId ?? "").trim();

  if (!ticketId || !TICKET_ID_PATTERN.test(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket ID format." }, { status: 400 });
  }

  const supabase = await createClient();
  const deviceInfo = request.headers.get("user-agent")?.slice(0, 200) ?? null;

  const { data, error } = await supabase
    .rpc("check_in_ticket", { p_ticket_id: ticketId, p_device_info: deviceInfo })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
