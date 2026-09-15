"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MapPin } from "lucide-react";

type Fav = {
  id: string;
  listingId: string;
  title: string;
  priceMzn: number;
  locationCity: string;
  seller: string;
};

export default function FavoritesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Fav[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => {
        setFavorites(d.favorites || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900">Favorites</h1>
      <p className="text-sm text-slate-500 mt-1">Listings you saved</p>

      {favorites.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">No favorites yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Tap the heart on any listing to save it here.
          </p>
          <Link
            href="/browse"
            className="inline-flex mt-6 h-11 px-5 items-center rounded-xl bg-primary text-white font-semibold"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {favorites.map((f) => (
            <Link
              key={f.id}
              href={`/listing/${f.listingId}`}
              className="block p-4 rounded-2xl border border-border bg-white hover:border-primary/30"
            >
              <p className="font-medium text-slate-900 line-clamp-1">{f.title}</p>
              <p className="text-primary font-semibold mt-1">
                {new Intl.NumberFormat("pt-MZ", {
                  style: "currency",
                  currency: "MZN",
                  maximumFractionDigits: 0,
                }).format(f.priceMzn)}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {f.locationCity} · @{f.seller}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
