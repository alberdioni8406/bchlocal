"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Laptop,
  Car,
  Shirt,
  Home,
  Utensils,
  Briefcase,
  Wrench,
  HardDrive,
  MoreHorizontal,
  MapPin,
  Search,
  ArrowRight,
  Rocket,
  Building2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

const categories = [
  { name: "Electronics", icon: Laptop, slug: "electronics" },
  { name: "Phones", icon: Smartphone, slug: "phones" },
  { name: "Computers", icon: Laptop, slug: "computers" },
  { name: "Vehicles", icon: Car, slug: "vehicles" },
  { name: "Fashion", icon: Shirt, slug: "fashion" },
  { name: "Home", icon: Home, slug: "home" },
  { name: "Food", icon: Utensils, slug: "food" },
  { name: "Services", icon: Wrench, slug: "services" },
  { name: "Jobs", icon: Briefcase, slug: "jobs" },
  { name: "Digital Goods", icon: HardDrive, slug: "digital-goods" },
  { name: "Other", icon: MoreHorizontal, slug: "other" },
];

export default function HomePage() {
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/listings?limit=8&sort=recent");
        const data = await res.json();
        if (data.listings?.length) {
          setListings(data.listings);
        }
      } catch {
        // keep empty — UI shows empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-green-50 via-green-50/80 to-white border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-100/40 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-12 md:pt-16 md:pb-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-primary text-xs font-semibold mb-4">
              <Zap className="w-3.5 h-3.5" />
              Pay directly with Bitcoin Cash
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15]">
              Buy. Sell. Get paid.{" "}
              <span className="text-primary">In Bitcoin Cash.</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              Find products, services and opportunities near you. Pay
              peer-to-peer with BCH — no platform wallet, no custody.
            </p>

            {/* Search */}
            <form
              action="/browse"
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  name="q"
                  type="search"
                  placeholder="What are you looking for?"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-base"
                />
              </div>
              <div className="flex items-center gap-2 h-12 px-4 rounded-xl border border-border bg-white shadow-sm text-slate-700">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">
                  Maputo / Matola
                </span>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary text-white font-semibold shadow-sm hover:bg-green-700 transition"
              >
                Browse Listings
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-border bg-white font-semibold text-slate-800 hover:bg-muted transition"
              >
                Sell Something
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Popular categories
        </h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-1 px-1">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/browse?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 min-w-[80px] p-3.5 rounded-2xl bg-white border border-border hover:border-primary/40 hover:shadow-md transition group"
            >
              <div className="w-11 h-11 rounded-full bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition">
                <cat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-slate-700 text-center leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent listings */}
      <section className="max-w-6xl mx-auto px-4 py-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent listings
          </h2>
          <Link
            href="/browse"
            className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
          >
            See all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-slate-100 animate-pulse aspect-[3/4]"
              />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-slate-50/80 py-16 text-center">
            <p className="text-slate-500 font-medium">No listings yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Seed the database or be the first to sell something.
            </p>
            <Link
              href="/sell"
              className="inline-flex mt-4 h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-green-700 transition"
            >
              Create a listing
            </Link>
          </div>
        )}
      </section>

      {/* Value props */}
      <section className="bg-slate-50 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Pay with BCH</h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Direct peer-to-peer payments. No platform wallet, no seed
                phrases stored here.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Trust & safety</h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Reputation badges, reports, and clear anti-scam guidance on
                every transaction.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Grow your reach</h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Boost listings or upgrade to a business profile for more
                visibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTAs */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-2 gap-5">
          <Link
            href="/sell"
            className="group relative overflow-hidden rounded-2xl bg-primary text-white p-7 md:p-8 hover:bg-green-700 transition shadow-sm"
          >
            <div className="relative z-10">
              <Rocket className="w-8 h-8 mb-3 opacity-90" />
              <h3 className="text-xl font-bold">Start selling</h3>
              <p className="mt-2 text-green-100 text-sm leading-relaxed max-w-sm">
                List products or services in minutes. Get paid in Bitcoin Cash
                when a buyer is ready.
              </p>
              <span className="inline-flex items-center gap-1 mt-4 text-sm font-semibold">
                Create listing <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </span>
            </div>
          </Link>
          <Link
            href="/business"
            className="group relative overflow-hidden rounded-2xl bg-slate-900 text-white p-7 md:p-8 hover:bg-slate-800 transition shadow-sm"
          >
            <div className="relative z-10">
              <Building2 className="w-8 h-8 mb-3 opacity-90" />
              <h3 className="text-xl font-bold">Business accounts</h3>
              <p className="mt-2 text-slate-300 text-sm leading-relaxed max-w-sm">
                Verified badge, more visibility, and tools built for shops and
                service providers.
              </p>
              <span className="inline-flex items-center gap-1 mt-4 text-sm font-semibold">
                Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer strip */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p className="font-medium text-slate-700">BCH Local</p>
          <div className="flex flex-wrap justify-center gap-5">
            <Link href="/how-it-works" className="hover:text-primary transition">
              How it works
            </Link>
            <Link href="/safety" className="hover:text-primary transition">
              Safety
            </Link>
            <Link href="/terms" className="hover:text-primary transition">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-primary transition">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-primary transition">
              Contact
            </Link>
          </div>
          <p className="text-xs text-slate-400">Built for Bitcoin Cash</p>
        </div>
      </footer>
    </div>
  );
}
