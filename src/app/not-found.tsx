import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center">
      <LogoMark className="h-12 w-12" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Page not found</h1>
        <p className="mt-1 text-sm text-zinc-500">
          This page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
      </div>
      <Link
        href="/"
        className="mt-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
      >
        Back to safety
      </Link>
    </div>
  );
}
