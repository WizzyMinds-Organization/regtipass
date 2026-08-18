"use client";

import { useEffect } from "react";
import { setLastEvent } from "@/lib/last-event";

export function TrackLastEvent({ eventId }: { eventId: string }) {
  useEffect(() => {
    setLastEvent(eventId).catch(() => {});
  }, [eventId]);

  return null;
}
