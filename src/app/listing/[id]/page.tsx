"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  MapPin,
  Star,
  MessageCircle,
  Share2,
  Heart,
  ShieldAlert,
  ChevronLeft,
  Pencil,
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
    id?: string;
    username: string;
    displayName?: string | null;
    rating?: number | null;
    completedTx?: number | null;
    trustLevel?: string | null;
  };
  promotion?: { type: string } | null;
  status?: string;
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
  const { data: session } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMsg, setOfferMsg] = useState("");
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerNote, setOfferNote] = useState("");

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

      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {listing.images[activeImage] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.images[activeImage].url}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-sm font-medium">No photos yet</span>
          </div>
        )}
        {listing.images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
            {activeImage + 1} / {listing.images.length}
          </div>
        )}
      </div>
      {listing.images.length > 1 && (
        <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
          {listing.images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setActiveImage(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                i === activeImage ? "border-primary" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

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
          <span className="text-slate-400">·</span>
          <span>
            {listing.deliveryOption === "BOTH"
              ? "Pickup or delivery"
              : listing.deliveryOption === "DELIVERY"
                ? "Delivery"
                : "Pickup"}
          </span>
        </div>

        {session?.user?.id && session.user.id === listing.seller.id && (
          <Link
            href={`/listing/${listing.id}/edit`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <Pencil className="w-4 h-4" /> Edit listing
          </Link>
        )}

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

        {session?.user?.id && session.user.id !== listing.seller.id && (
          <div className="rounded-2xl border border-border p-4 space-y-3">
            <p className="font-semibold text-slate-900">Make an offer</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="Amount in MZN"
                className="flex-1 h-11 px-3 rounded-xl border border-border"
              />
              <button
                type="button"
                disabled={offerBusy || !offerAmount}
                onClick={async () => {
                  setOfferBusy(true);
                  setOfferNote("");
                  try {
                    const res = await fetch("/api/offers", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        listingId: listing.id,
                        amountMzn: parseFloat(offerAmount),
                        message: offerMsg || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setOfferNote(data.error || "Failed");
                      return;
                    }
                    setOfferNote("Offer sent to the seller");
                    setOfferAmount("");
                    setOfferMsg("");
                  } catch {
                    setOfferNote("Something went wrong");
                  } finally {
                    setOfferBusy(false);
                  }
                }}
                className="h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
              >
                {offerBusy ? "…" : "Send"}
              </button>
            </div>
            <input
              value={offerMsg}
              onChange={(e) => setOfferMsg(e.target.value)}
              placeholder="Optional message"
              className="w-full h-11 px-3 rounded-xl border border-border text-sm"
            />
            {offerNote && <p className="text-sm text-slate-600">{offerNote}</p>}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch("/api/favorites", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ listingId: listing.id }),
                });
                if (res.ok) setSaved((s) => !s);
              } catch {
                /* ignore */
              }
            }}
            className="flex items-center gap-2 text-sm text-slate-600"
          >
            <Heart className={`w-5 h-5 ${saved ? "fill-red-500 text-red-500" : ""}`} />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: listing.title, url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url);
              }
            }}
            className="flex items-center gap-2 text-sm text-slate-600"
          >
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
            <button
              type="button"
              className="mt-2 text-amber-700 font-medium underline"
              onClick={async () => {
                try {
                  const res = await fetch("/api/admin/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      listingId: id,
                      reason: "OTHER",
                      description: "Reported from listing page",
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    alert(data.error || data.detail || "Unable to report");
                    return;
                  }
                  alert("Report submitted. Thank you.");
                } catch {
                  alert("Unable to report");
                }
              }}
            >
              Report listing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
