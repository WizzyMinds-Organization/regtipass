"use client";

import { useEffect } from "react";
import { useShell, type EventNavConfig } from "./shell-context";

export function EventNavSetter(config: EventNavConfig) {
  const { setEventNav } = useShell();

  useEffect(() => {
    setEventNav(config);
    return () => setEventNav(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.eventId,
    config.eventName,
    config.eventStatus,
    config.isOwner,
    config.canManageForm,
    config.canCheckin,
    config.canManageParticipants,
    config.checkinOnly,
  ]);

  return null;
}
