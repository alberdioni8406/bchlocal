import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
        listings: {
          where: { status: "ACTIVE" },
          orderBy: { publishedAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            priceMzn: true,
            locationCity: true,
          },
        },
      },
    });

    if (!user || user.isSuspended) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      displayName: user.profile?.displayName,
      bio: user.profile?.bio,
      locationCity: user.profile?.locationCity,
      trustLevel: user.profile?.trustLevel,
      averageRating: user.profile?.averageRating,
      completedTx: user.profile?.completedTx,
      isBusiness: user.profile?.isBusiness,
      verifiedBusiness: user.profile?.verifiedBusiness,
      memberSince: user.createdAt,
      listings: user.listings.map((l) => ({
        id: l.id,
        title: l.title,
        priceMzn: Number(l.priceMzn),
        locationCity: l.locationCity,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
