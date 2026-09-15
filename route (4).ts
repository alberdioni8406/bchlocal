import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getBchRateMzn } from "@/lib/bch";

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

    let orderBy: Record<string, string> = { publishedAt: "desc" };
    if (sort === "price_asc") orderBy = { priceMzn: "asc" };
    if (sort === "price_desc") orderBy = { priceMzn: "desc" };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
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
      },
      promotion: l.promotions[0]?.type || null,
    }));

    return NextResponse.json({ listings: data, total, limit, offset });
  } catch (err) {
    console.error("Listings GET error:", err);
    return NextResponse.json({ listings: [], total: 0, offline: true }, { status: 200 });
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

    const listing = await prisma.listing.create({
      data: {
        title: data.title,
        description: data.description,
        priceMzn: data.priceMzn,
        condition: data.condition,
        listingType: data.listingType,
        status: "ACTIVE",
        locationCity: data.locationCity,
        locationArea: data.locationArea,
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
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    console.error("Create listing error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
