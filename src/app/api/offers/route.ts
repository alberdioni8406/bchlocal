import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  listingId: z.string(),
  amountMzn: z.number().positive(),
  message: z.string().max(500).optional(),
});

const actionSchema = z.object({
  offerId: z.string(),
  action: z.enum(["accept", "reject", "counter", "withdraw"]),
  amountMzn: z.number().positive().optional(),
  message: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const listingId = req.nextUrl.searchParams.get("listingId");
    const where = listingId
      ? {
          listingId,
          OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
        }
      : {
          OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
        };

    const offers = await prisma.offer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        listing: { select: { id: true, title: true, priceMzn: true, status: true } },
        buyer: { select: { id: true, username: true } },
        seller: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json({
      offers: offers.map((o) => ({
        id: o.id,
        listingId: o.listingId,
        listingTitle: o.listing.title,
        listingPriceMzn: Number(o.listing.priceMzn),
        amountMzn: Number(o.amountMzn),
        message: o.message,
        status: o.status,
        buyerId: o.buyerId,
        sellerId: o.sellerId,
        buyerUsername: o.buyer.username,
        sellerUsername: o.seller.username,
        isMine: o.buyerId === session.user.id,
        parentOfferId: o.parentOfferId,
        orderId: o.orderId,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET offers error:", err);
    return NextResponse.json({ offers: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimit({
      key: `offers:${session.user.id}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many offer actions. Please wait a moment." },
        { status: 429 }
      );
    }
    const body = await req.json();

    // Action on existing offer (accept / reject / counter / withdraw)
    if (body.offerId && body.action) {
      const data = actionSchema.parse(body);
      const offer = await prisma.offer.findUnique({
        where: { id: data.offerId },
        include: { listing: true },
      });
      if (!offer) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }
      if (offer.status !== "PENDING" && offer.status !== "COUNTERED") {
        return NextResponse.json({ error: "Offer is no longer active" }, { status: 400 });
      }

      if (data.action === "withdraw") {
        if (offer.buyerId !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await prisma.offer.update({
          where: { id: offer.id },
          data: { status: "WITHDRAWN" },
        });
        return NextResponse.json({ ok: true, status: "WITHDRAWN" });
      }

      const isSeller = offer.sellerId === session.user.id;
      const isBuyer = offer.buyerId === session.user.id;
      const isCounter = Boolean(offer.parentOfferId);

      if (data.action === "reject") {
        if (!isSeller && !isBuyer) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await prisma.offer.update({
          where: { id: offer.id },
          data: { status: "REJECTED" },
        });
        const notifyUserId = isSeller ? offer.buyerId : offer.sellerId;
        await createNotification({
          userId: notifyUserId,
          type: "OFFER_REJECTED",
          title: "Offer declined",
          body: `An offer on "${offer.listing.title}" was declined.`,
          link: `/listing/${offer.listingId}`,
        });
        return NextResponse.json({ ok: true, status: "REJECTED" });
      }

      if (data.action === "counter") {
        if (!isSeller) {
          return NextResponse.json({ error: "Only the seller can counter" }, { status: 403 });
        }
        if (!data.amountMzn) {
          return NextResponse.json({ error: "Counter amount required" }, { status: 400 });
        }
        const counter = await prisma.$transaction(async (tx) => {
          await tx.offer.update({
            where: { id: offer.id },
            data: { status: "COUNTERED" },
          });
          return tx.offer.create({
            data: {
              listingId: offer.listingId,
              buyerId: offer.buyerId,
              sellerId: offer.sellerId,
              amountMzn: new Prisma.Decimal(data.amountMzn!),
              message: data.message || null,
              status: "PENDING",
              parentOfferId: offer.id,
              expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            },
          });
        });
        await createNotification({
          userId: offer.buyerId,
          type: "OFFER_COUNTERED",
          title: "Counter offer",
          body: `Seller countered at ${data.amountMzn} MZN on "${offer.listing.title}".`,
          link: `/profile/offers`,
        });
        return NextResponse.json({ ok: true, status: "COUNTERED", offerId: counter.id });
      }

      if (data.action === "accept") {
        // Seller accepts buyer offers; buyer accepts seller counters
        if (isSeller || (isBuyer && isCounter)) {
          const updated = await prisma.offer.update({
            where: { id: offer.id },
            data: { status: "ACCEPTED" },
          });
          await createNotification({
            userId: isSeller ? offer.buyerId : offer.sellerId,
            type: "OFFER_ACCEPTED",
            title: "Offer accepted",
            body: isSeller
              ? `Your offer on "${offer.listing.title}" was accepted. Complete payment to finish the order.`
              : `Buyer accepted the counter on "${offer.listing.title}".`,
            link: isSeller
              ? `/orders/new?listing=${offer.listingId}&offerId=${offer.id}`
              : `/profile/offers`,
          });
          return NextResponse.json({
            ok: true,
            status: "ACCEPTED",
            offerId: updated.id,
            amountMzn: Number(updated.amountMzn),
            listingId: updated.listingId,
          });
        }
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Create new offer
    const data = createSchema.parse(body);
    const listing = await prisma.listing.findFirst({
      where: { id: data.listingId, status: "ACTIVE" },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not available" }, { status: 404 });
    }
    if (listing.sellerId === session.user.id) {
      return NextResponse.json({ error: "Cannot offer on your own listing" }, { status: 400 });
    }

    const offer = await prisma.offer.create({
      data: {
        listingId: listing.id,
        buyerId: session.user.id,
        sellerId: listing.sellerId,
        amountMzn: new Prisma.Decimal(data.amountMzn),
        message: data.message || null,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    await createNotification({
      userId: listing.sellerId,
      type: "NEW_OFFER",
      title: "New offer",
      body: `${data.amountMzn} MZN offered on "${listing.title}"`,
      link: `/listing/${listing.id}`,
    });

    return NextResponse.json({
      id: offer.id,
      amountMzn: Number(offer.amountMzn),
      status: offer.status,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    console.error("POST offers error:", err);
    return NextResponse.json({ error: "Unable to process offer" }, { status: 500 });
  }
}
