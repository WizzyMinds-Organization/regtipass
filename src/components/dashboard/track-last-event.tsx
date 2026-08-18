"use client";

import { useEffect } from "react";

export function TrackLastEvent({ eventId }: { eventId: string }) {
  useEffect(() => {
    document.cookie = `last_event_id=${eventId}; path=/; max-age=${60 * 60 * 24 * 90}`;
  }, [eventId]);

  return null;
}
