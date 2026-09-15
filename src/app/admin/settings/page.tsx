"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save } from "lucide-react";

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prices, setPrices] = useState({
    price_boost: "100",
    price_featured: "250",
    price_top_spot: "500",
    price_business_monthly: "500",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((d) => {
          setPrices((p) => ({
            price_boost: d.price_boost || p.price_boost,
            price_featured: d.price_featured || p.price_featured,
            price_top_spot: d.price_top_spot || p.price_top_spot,
            price_business_monthly: d.price_business_monthly || p.price_business_monthly,
          }));
        })
        .catch(() => {});
    }
  }, [session]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prices),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || session?.user?.role !== "ADMIN") {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-600 mb-4">
        <ChevronLeft className="w-4 h-4" /> Admin
      </Link>

      <h1 className="text-xl font-bold text-slate-900">Prices & Settings</h1>
      <p className="text-sm text-slate-500 mt-1">
        These values are stored in the database and used across the app.
      </p>

      <div className="mt-8 space-y-4">
        {(
          [
            ["price_boost", "Boost (3 days)"],
            ["price_featured", "Featured (7 days)"],
            ["price_top_spot", "Top Spot (14 days)"],
            ["price_business_monthly", "Business subscription (monthly)"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={prices[key]}
                onChange={(e) => setPrices({ ...prices, [key]: e.target.value })}
                className="flex-1 h-12 px-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-slate-500 font-medium">MZN</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-8 w-full h-12 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Save className="w-5 h-5" />
        {saved ? "Saved!" : saving ? "Saving..." : "Save prices"}
      </button>
    </div>
  );
}
