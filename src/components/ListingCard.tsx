"use client";

import Link from "next/link";
import { MapPin, Star, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ListingCardData = {
  id: string;
  title: string;
  priceMzn: number;
  priceBchApprox?: number | null;
  locationCity: string;
  condition?: string;
  image: string | null;
  seller: {
    username: string;
    rating?: number | null;
    trustLevel?: string | null;
    isBusiness?: boolean | null;
    verifiedBusiness?: boolean | null;
  };
  promotion?: string | null;
  category?: { slug: string; nameEn: string } | null;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    maximumFractionDigits: 0,
  }).format(n);
}

const conditionLabel: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
  FOR_PARTS: "For parts",
};

export function ListingCard({
  listing,
  className,
}: {
  listing: ListingCardData;
  className?: string;
}) {
  return (
    <Link
      href={`/listing/${listing.id}`}
      className={cn(
        "group bg-white rounded-2xl border border-border overflow-hidden",
        "hover:shadow-lg hover:border-primary/20 transition-all duration-200",
        "flex flex-col h-full",
        className
      )}
    >
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {listing.promotion && (
          <span className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full bg-amber-400 text-[11px] font-bold text-slate-900 shadow-sm">
            {listing.promotion === "TOP_SPOT"
              ? "🔥 Top Spot"
              : listing.promotion === "FEATURED"
              ? "⭐ Featured"
              : "🚀 Boost"}
          </span>
        )}

        {listing.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const fallback = (e.target as HTMLImageElement)
                .nextElementSibling as HTMLElement | null;
              if (fallback) fallback.classList.remove("hidden");
            }}
          />
        ) : null}

        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400",
            listing.image ? "hidden" : ""
          )}
        >
          <ImageIcon className="w-10 h-10 opacity-50" />
          <span className="text-xs font-medium">No photo</span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>

        <div className="mt-2">
          <p className="text-lg font-bold text-primary tracking-tight">
            {formatPrice(listing.priceMzn)}
          </p>
          {listing.priceBchApprox != null && listing.priceBchApprox > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              ≈ {listing.priceBchApprox.toFixed(4)} BCH
            </p>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
            <span className="truncate">{listing.locationCity}</span>
          </span>

          {listing.seller.rating != null && listing.seller.rating > 0 && (
            <span className="flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-slate-700">
                {listing.seller.rating.toFixed(1)}
              </span>
            </span>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate flex items-center gap-1">
            @{listing.seller.username}
            {listing.seller.verifiedBusiness ? (
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                Verified
              </span>
            ) : listing.seller.isBusiness ? (
              <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-100 font-medium">
                Business
              </span>
            ) : null}
          </span>
          <span className="flex items-center gap-1 shrink-0 ml-2">
            {listing.condition && (
              <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100">
                {conditionLabel[listing.condition] || listing.condition}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-green-50 text-primary border border-green-100 font-medium">
              BCH
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
