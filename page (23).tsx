"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star, MapPin, Package } from "lucide-react";

type Profile = {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  locationCity?: string | null;
  trustLevel?: string | null;
  averageRating?: number | null;
  completedTx?: number | null;
  isBusiness?: boolean;
  verifiedBusiness?: boolean;
  memberSince?: string;
  listings: {
    id: string;
    title: string;
    priceMzn: number;
    locationCity: string;
  }[];
};

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setProfile(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [username]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p>User not found</p>
        <Link href="/browse" className="text-primary underline mt-2 inline-block">
          Browse
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-primary">
          {(profile.displayName || profile.username)[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-sm text-slate-500">@{profile.username}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 flex-wrap">
            {profile.averageRating != null && profile.averageRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {profile.averageRating}
              </span>
            )}
            {profile.completedTx != null && (
              <span>{profile.completedTx} transactions</span>
            )}
            {profile.trustLevel && (
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-primary text-xs font-medium">
                {profile.trustLevel}
              </span>
            )}
            {profile.verifiedBusiness && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                Verified Business
              </span>
            )}
          </div>
        </div>
      </div>

      {profile.locationCity && (
        <p className="text-sm text-slate-600 flex items-center gap-1 mb-4">
          <MapPin className="w-4 h-4" /> {profile.locationCity}
        </p>
      )}

      {profile.bio && (
        <p className="text-sm text-slate-700 mb-6">{profile.bio}</p>
      )}

      <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <Package className="w-4 h-4" /> Listings
      </h2>

      {profile.listings.length === 0 ? (
        <p className="text-sm text-slate-500">No active listings</p>
      ) : (
        <div className="space-y-2">
          {profile.listings.map((l) => (
            <Link
              key={l.id}
              href={`/listing/${l.id}`}
              className="block p-3 rounded-xl border border-border bg-white hover:border-primary/30"
            >
              <p className="font-medium text-slate-900 line-clamp-1">{l.title}</p>
              <p className="text-sm text-primary font-semibold">
                {new Intl.NumberFormat("pt-MZ", {
                  style: "currency",
                  currency: "MZN",
                  maximumFractionDigits: 0,
                }).format(l.priceMzn)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
