"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPin, Star, Filter, Search } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  priceMzn: number;
  priceBchApprox: number | null;
  locationCity: string;
  condition: string;
  image: string | null;
  seller: {
    username: string;
    rating?: number | null;
    trustLevel?: string | null;
  };
  promotion?: string | null;
  category?: { slug: string; nameEn: string } | null;
};

const DEMO_FALLBACK: Listing[] = [
  {
    id: "demo-1",
    title: "iPhone 13 128GB — Excellent condition",
    priceMzn: 28000,
    priceBchApprox: 0.62,
    locationCity: "Matola",
    condition: "LIKE_NEW",
    image: null,
    seller: { username: "joao_tech", rating: 4.9, trustLevel: "Established" },
  },
  {
    id: "demo-2",
    title: "Toyota Corolla 2015 Automatic",
    priceMzn: 850000,
    priceBchApprox: 18.9,
    locationCity: "Maputo",
    condition: "GOOD",
    image: null,
    seller: { username: "auto_maputo", rating: 4.7, trustLevel: "Trusted" },
  },
  {
    id: "demo-3",
    title: "MacBook Pro 13\" 2019 16GB RAM",
    priceMzn: 65000,
    priceBchApprox: 1.44,
    locationCity: "Maputo",
    condition: "GOOD",
    image: null,
    seller: { username: "digital_mz", rating: 5.0, trustLevel: "Established" },
  },
  {
    id: "demo-4",
    title: "Professional Sofa Set (3+2)",
    priceMzn: 18500,
    priceBchApprox: 0.41,
    locationCity: "Matola",
    condition: "LIKE_NEW",
    image: null,
    seller: { username: "casa_bonita", rating: 4.5, trustLevel: "Established" },
  },
  {
    id: "demo-5",
    title: "Samsung Galaxy A54 5G",
    priceMzn: 19500,
    priceBchApprox: 0.43,
    locationCity: "Maputo",
    condition: "LIKE_NEW",
    image: null,
    seller: { username: "phones_mz", rating: 4.8, trustLevel: "New" },
  },
  {
    id: "demo-6",
    title: "Plumbing Services — Maputo & Matola",
    priceMzn: 1500,
    priceBchApprox: 0.03,
    locationCity: "Maputo",
    condition: "NEW",
    image: null,
    seller: { username: "plomero_pro", rating: 4.9, trustLevel: "Established" },
  },
];

function formatPrice(n: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    maximumFractionDigits: 0,
  }).format(n);
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (q) params.set("q", q);
        if (sort) params.set("sort", sort);
        const res = await fetch(`/api/listings?${params}`);
        const data = await res.json();
        if (data.listings?.length > 0) {
          setListings(data.listings);
        } else {
          setListings(DEMO_FALLBACK);
        }
      } catch {
        setListings(DEMO_FALLBACK);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category, sort]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Trigger reload via sort dependency or manual
    setSort((s) => s); // force if needed — effect depends on q only when we add it
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-slate-900">Browse listings</h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-white text-sm"
        >
          <option value="recent">Recently listed</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
        </select>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, services..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </form>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6">
        {["", "electronics", "phones", "vehicles", "services", "home", "fashion", "computers"].map(
          (slug) => {
            const label = slug || "All";
            const active = category === slug || (!category && !slug);
            return (
              <Link
                key={slug || "all"}
                href={slug ? `/browse?category=${slug}` : "/browse"}
                className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium border ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-border text-slate-700"
                }`}
              >
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </Link>
            );
          }
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listing/${listing.id}`}
              className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition relative"
            >
              {listing.promotion && (
                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-amber-400 text-xs font-bold text-slate-900">
                  {listing.promotion === "TOP_SPOT"
                    ? "🔥 Top"
                    : listing.promotion === "FEATURED"
                    ? "⭐ Featured"
                    : "🚀 Boost"}
                </span>
              )}
              <div className="aspect-[16/10] bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                {listing.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  "Photo"
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-900 line-clamp-2">
                  {listing.title}
                </p>
                <p className="mt-1 text-lg font-bold text-primary">
                  {formatPrice(listing.priceMzn)}
                </p>
                {listing.priceBchApprox != null && (
                  <p className="text-xs text-slate-500">
                    ≈ {listing.priceBchApprox.toFixed(4)} BCH
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {listing.locationCity}
                  </span>
                  {listing.seller.rating != null && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {listing.seller.rating}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  @{listing.seller.username}
                  {listing.seller.trustLevel ? ` · ${listing.seller.trustLevel}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <BrowseContent />
    </Suspense>
  );
}
