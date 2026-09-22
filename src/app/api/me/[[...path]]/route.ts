import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Ctx = { params: Promise<{ path?: string[] }> };

const updateSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).optional().nullable(),
  locationCity: z.string().max(80).optional().nullable(),
  locationArea: z.string().max(80).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal("")),
  bchAddress: z
    .string()
    .max(120)
    .optional()
    .nullable()
    .refine(
      (v) => !v || v.startsWith("bitcoincash:") || v.startsWith("q") || v.startsWith("p"),
      { message: "Invalid BCH address format" }
    ),
  defaultDelivery: z.enum(["PICKUP", "DELIVERY", "BOTH"]).optional().nullable(),
});

async function getProfile() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      profile: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    profile: user.profile
      ? {
          displayName: user.profile.displayName,
          bio: user.profile.bio,
          avatarUrl: user.profile.avatarUrl,
          locationCity: user.profile.locationCity,
          locationArea: user.profile.locationArea,
          phone: user.profile.phone,
          bchAddress: user.profile.bchAddress,
          defaultDelivery: user.profile.defaultDelivery,
          isBusiness: user.profile.isBusiness,
          verifiedBusiness: user.profile.verifiedBusiness,
          businessName: user.profile.businessName,
          trustLevel: user.profile.trustLevel,
          completedTx: user.profile.completedTx,
          averageRating: user.profile.averageRating,
          reviewCount: user.profile.reviewCount,
        }
      : null,
  });
}

async function patchProfile(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    const updateData: Record<string, unknown> = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName.trim();
    if (data.bio !== undefined) updateData.bio = data.bio?.trim() || null;
    if (data.locationCity !== undefined) updateData.locationCity = data.locationCity?.trim() || null;
    if (data.locationArea !== undefined) updateData.locationArea = data.locationArea?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null;
    if (data.bchAddress !== undefined) {
      updateData.bchAddress = data.bchAddress?.trim() || null;
    }
    if (data.defaultDelivery !== undefined) {
      updateData.defaultDelivery = data.defaultDelivery;
    }

    let profile;
    if (existing) {
      profile = await prisma.profile.update({
        where: { userId: session.user.id },
        data: updateData,
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          userId: session.user.id,
          ...updateData,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      profile: {
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        locationCity: profile.locationCity,
        locationArea: profile.locationArea,
        phone: profile.phone,
        bchAddress: profile.bchAddress,
        defaultDelivery: profile.defaultDelivery,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.errors },
        { status: 400 }
      );
    }
    console.error("PATCH /api/me/profile error:", err);
    return NextResponse.json(
      { error: "Unable to save settings. Please try again." },
      { status: 500 }
    );
  }
}

async function getMyListings() {
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

/**
 * /api/me/profile  → GET + PATCH profile
 * /api/me/listings → GET my listings
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { path } = await ctx.params;
    const segment = path?.[0] || "profile";
    if (segment === "profile") return getProfile();
    if (segment === "listings") return getMyListings();
    return NextResponse.json({ error: "Unknown me path" }, { status: 404 });
  } catch (err) {
    console.error("GET /api/me error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const segment = path?.[0] || "profile";
  if (segment === "profile") return patchProfile(req);
  return NextResponse.json({ error: "Unknown me path" }, { status: 404 });
}
