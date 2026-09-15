"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Star,
  MessageCircle,
  Share2,
  Heart,
  ShieldAlert,
  ChevronLeft,
} from "lucide-react";

type ListingDetail = {
  id: string;
  title: string;
  description: string;
  priceMzn: number;
  priceBchApprox: number | null;
  condition: string;
  locationCity: string;
  locationArea?: string | null;
  deliveryOption: string;
  acceptsBch: boolean;
  publishedAt?: string;
  images: { url: string }[];
  category?: { nameEn: string } | null;
  seller: {
    username: string;
    displayName?: string | null;
    rating?: number | null;
    completedTx?: number | null;
    trustLevel?: string | null;
  };
  promotion?: { type: string } | null;
};

const DEMO: ListingDetail = {
  id: "demo",
  title: "iPhone 13 128GB — Excellent condition",
  description:
    "iPhone 13 in excellent condition. Battery health 89%. Comes with original box and cable. No scratches on screen. Unlocked for all networks. Pickup in Matola or delivery possible in Maputo area.",
  priceMzn: 28000,
  priceBchApprox: 0.62,
  condition: "LIKE_NEW",
  locationCity: "Matola",
  locationArea: "Machava",
  deliveryOption: "BOTH",
  acceptsBch: true,
  images: [],
  category: { nameEn: "Phones" },
  seller: {
    username: "joao_tech",
    rating: 4.9,
    completedTx: 23,
    trustLevel: "Established",
  },
};

function formatPrice(n: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ListingPage() {
  const params = useParams();
  const id = params.id as string;
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/listings/${id}`);
        if (res.ok) {
          const data = await res.json();
          setListing(data);
        } else {
          setListing({ ...DEMO, id });
        }
      } catch {
        setListing({ ...DEMO, id });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  if (!listing) {
    return (
      <div className="p-8 text-center">
        <p>Listing not found</p>
        <Link href="/browse" className="text-primary underline mt-2 inline-block">
          Browse
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="px-4 py-3">
        <Link
          href="/browse"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-primary"
        >
          <ChevronLeft className="w-4 h-4" /> Back to results
        </Link>
      </div>

      <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center text-slate-400">
        {listing.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.images[0].url} alt="" className="w-full h-full object-cover" />
        ) : (
          "Listing images"
        )}
      </div>

      <div className="px-4 py-6 space-y-6">
        <div>
          {listing.promotion && (
            <span className="inline-block mb-2 px-2 py-0.5 rounded-full bg-amber-400 text-xs font-bold">
              {listing.promotion.type}
            </span>
          )}
          <h1 className="text-2xl font-bold text-slate-900">{listing.title}</h1>
          <p className="mt-2 text-3xl font-bold text-primary">
            {formatPrice(listing.priceMzn)}
          </p>
          {listing.priceBchApprox != null && (
            <p className="text-sm text-slate-500">
              ≈ {listing.priceBchApprox.toFixed(6)} BCH
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-muted text-slate-700">
            {listing.condition.replace("_", " ")}
          </span>
          {listing.category && (
            <span className="px-3 py-1 rounded-full bg-muted text-slate-700">
              {listing.category.nameEn}
            </span>
          )}
          {listing.acceptsBch && (
            <span className="px-3 py-1 rounded-full bg-green-50 text-primary font-medium">
              Bitcoin Cash ✓
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="w-4 h-4 text-primary" />
          {listing.locationCity}
          {listing.locationArea ? ` · ${listing.locationArea}` : ""}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/orders/new?listing=${listing.id}`}
            className="flex-1 h-12 flex items-center justify-center rounded-xl bg-primary text-white font-semibold hover:bg-green-700 transition"
          >
            Buy Now
          </Link>
          <Link
            href={`/messages?listing=${listing.id}`}
            className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl border border-border bg-white font-semibold text-slate-800 hover:bg-muted transition"
          >
            <MessageCircle className="w-5 h-5" />
            Message Seller
          </Link>
        </div>

        <div className="flex gap-4">
          <button className="flex items-center gap-2 text-sm text-slate-600">
            <Heart className="w-5 h-5" /> Save
          </button>
          <button className="flex items-center gap-2 text-sm text-slate-600">
            <Share2 className="w-5 h-5" /> Share
          </button>
        </div>

        <div>
          <h2 className="font-semibold text-slate-900 mb-2">Description</h2>
          <p className="text-slate-700 whitespace-pre-line leading-relaxed">
            {listing.description}
          </p>
        </div>

        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                @{listing.seller.username}
              </p>
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                {listing.seller.rating != null && (
                  <>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{listing.seller.rating}</span>
                  </>
                )}
                {listing.seller.completedTx != null && (
                  <span>· {listing.seller.completedTx} transactions</span>
                )}
                {listing.seller.trustLevel && (
                  <span className="px-2 py-0.5 rounded-full bg-green-50 text-primary text-xs font-medium">
                    {listing.seller.trustLevel}
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/u/${listing.seller.username}`}
              className="text-sm font-medium text-primary"
            >
              View profile
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">Stay safe</p>
            <p className="mt-1">
              Never send BCH outside the official order/payment flow. If someone
              asks you to pay differently, report them.
            </p>
            <button className="mt-2 text-amber-700 font-medium underline">
              Report listing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
