import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, LogOut, Search, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { LogoMark } from "@/components/logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isSuperAdmin) redirect("/dashboard");

  const initials = (user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white px-3 py-4">
        <Link href="/admin" className="flex items-center gap-2 px-1">
          <LogoMark className="h-8 w-8" />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">regtipass</span>
        </Link>

        <nav className="mt-6 flex flex-1 flex-col">
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Platform
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
          >
            <Building2 className="h-4 w-4 text-emerald-600" />
            Accounts
          </Link>
        </nav>

        <div className="mb-2 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
          <ShieldCheck className="h-4 w-4 text-zinc-400" />
          Super admin
        </div>

        <form action={signOut}>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
            <LogOut className="h-4 w-4 text-zinc-400" />
            Sign out
          </button>
        </form>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-400 w-72">
            <Search className="h-4 w-4" />
            <span>Search…</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="max-w-[200px] truncate text-sm font-medium text-zinc-700">
              {user.email}
            </span>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
