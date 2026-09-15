import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            seller: { select: { username: true } },
          },
        },
      },
    });

    return NextResponse.json({
      favorites: favorites
        .filter((f) => f.listing.status === "ACTIVE")
        .map((f) => ({
          id: f.id,
          listingId: f.listingId,
          title: f.listing.title,
          priceMzn: Number(f.listing.priceMzn),
          locationCity: f.listing.locationCity,
          image: f.listing.images[0]?.url || null,
          seller: f.listing.seller.username,
        })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ favorites: [] });
  }
}

const schema = z.object({ listingId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { listingId } = schema.parse(await req.json());

    await prisma.favorite.upsert({
      where: {
        userId_listingId: { userId: session.user.id, listingId },
      },
      update: {},
      create: { userId: session.user.id, listingId },
    });

    await prisma.listing.update({
      where: { id: listingId },
      data: { favoritesCount: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { listingId } = schema.parse(await req.json());

    await prisma.favorite.deleteMany({
      where: { userId: session.user.id, listingId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
