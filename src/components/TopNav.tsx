"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Search, MessageCircle, LogOut } from "lucide-react";

export function TopNav() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold text-primary">BCH Local</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/browse" className="hover:text-primary transition">
            Browse
          </Link>
          <Link href="/categories" className="hover:text-primary transition">
            Categories
          </Link>
          <Link href="/sell" className="hover:text-primary transition">
            Sell
          </Link>
          <Link href="/messages" className="hover:text-primary transition">
            Messages
          </Link>
          {session && (
            <Link href="/profile" className="hover:text-primary transition">
              My Profile
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/browse"
            className="md:hidden p-2 rounded-full hover:bg-muted"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Link>
          {session ? (
            <>
              <Link
                href="/messages"
                className="hidden sm:flex p-2 rounded-full hover:bg-muted"
                aria-label="Messages"
              >
                <MessageCircle className="w-5 h-5" />
              </Link>
              <Link
                href="/profile"
                className="text-sm font-medium px-3 py-1.5 rounded-full bg-muted text-slate-800 hover:bg-slate-200 transition"
              >
                @{session.user?.username || "me"}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-full hover:bg-muted text-slate-500"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary text-white hover:bg-green-700 transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
