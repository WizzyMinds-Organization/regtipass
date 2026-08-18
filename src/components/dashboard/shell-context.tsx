"use client";

import { createContext, useContext, useMemo, useState } from "react";

export interface EventNavConfig {
  eventId: string;
  eventName: string;
  eventStatus: "active" | "closed";
  isOwner: boolean;
  canManageForm: boolean;
  canCheckin: boolean;
  canManageParticipants: boolean;
  checkinOnly: boolean;
}

interface ShellState {
  eventNav: EventNavConfig | null;
  setEventNav: (config: EventNavConfig | null) => void;
}

const ShellContext = createContext<ShellState | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [eventNav, setEventNav] = useState<EventNavConfig | null>(null);
  const value = useMemo(() => ({ eventNav, setEventNav }), [eventNav]);
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within ShellProvider");
  return ctx;
}
