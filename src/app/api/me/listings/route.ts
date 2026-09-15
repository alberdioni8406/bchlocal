import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listings = await prisma.listing.findMany({
      where: {
        sellerId: session.user.id,
        status: { not: "DELETED" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        promotions: {
          where: { status: "ACTIVE", endsAt: { gt: new Date() } },
          select: { type: true, endsAt: true },
        },
        _count: { select: { favorites: true } },
      },
    });

    return NextResponse.json({
      listings: listings.map((l) => ({
        id: l.id,
        title: l.title,
        priceMzn: Number(l.priceMzn),
        status: l.status,
        views: l.views,
        messagesCount: l.messagesCount,
        favoritesCount: l._count.favorites,
        locationCity: l.locationCity,
        publishedAt: l.publishedAt,
        image: l.images[0]?.url || null,
        promotion: l.promotions[0] || null,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ listings: [] });
  }
}
