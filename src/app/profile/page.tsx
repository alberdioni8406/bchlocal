"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Package,
  Heart,
  MessageCircle,
  Settings,
  Building2,
  Star,
  ChevronRight,
  Rocket,
  Bell,
  Tag,
} from "lucide-react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [me, setMe] = useState<{
    role?: string;
    profile?: {
      trustLevel?: string | null;
      isBusiness?: boolean;
      verifiedBusiness?: boolean;
      completedTx?: number;
    } | null;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/me/profile")
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => {});
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  const menu = [
    { href: "/profile/listings", label: "My Listings", icon: Package, desc: "Manage & promote" },
    { href: "/profile/offers", label: "Offers", icon: Tag, desc: "Negotiate prices" },
    { href: "/favorites", label: "Favorites", icon: Heart, desc: "Saved listings" },
    { href: "/messages", label: "Messages", icon: MessageCircle, desc: "Buyer & seller chats" },
    { href: "/notifications", label: "Notifications", icon: Bell, desc: "Offers, payments, messages" },
    { href: "/business", label: "Business Profile", icon: Building2, desc: "Upgrade for more reach" },
    { href: "/profile/settings", label: "Settings", icon: Settings, desc: "Account & preferences" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-primary">
          {(session.user?.name || session.user?.username || "U")[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {session.user?.name || session.user?.username}
          </h1>
          <p className="text-sm text-slate-500">@{session.user?.username}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 flex-wrap">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{me?.profile?.trustLevel || "New"}</span>
            {me?.profile?.verifiedBusiness && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                Verified Business
              </span>
            )}
          </div>
        </div>
      </div>

      {me?.profile?.verifiedBusiness && (
        <div className="mb-6 p-4 rounded-2xl border border-blue-100 bg-blue-50/60">
          <p className="font-semibold text-slate-900">Business entitlements active</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>• Verified Business badge on your profile and listings</li>
            <li>• Higher placement among organic listings</li>
            <li>• Shop-style public profile for buyers</li>
          </ul>
        </div>
      )}

      {/* Promote CTA */}
      <Link
        href="/profile/listings"
        className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 text-white mb-6"
      >
        <Rocket className="w-6 h-6 text-amber-400" />
        <div className="flex-1">
          <p className="font-semibold">Want more buyers?</p>
          <p className="text-sm text-slate-300">Promote your listings</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </Link>

      <div className="space-y-2">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-border hover:border-primary/30 transition"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <item.icon className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
        ))}
      </div>

      {session.user?.role === "ADMIN" && (
        <Link
          href="/admin"
          className="mt-6 flex items-center justify-center h-12 rounded-xl border-2 border-primary text-primary font-semibold"
        >
          Admin Dashboard
        </Link>
      )}
    </div>
  );
}
