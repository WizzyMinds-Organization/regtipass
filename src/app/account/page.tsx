import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LogoMark } from "@/components/logo";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const backHref = user.isSuperAdmin ? "/admin" : "/dashboard";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
        <LogoMark className="h-10 w-10" />
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Change password</h1>
        <p className="mt-1 text-sm text-zinc-500">{user.email}</p>

        <div className="mt-6">
          <ChangePasswordForm email={user.email ?? ""} />
        </div>
      </div>
    </div>
  );
}
