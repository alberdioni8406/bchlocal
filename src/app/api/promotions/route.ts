import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPromotionPrice, mznToBch, isDemoPaymentMode } from "@/lib/bch";
import { z } from "zod";

const schema = z.object({
  listingId: z.string(),
  type: z.enum(["BOOST", "FEATURED", "TOP_SPOT"]),
});

const DURATION_DAYS = {
  BOOST: 3,
  FEATURED: 7,
  TOP_SPOT: 14,
} as const;

/**
 * Create a promotion request.
 * In demo mode we can mark as PAID immediately for testing.
 * In production: create PENDING revenue + promotion, show BCH payment,
 * activate only after real payment confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { listingId, type } = schema.parse(body);

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, sellerId: session.user.id },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found or not yours" }, { status: 404 });
    }

    const priceMzn = await getPromotionPrice(type);
    const priceBch = await mznToBch(priceMzn);
    const days = DURATION_DAYS[type];
    const demo = isDemoPaymentMode();

    // Create revenue transaction + promotion in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const promotion = await tx.promotion.create({
        data: {
          listingId,
          userId: session.user.id,
          type,
          status: demo ? "ACTIVE" : "PENDING",
          priceMzn,
          priceBch,
          startsAt: demo ? new Date() : null,
          endsAt: demo ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null,
        },
      });

      const revenue = await tx.revenueTransaction.create({
        data: {
          userId: session.user.id,
          product: type,
          amountMzn: priceMzn,
          amountBch: priceBch,
          currency: "MZN",
          status: demo ? "PAID" : "PENDING",
          promotionId: promotion.id,
          paidAt: demo ? new Date() : null,
          paymentReference: demo ? `demo-promo-${promotion.id}` : null,
        },
      });

      return { promotion, revenue };
    });

    return NextResponse.json({
      promotionId: result.promotion.id,
      revenueId: result.revenue.id,
      type,
      priceMzn,
      priceBch,
      status: result.promotion.status,
      isDemo: demo,
      message: demo
        ? "Demo mode: promotion activated immediately"
        : "Pay with BCH to activate this promotion",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Promotion error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
