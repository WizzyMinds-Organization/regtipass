import type { ComponentType } from "react";

const COLOR_MAP = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  zinc: "bg-zinc-100 text-zinc-600",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color = "zinc",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  color?: keyof typeof COLOR_MAP;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${COLOR_MAP[color]}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>
      <p className="mt-3 truncate text-xs font-medium text-zinc-500 sm:mt-4 sm:text-sm">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
