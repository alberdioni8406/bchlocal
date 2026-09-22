import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getBchRateMzn } from "@/lib/bch";
import { promotionRank } from "@/lib/entitlements";

type Ctx = { params: Promise<{ id?: string[] }> };

async function listListings(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const city = searchParams.get("city") || undefined;
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const condition = searchParams.get("condition") || undefined;
    const type = searchParams.get("type") || undefined;
    const sort = searchParams.get("sort") || "recent";
    const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = { status: "ACTIVE" };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
    if (category) where.category = { slug: category };
    if (city && city !== "Anywhere") where.locationCity = city;
    if (minPrice) {
      where.priceMzn = { ...(where.priceMzn as object || {}), gte: parseFloat(minPrice) };
    }
    if (maxPrice) {
      where.priceMzn = { ...(where.priceMzn as object || {}), lte: parseFloat(maxPrice) };
    }
    if (condition) where.condition = condition;
    if (type) where.listingType = type;
    if (searchParams.get("acceptsBch") === "true") where.acceptsBch = true;

    let orderBy: Record<string, string> = { publishedAt: "desc" };
    if (sort === "price_asc") orderBy = { priceMzn: "asc" };
    if (sort === "price_desc") orderBy = { priceMzn: "desc" };

    // Fetch extra rows on "recent" so paid promotions can be ranked to the top
    // without a schema change. Fine for the current catalog size.
    const fetchTake =
      sort === "recent" || !sort ? Math.min(Math.max(limit + offset + 40, limit), 80) : limit;
    const fetchSkip = sort === "recent" || !sort ? 0 : offset;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        take: fetchTake,
        skip: fetchSkip,
        include: {
          category: true,
          images: { where: { isPrimary: true }, take: 1 },
          seller: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  averageRating: true,
                  completedTx: true,
                  trustLevel: true,
                  avatarUrl: true,
                  isBusiness: true,
                  verifiedBusiness: true,
                },
              },
            },
          },
          promotions: {
            where: { status: "ACTIVE", endsAt: { gt: new Date() } },
            select: { type: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    const rate = await getBchRateMzn();

    const data = listings.map((l) => ({
      id: l.id,
      title: l.title,
      priceMzn: Number(l.priceMzn),
      priceBchApprox: rate > 0 ? Number(l.priceMzn) / rate : null,
      condition: l.condition,
      listingType: l.listingType,
      locationCity: l.locationCity,
      locationArea: l.locationArea,
      publishedAt: l.publishedAt,
      acceptsBch: l.acceptsBch,
      image: l.images[0]?.url || null,
      category: l.category
        ? { slug: l.category.slug, nameEn: l.category.nameEn, namePt: l.category.namePt }
        : null,
      seller: {
        username: l.seller.username,
        displayName: l.seller.profile?.displayName,
        rating: l.seller.profile?.averageRating,
        completedTx: l.seller.profile?.completedTx,
        trustLevel: l.seller.profile?.trustLevel,
        isBusiness: l.seller.profile?.isBusiness || false,
        verifiedBusiness: l.seller.profile?.verifiedBusiness || false,
      },
      promotion: l.promotions[0]?.type || null,
    }));

    let ranked = data;
    if (sort === "recent" || !sort) {
      ranked = [...data].sort((a, b) => {
        const ra = promotionRank(a.promotion) + (a.seller.verifiedBusiness ? 0.4 : a.seller.isBusiness ? 0.2 : 0);
        const rb = promotionRank(b.promotion) + (b.seller.verifiedBusiness ? 0.4 : b.seller.isBusiness ? 0.2 : 0);
        if (rb !== ra) return rb - ra;
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return tb - ta;
      });
      ranked = ranked.slice(offset, offset + limit);
    }

    return NextResponse.json({ listings: ranked, total, limit, offset });
  } catch (err) {
    console.error("Listings GET error:", err);
    const detail =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message).slice(0, 400)
        : "unknown";
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : undefined;
    return NextResponse.json(
      { listings: [], total: 0, offline: true, detail, code },
      { status: 503 }
    );
  }
}

