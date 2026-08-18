export function PageHeader({
  title,
  subtitle,
  action,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "mb-3" : "mb-6"} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
    </div>
  );
}
