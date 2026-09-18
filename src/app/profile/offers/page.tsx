"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Tag } from "lucide-react";

type OfferRow = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPriceMzn: number;
  amountMzn: number;
  message?: string | null;
  status: string;
  buyerId: string;
  sellerId: string;
  buyerUsername: string;
  sellerUsername: string;
  isMine: boolean;
  orderId?: string | null;
  parentOfferId?: string | null;
  createdAt: string;
};

export default function OffersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [counterAmounts, setCounterAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  function load() {
    fetch("/api/offers")
      .then((r) => r.json())
      .then((d) => {
        setOffers(d.offers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/profile/offers");
      return;
    }
    if (status === "authenticated") load();
  }, [status, router]);

  async function act(
    offerId: string,
    action: "accept" | "reject" | "counter" | "withdraw",
    amountMzn?: number
  ) {
    setBusyId(offerId);
    setError("");
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          action,
          ...(amountMzn != null ? { amountMzn } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      if (action === "accept") {
        // Buyer is notified with link to pay; if current user is buyer of a counter they accepted via seller flow N/A
      }
      load();
    } catch {
      setError("Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const received = offers.filter((o) => !o.isMine);
  const sent = offers.filter((o) => o.isMine);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="p-2 -ml-2 rounded-xl hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Offers</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Received
        </h2>
        {received.length === 0 ? (
          <p className="text-sm text-slate-500">No offers on your listings yet</p>
        ) : (
          <div className="space-y-3">
            {received.map((o) => (
              <div key={o.id} className="p-4 rounded-2xl border border-border bg-white space-y-2">
                <div className="flex justify-between gap-2">
                  <Link
                    href={`/listing/${o.listingId}`}
                    className="font-medium text-slate-900 line-clamp-1 hover:text-primary"
                  >
                    {o.listingTitle}
                  </Link>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                    {o.status}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="font-bold text-primary">
                    {new Intl.NumberFormat("pt-MZ", {
                      style: "currency",
                      currency: "MZN",
                      maximumFractionDigits: 0,
                    }).format(o.amountMzn)}
                  </span>
                  <span className="text-slate-500">
                    {" "}
                    (list{" "}
                    {new Intl.NumberFormat("pt-MZ", {
                      style: "currency",
                      currency: "MZN",
                      maximumFractionDigits: 0,
                    }).format(o.listingPriceMzn)}
                    )
                  </span>
                </p>
                <p className="text-xs text-slate-500">From @{o.buyerUsername}</p>
                {o.message && <p className="text-sm text-slate-600">{o.message}</p>}
                {(o.status === "PENDING" || o.status === "COUNTERED") && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => act(o.id, "accept")}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => act(o.id, "reject")}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        placeholder="Counter"
                        value={counterAmounts[o.id] || ""}
                        onChange={(e) =>
                          setCounterAmounts((prev) => ({ ...prev, [o.id]: e.target.value }))
                        }
                        className="w-24 h-8 px-2 rounded-lg border border-border text-xs"
                      />
                      <button
                        type="button"
                        disabled={busyId === o.id || !counterAmounts[o.id]}
                        onClick={() =>
                          act(o.id, "counter", parseFloat(counterAmounts[o.id]))
                        }
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
                      >
                        Counter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Sent
        </h2>
        {sent.length === 0 ? (
          <p className="text-sm text-slate-500">You have not made any offers</p>
        ) : (
          <div className="space-y-3">
            {sent.map((o) => (
              <div key={o.id} className="p-4 rounded-2xl border border-border bg-white space-y-2">
                <div className="flex justify-between gap-2">
                  <Link
                    href={`/listing/${o.listingId}`}
                    className="font-medium text-slate-900 line-clamp-1 hover:text-primary"
                  >
                    {o.listingTitle}
                  </Link>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                    {o.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-primary">
                  {new Intl.NumberFormat("pt-MZ", {
                    style: "currency",
                    currency: "MZN",
                    maximumFractionDigits: 0,
                  }).format(o.amountMzn)}
                </p>
                {o.status === "ACCEPTED" && (
                  <Link
                    href={`/orders/new?listing=${o.listingId}&offerId=${o.id}`}
                    className="inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white"
                  >
                    Pay now
                  </Link>
                )}
                {o.status === "PENDING" && o.parentOfferId && (
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => act(o.id, "accept")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50"
                  >
                    Accept counter
                  </button>
                )}
                {o.status === "PENDING" && !o.parentOfferId && (
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => act(o.id, "withdraw")}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {!session && (
        <p className="text-sm text-slate-400 mt-6 flex items-center gap-1">
          <Tag className="w-4 h-4" /> Sign in to manage offers
        </p>
      )}
    </div>
  );
}