async function getListing(id: string) {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        seller: {
          select: { id: true, username: true, profile: true },
        },
        promotions: {
          where: { status: "ACTIVE", endsAt: { gt: new Date() } },
          select: { type: true, endsAt: true },
        },
      },
    });

    if (!listing || listing.status === "DELETED" || listing.status === "HIDDEN") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    prisma.listing
      .update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    const rate = await getBchRateMzn();

    return NextResponse.json({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      priceMzn: Number(listing.priceMzn),
      priceBchApprox: rate > 0 ? Number(listing.priceMzn) / rate : null,
      condition: listing.condition,
      listingType: listing.listingType,
      status: listing.status,
      locationCity: listing.locationCity,
      locationArea: listing.locationArea,
      deliveryOption: listing.deliveryOption,
      acceptsBch: listing.acceptsBch,
      views: listing.views,
      publishedAt: listing.publishedAt,
      images: listing.images.map((i) => ({ url: i.url, isPrimary: i.isPrimary })),
      category: listing.category
        ? {
            slug: listing.category.slug,
            nameEn: listing.category.nameEn,
            namePt: listing.category.namePt,
          }
        : null,
      seller: {
        id: listing.seller.id,
        username: listing.seller.username,
        displayName: listing.seller.profile?.displayName,
        bio: listing.seller.profile?.bio,
        rating: listing.seller.profile?.averageRating,
        completedTx: listing.seller.profile?.completedTx,
        completionRate: listing.seller.profile?.completionRate,
        trustLevel: listing.seller.profile?.trustLevel,
        isBusiness: listing.seller.profile?.isBusiness,
        verifiedBusiness: listing.seller.profile?.verifiedBusiness,
        avatarUrl: listing.seller.profile?.avatarUrl,
        memberSince: listing.seller.profile?.createdAt,
      },
      promotion: listing.promotions[0] || null,
    });
  } catch (err) {
    console.error("Listing GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(5000),
  priceMzn: z.number().positive(),
  categorySlug: z.string(),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR", "FOR_PARTS"]),
  listingType: z.enum(["GOODS", "SERVICE", "JOB", "DIGITAL"]).default("GOODS"),
  locationCity: z.string(),
  locationArea: z.string().optional(),
  deliveryOption: z.enum(["PICKUP", "DELIVERY", "BOTH"]).default("PICKUP"),
  acceptsBch: z.boolean().default(true),
  imageUrls: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (id?.[0]) return getListing(id[0]);
  return listListings(req);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const category = await prisma.category.findUnique({
      where: { slug: data.categorySlug },
    });
    if (!category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    // Ensure seller still exists (session can outlive a deleted user)
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isSuspended: true, isBlocked: true },
    });
    if (!seller || seller.isSuspended || seller.isBlocked) {
      return NextResponse.json({ error: "Account not allowed to list" }, { status: 403 });
    }

    const listing = await prisma.listing.create({
      data: {
        title: data.title.trim(),
        description: data.description.trim(),
        priceMzn: new Prisma.Decimal(data.priceMzn),
        condition: data.condition,
        listingType: data.listingType,
        status: "ACTIVE",
        locationCity: data.locationCity.trim(),
        locationArea: data.locationArea?.trim() || null,
        deliveryOption: data.deliveryOption,
        acceptsBch: data.acceptsBch,
        publishedAt: new Date(),
        sellerId: session.user.id,
        categoryId: category.id,
        images: data.imageUrls?.length
          ? {
              create: data.imageUrls.map((url, i) => ({
                url,
                sortOrder: i,
                isPrimary: i === 0,
              })),
            }
          : undefined,
      },
      include: { category: true },
    });

    return NextResponse.json({ id: listing.id, title: listing.title });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.errors },
        { status: 400 }
      );
    }
    // Surface Prisma / DB diagnostics in logs; keep client message safe
    console.error("Create listing error:", err);
    const message =
      err instanceof Prisma.PrismaClientKnownRequestError
        ? `Database error (${err.code})`
        : err instanceof Error
          ? err.message
          : "Unknown error";
    // In production still return generic message to the client
    const clientMessage =
      process.env.NODE_ENV === "development" || process.env.DEBUG_LISTINGS === "true"
        ? message
        : "Unable to publish listing. Please check the required fields and try again.";
    return NextResponse.json(
      { error: clientMessage, detail: message.slice(0, 400) },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(10).max(5000).optional(),
  priceMzn: z.number().positive().optional(),
  categorySlug: z.string().optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR", "FOR_PARTS"]).optional(),
  listingType: z.enum(["GOODS", "SERVICE", "JOB", "DIGITAL"]).optional(),
  locationCity: z.string().optional(),
  locationArea: z.string().optional().nullable(),
  deliveryOption: z.enum(["PICKUP", "DELIVERY", "BOTH"]).optional(),
  acceptsBch: z.boolean().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "SOLD", "DELETED"]).optional(),
  imageUrls: z.array(z.string()).max(5).optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const listingId = id?.[0];
    if (!listingId) {
      return NextResponse.json({ error: "Listing id required" }, { status: 400 });
    }

    const existing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.sellerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = updateSchema.parse(await req.json());

    let categoryId: string | undefined;
    if (data.categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: data.categorySlug },
      });
      if (!category) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      categoryId = category.id;
    }

    const listing = await prisma.$transaction(async (tx) => {
      if (data.imageUrls) {
        await tx.listingImage.deleteMany({ where: { listingId } });
        if (data.imageUrls.length) {
          await tx.listingImage.createMany({
            data: data.imageUrls.map((url, i) => ({
              listingId,
              url,
              sortOrder: i,
              isPrimary: i === 0,
            })),
          });
        }
      }

      return tx.listing.update({
        where: { id: listingId },
        data: {
          ...(data.title !== undefined ? { title: data.title.trim() } : {}),
          ...(data.description !== undefined
            ? { description: data.description.trim() }
            : {}),
          ...(data.priceMzn !== undefined
            ? { priceMzn: new Prisma.Decimal(data.priceMzn) }
            : {}),
          ...(data.condition !== undefined ? { condition: data.condition } : {}),
          ...(data.listingType !== undefined ? { listingType: data.listingType } : {}),
          ...(data.locationCity !== undefined
            ? { locationCity: data.locationCity.trim() }
            : {}),
          ...(data.locationArea !== undefined
            ? { locationArea: data.locationArea?.trim() || null }
            : {}),
          ...(data.deliveryOption !== undefined
            ? { deliveryOption: data.deliveryOption }
            : {}),
          ...(data.acceptsBch !== undefined ? { acceptsBch: data.acceptsBch } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(categoryId ? { categoryId } : {}),
        },
      });
    });

    return NextResponse.json({
      id: listing.id,
      title: listing.title,
      status: listing.status,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.errors },
        { status: 400 }
      );
    }
    console.error("Update listing error:", err);
    return NextResponse.json(
      { error: "Unable to update listing. Please try again." },
      { status: 500 }
    );
  }
}
