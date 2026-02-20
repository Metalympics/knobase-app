import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-100 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <span className="text-xs text-neutral-400">
          &copy; {new Date().getFullYear()} Metalympics Limited
        </span>
        <nav className="flex items-center gap-5">
          <Link
            href="/tos"
            className="text-xs text-neutral-400 transition-colors hover:text-neutral-600"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="text-xs text-neutral-400 transition-colors hover:text-neutral-600"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
