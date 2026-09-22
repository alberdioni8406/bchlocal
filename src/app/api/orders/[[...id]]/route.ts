import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  mznToBch,
  generatePaymentRequestId,
  isDemoPaymentMode,
  buildBchPaymentUri,
} from "@/lib/bch";
import { verifyPaymentById } from "@/lib/bch-provider";
import { z } from "zod";

type Ctx = { params: Promise<{ id?: string[] }> };

const createSchema = z.object({
  listingId: z.string(),
  offerId: z.string().optional(),
});

const reviewSchema = z.object({
  action: z.literal("review"),
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

/** Buyer review after payment confirmed — lives under orders to save a serverless function. */
async function createReview(body: unknown) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = reviewSchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { review: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.buyerId !== session.user.id) {
      return NextResponse.json({ error: "Only the buyer can leave this review" }, { status: 403 });
    }
    if (!["PAYMENT_CONFIRMED", "COMPLETED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Reviews are only allowed after payment is confirmed" },
        { status: 400 }
      );
    }
    if (order.review) {
      return NextResponse.json({ error: "Review already submitted" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        reviewerId: session.user.id,
        revieweeId: order.sellerId,
        rating: data.rating,
        comment: data.comment?.trim() || null,
      },
    });

    const stats = await prisma.review.aggregate({
      where: { revieweeId: order.sellerId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.profile.updateMany({
      where: { userId: order.sellerId },
      data: {
        averageRating: stats._avg.rating || data.rating,
        reviewCount: stats._count.rating,
      },
    });

    return NextResponse.json({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    console.error("POST review via orders error:", err);
    return NextResponse.json({ error: "Unable to submit review" }, { status: 500 });
  }
}

async function createOrder(body: unknown) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId, offerId } = createSchema.parse(body);

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, status: "ACTIVE" },
      include: { seller: { include: { profile: true } } },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not available" }, { status: 404 });
    }
    if (listing.sellerId === session.user.id) {
      return NextResponse.json({ error: "Cannot buy your own listing" }, { status: 400 });
    }

    // If an accepted offer is provided, use that amount instead of list price
    let priceMznValue = Number(listing.priceMzn);
    let acceptedOfferId: string | null = null;
    if (offerId) {
      const offer = await prisma.offer.findFirst({
        where: {
          id: offerId,
          listingId,
          buyerId: session.user.id,
          status: "ACCEPTED",
        },
      });
      if (!offer) {
        return NextResponse.json(
          { error: "Accepted offer not found for this listing" },
          { status: 400 }
        );
      }
      priceMznValue = Number(offer.amountMzn);
      acceptedOfferId = offer.id;
    }

    const priceBch = await mznToBch(priceMznValue);
    const paymentRequestId = generatePaymentRequestId(listingId);
    const expiresAt = new Date(Date.now() + 45 * 60 * 1000);
    const demo = isDemoPaymentMode();

    // Prefer seller's real BCH address from profile (non-custodial).
    // Fall back to a clearly labelled demo address only when DEMO_PAYMENT_MODE is on
    // and the seller has not set an address yet.
    const sellerAddress = listing.seller?.profile?.bchAddress?.trim() || null;
    let bchAddress: string;
    if (sellerAddress) {
      bchAddress = sellerAddress;
    } else if (demo) {
      bchAddress = `bitcoincash:qp${paymentRequestId.slice(-20).replace(/[^a-z0-9]/g, "")}demo`;
    } else {
      return NextResponse.json(
        {
          error:
            "Seller has not set a BCH receiving address yet. Ask them to add one in Settings.",
        },
        { status: 400 }
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          buyerId: session.user.id,
          sellerId: listing.sellerId,
          listingId: listing.id,
          status: "PENDING_PAYMENT",
          priceMzn: priceMznValue,
          priceBch,
          bchAddress,
          paymentRequestId,
          expiresAt,
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          amountBch: priceBch,
          amountMzn: priceMznValue,
          bchAddress,
          expiresAt,
          isDemo: demo,
        },
      });

      if (acceptedOfferId) {
        await tx.offer.update({
          where: { id: acceptedOfferId },
          data: { orderId: order.id },
        });
      }

      return order;
    });

    const paymentUri = buildBchPaymentUri({
      address: bchAddress,
      amountBch: priceBch,
      label: "BCH Local",
      message: listing.title.slice(0, 40),
    });

    return NextResponse.json({
      orderId: order.id,
      paymentRequestId,
      priceMzn: priceMznValue,
      priceBch,
      bchAddress,
      paymentUri,
      expiresAt,
      isDemo: demo,
      listingTitle: listing.title,
      fromOffer: Boolean(acceptedOfferId),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Create order error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function getOrder(id: string, userId: string) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        listing: { select: { title: true } },
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const priceBch = order.priceBch ? Number(order.priceBch) : null;
    const paymentUri = order.bchAddress
      ? buildBchPaymentUri({
          address: order.bchAddress,
          amountBch: priceBch,
          label: "BCH Local",
          message: order.listing.title.slice(0, 40),
        })
      : null;

    return NextResponse.json({
      id: order.id,
      status: order.status,
      priceMzn: Number(order.priceMzn),
      priceBch,
      bchAddress: order.bchAddress,
      paymentUri,
      paymentRequestId: order.paymentRequestId,
      expiresAt: order.expiresAt,
      listingTitle: order.listing.title,
      paymentStatus: order.payment?.status,
      isDemo: order.payment?.isDemo ?? isDemoPaymentMode(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function demoPayment(id: string, userId: string, action: string) {
  if (!isDemoPaymentMode()) {
    return NextResponse.json({ error: "Demo payment mode is disabled" }, { status: 403 });
  }

  const order = await prisma.order.findFirst({
    where: { id, buyerId: userId },
    include: { payment: true },
  });
  if (!order || !order.payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!order.payment.isDemo) {
    return NextResponse.json({ error: "Not a demo payment" }, { status: 400 });
  }

  if (action === "detect") {
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: { status: "DETECTED", detectedAt: new Date() },
    });
    await prisma.order.update({
      where: { id },
      data: { status: "PAYMENT_DETECTED" },
    });
    return NextResponse.json({ status: "DETECTED" });
  }

  if (action === "confirm") {
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    await prisma.order.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.listing
      .update({ where: { id: order.listingId }, data: { status: "SOLD" } })
      .catch(() => {});
    // Keep trust progression consistent with real payment path
    const profile = await prisma.profile.findUnique({
      where: { userId: order.sellerId },
      select: { completedTx: true, trustLevel: true },
    });
    if (profile) {
      const newTx = (profile.completedTx || 0) + 1;
      let trustLevel = profile.trustLevel || "New";
      if (newTx >= 20 && trustLevel === "Established") trustLevel = "Trusted";
      else if (newTx >= 5 && (trustLevel === "New" || !trustLevel))
        trustLevel = "Established";
      await prisma.profile
        .update({
          where: { userId: order.sellerId },
          data: { completedTx: newTx, trustLevel },
        })
        .catch(() => {});
    }
    return NextResponse.json({ status: "CONFIRMED" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.[0]) {
    return NextResponse.json({ error: "Order id required" }, { status: 400 });
  }
  return getOrder(id[0], session.user.id);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  if (body?.action === "review") {
    return createReview(body);
  }

  if (id?.[0]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (body.action === "verify") {
      const order = await prisma.order.findFirst({
        where: {
          id: id[0],
          OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
        },
        include: { payment: true },
      });
      if (!order?.payment) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const result = await verifyPaymentById(order.payment.id);
      return NextResponse.json(result);
    }
    return demoPayment(id[0], session.user.id, body.action);
  }
  return createOrder(body);
}
