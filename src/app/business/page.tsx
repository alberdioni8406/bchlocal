"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2 } from "lucide-react";

export default function BusinessPage() {
  const { status } = useSession();
  const router = useRouter();
  const [priceMzn, setPriceMzn] = useState(500);
  const [priceBch, setPriceBch] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/revenue/business")
      .then((r) => r.json())
      .then((d) => {
        if (d.priceMzn) setPriceMzn(d.priceMzn);
        if (d.priceBch != null) setPriceBch(d.priceBch);
        setActive(Boolean(d.active));
        if (Array.isArray(d.entitlements)) setEntitlements(d.entitlements);
        if (d.subscription?.endsAt) setEndsAt(d.subscription.endsAt);
      })
      .catch(() => {});
  }, [status]);

  async function upgrade() {
    setError("");
    setMessage("");
    if (status !== "authenticated") {
      router.push("/auth/signin?callbackUrl=/business");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/revenue/business", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to upgrade");
        return;
      }
      if (data.isDemo || data.status === "ACTIVE") {
        setActive(true);
        setMessage(data.message || "Business plan activated (demo)");
        return;
      }
      const params = new URLSearchParams({
        type: "BUSINESS",
        priceMzn: String(data.priceMzn),
        priceBch: String(data.priceBch || ""),
        address: data.bchAddress || "",
        uri: data.paymentUri || "",
      });
      router.push(`/promotions/pay?${params.toString()}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-24">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">BCH Local Business</h1>
        <p className="mt-2 text-slate-600">
          Reach more local buyers, showcase your products and accept BCH.
        </p>
      </div>

      {active && (
        <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 text-sm text-green-900 space-y-2">
          <p className="font-semibold">Your business subscription is active.</p>
          {endsAt && (
            <p className="text-green-800">
              Renews / expires {new Date(endsAt).toLocaleDateString("pt-MZ")}
            </p>
          )}
          <p>Unlocked on your profile:</p>
          <ul className="space-y-1">
            {(entitlements.length
              ? entitlements
              : [
                  "Verified Business badge on profile and listings",
                  "Higher placement among organic listings",
                  "Shop-style public profile",
                ]
            ).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 text-green-800 text-sm">{message}</div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="rounded-2xl border-2 border-primary bg-green-50/50 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-900">Business</h2>
          <div>
            <span className="text-2xl font-bold text-primary">{priceMzn}</span>
            <span className="text-slate-600"> MZN/month</span>
          </div>
        </div>
        {priceBch != null && priceBch > 0 && (
          <p className="text-sm text-primary mt-1">≈ {priceBch.toFixed(6)} BCH</p>
        )}

        <ul className="mt-6 space-y-3">
          {[
            "Business profile page",
            "Verified business badge eligibility",
            "Featured business placement",
            "Basic analytics",
            "Contact information on profile",
            "BCH payment tools",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-slate-800">
              <Check className="w-5 h-5 text-primary shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={busy || active}
          onClick={upgrade}
          className="mt-8 flex w-full h-12 items-center justify-center gap-2 rounded-xl bg-primary text-white font-semibold hover:bg-green-700 transition disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : active ? (
            "Already active"
          ) : status === "authenticated" ? (
            `Upgrade — ${priceMzn} MZN/month`
          ) : (
            "Sign in to upgrade"
          )}
        </button>
      </div>

      <div className="mt-8 p-4 rounded-2xl border border-border bg-white">
        <p className="text-sm font-medium text-slate-700">Free plan</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-500">
          <li>• Basic profile</li>
          <li>• Listings with BCH payments</li>
          <li>• Messaging and offers</li>
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Pricing is configurable by admin. Marketplace trade payments stay peer-to-peer —
        BCH Local never holds user trade funds. Platform fees use a separate address.
      </p>

      <div className="mt-4 text-center">
        <Link href="/profile" className="text-sm text-primary font-medium">
          Back to profile
        </Link>
      </div>
    </div>
  );
}
