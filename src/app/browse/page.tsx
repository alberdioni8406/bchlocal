"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

function BrowseContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";
  const initialQ = searchParams.get("q") || "";
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState("recent");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (q) params.set("q", q);
        if (sort) params.set("sort", sort);
        params.set("limit", "24");
        const res = await fetch(`/api/listings?${params}`);
        const data = await res.json();
        setListings(data.listings || []);
        setTotal(data.total ?? data.listings?.length ?? 0);
      } catch {
        setListings([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category, sort, q]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // q is already in state; effect will re-run if we force a tiny change or just rely on user typing + enter
    // Trigger by setting q again (same value still works if we include a nonce, but simpler: keep as-is)
  }

  const categoryChips = [
    { slug: "", label: "All" },
    { slug: "electronics", label: "Electronics" },
    { slug: "phones", label: "Phones" },
    { slug: "computers", label: "Computers" },
    { slug: "vehicles", label: "Vehicles" },
    { slug: "home", label: "Home" },
    { slug: "fashion", label: "Fashion" },
    { slug: "services", label: "Services" },
    { slug: "digital-goods", label: "Digital" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Browse listings</h1>
          {!loading && (
            <p className="text-sm text-slate-500 mt-0.5">
              {total} result{total !== 1 ? "s" : ""}
              {category ? ` in ${category}` : ""}
            </p>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="recent">Recently listed</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
        </select>
      </div>

      <form onSubmit={handleSearch} className="mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, services..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>
      </form>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6 pb-1">
        {categoryChips.map(({ slug, label }) => {
          const active = category === slug || (!category && !slug);
          return (
            <Link
              key={slug || "all"}
              href={slug ? `/browse?category=${slug}` : "/browse"}
              className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition ${
                active
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white border-border text-slate-700 hover:border-primary/40"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-slate-100 animate-pulse aspect-[3/4]"
            />
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-slate-50/80 py-16 text-center">
          <p className="text-slate-500 font-medium">No listings found</p>
          <p className="text-sm text-slate-400 mt-1">
            Try another category or search term. If this is a fresh deploy,
            run the database seed.
          </p>
          <Link
            href="/sell"
            className="inline-flex mt-4 h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-green-700 transition"
          >
            Sell something
          </Link>
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500">Loading listings…</div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
