"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Search, MessageCircle, LogOut, LayoutDashboard } from "lucide-react";

export function TopNav() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="text-xl font-bold text-primary tracking-tight group-hover:opacity-90 transition">
            BCH Local
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
          {[
            { href: "/browse", label: "Browse" },
            { href: "/categories", label: "Categories" },
            { href: "/sell", label: "Sell" },
            { href: "/messages", label: "Messages" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-lg hover:text-primary hover:bg-green-50 transition"
            >
              {item.label}
            </Link>
          ))}
          {session && (
            <Link
              href="/profile"
              className="px-3 py-1.5 rounded-lg hover:text-primary hover:bg-green-50 transition"
            >
              My Profile
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg text-primary hover:bg-green-50 transition flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/browse"
            className="md:hidden p-2 rounded-full hover:bg-muted transition"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-slate-600" />
          </Link>

          {session ? (
            <>
              <Link
                href="/messages"
                className="hidden sm:flex p-2 rounded-full hover:bg-muted transition"
                aria-label="Messages"
              >
                <MessageCircle className="w-5 h-5 text-slate-600" />
              </Link>
              <Link
                href="/profile"
                className="text-sm font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition"
              >
                @{session.user?.username || "me"}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-full hover:bg-muted text-slate-500 transition"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="text-sm font-semibold px-4 py-2 rounded-full bg-primary text-white hover:bg-green-700 transition shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
