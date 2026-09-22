import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, MapPin, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ username: string }> };

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      profile: true,
      listings: {
        where: { status: "ACTIVE" },
        orderBy: { publishedAt: "desc" },
        take: 20,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          reviewer: {
            select: {
              username: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      },
    },
  });

  if (!user || user.isSuspended) notFound();

  const profile = {
    username: user.username,
    displayName: user.profile?.displayName,
    avatarUrl: user.profile?.avatarUrl,
    bio: user.profile?.bio,
    locationCity: user.profile?.locationCity,
    trustLevel: user.profile?.trustLevel,
    averageRating: user.profile?.averageRating,
    reviewCount: user.profile?.reviewCount,
    completedTx: user.profile?.completedTx,
    isBusiness: user.profile?.isBusiness,
    verifiedBusiness: user.profile?.verifiedBusiness,
    listings: user.listings.map((l) => ({
      id: l.id,
      title: l.title,
      priceMzn: Number(l.priceMzn),
      locationCity: l.locationCity,
      image: l.images[0]?.url || null,
    })),
    reviews: user.reviewsReceived.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      reviewer: {
        username: r.reviewer.username,
        displayName: r.reviewer.profile?.displayName,
      },
    })),
  };

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

      {profile.bio && <p className="text-sm text-slate-700 mb-6">{profile.bio}</p>}

      {profile.verifiedBusiness && (
        <div className="mb-6 p-4 rounded-2xl border border-blue-100 bg-blue-50/50 text-sm text-slate-800">
          <p className="font-semibold text-slate-900">Verified Business</p>
          <p className="mt-1 text-slate-600">
            This seller pays for a business subscription. They get a verified badge and
            higher organic visibility. BCH Local still does not hold trade funds.
          </p>
        </div>
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
              className="flex gap-3 p-3 rounded-xl border border-border bg-white hover:border-primary/30"
            >
              <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                {l.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.image} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-900 line-clamp-1">{l.title}</p>
                <p className="text-sm text-primary font-semibold">
                  {new Intl.NumberFormat("pt-MZ", {
                    style: "currency",
                    currency: "MZN",
                    maximumFractionDigits: 0,
                  }).format(l.priceMzn)}
                </p>
                <p className="text-xs text-slate-500">{l.locationCity}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {profile.reviews.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-slate-900 mb-3">
            Reviews {profile.reviewCount ? `(${profile.reviewCount})` : ""}
          </h2>
          <div className="space-y-3">
            {profile.reviews.map((r) => (
              <div key={r.id} className="p-3 rounded-xl border border-border bg-white">
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 font-medium">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {r.rating}
                  </span>
                  <span className="text-slate-500">@{r.reviewer.username}</span>
                </div>
                {r.comment && (
                  <p className="text-sm text-slate-700 mt-1">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
