"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Rocket } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  priceMzn: number;
  status: string;
  views: number;
  locationCity: string;
  promotion?: { type: string } | null;
};

export default function MyListingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/me/listings")
      .then((r) => r.json())
      .then((data) => {
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">My Listings</h1>
        <Link
          href="/sell"
          className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold flex items-center"
        >
          + New
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No listings yet</p>
          <p className="text-sm text-slate-500 mt-1">Post something and start selling</p>
          <Link
            href="/sell"
            className="inline-flex mt-6 h-11 px-5 items-center rounded-xl bg-primary text-white font-semibold"
          >
            Sell Something
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="p-4 rounded-2xl border border-border bg-white">
              <div className="flex justify-between gap-2">
                <Link
                  href={`/listing/${l.id}`}
                  className="font-medium text-slate-900 line-clamp-1 hover:text-primary"
                >
                  {l.title}
                </Link>
                <span className="text-sm font-semibold text-primary shrink-0">
                  {new Intl.NumberFormat("pt-MZ", {
                    style: "currency",
                    currency: "MZN",
                    maximumFractionDigits: 0,
                  }).format(l.priceMzn)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {l.locationCity} · {l.views} views · {l.status}
                {l.promotion ? ` · ${l.promotion.type}` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/listing/${l.id}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border"
                >
                  View
                </Link>
                <Link
                  href={`/sell?promote=${l.id}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-900 text-white flex items-center gap-1"
                >
                  <Rocket className="w-3 h-3" /> Promote
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 rounded-2xl bg-slate-900 text-white">
        <p className="font-semibold">Want more buyers?</p>
        <p className="text-sm text-slate-300 mt-1">
          Promote listings with Boost, Featured or Top Spot.
        </p>
      </div>
    </div>
  );
}
