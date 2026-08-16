/**
 * regtipass mark: a ticket stub with a validated check — registration
 * (ticket) + pass (checked in). Kept as a single inline SVG so it stays
 * crisp at any size and can be reused for the favicon/PWA icons via
 * scripts/generate-icons.mjs.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="32" height="32" rx="8" fill="#059669" />
      <rect x="4" y="9" width="24" height="14" rx="2" fill="#ffffff" />
      <circle cx="4" cy="16" r="2.6" fill="#059669" />
      <circle cx="28" cy="16" r="2.6" fill="#059669" />
      <line
        x1="19"
        y1="10.5"
        x2="19"
        y2="21.5"
        stroke="#059669"
        strokeWidth="1.4"
        strokeDasharray="2 2.2"
        strokeLinecap="round"
      />
      <path
        d="M21.3 16.4l1.8 1.8l3.6-4"
        stroke="#059669"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, wordmarkClassName }: { className?: string; wordmarkClassName?: string }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className={className ?? "h-8 w-8"} />
      <span className={wordmarkClassName ?? "text-[15px] font-semibold tracking-tight text-zinc-900"}>
        regtipass
      </span>
    </span>
  );
}
