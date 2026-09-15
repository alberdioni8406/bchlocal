import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mznToBch, generatePaymentRequestId, isDemoPaymentMode } from "@/lib/bch";
import { z } from "zod";

type Ctx = { params: Promise<{ id?: string[] }> };

const createSchema = z.object({ listingId: z.string() });

async function createOrder(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { listingId } = createSchema.parse(body);

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

    const priceBch = await mznToBch(Number(listing.priceMzn));
    const paymentRequestId = generatePaymentRequestId(listingId);
    const expiresAt = new Date(Date.now() + 45 * 60 * 1000);
    const demo = isDemoPaymentMode();
    const bchAddress = `bitcoincash:qp${paymentRequestId.slice(-20).replace(/[^a-z0-9]/g, "")}demo`;

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          buyerId: session.user.id,
          sellerId: listing.sellerId,
          listingId: listing.id,
          status: "PENDING_PAYMENT",
          priceMzn: listing.priceMzn,
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
          amountMzn: listing.priceMzn,
          bchAddress,
          expiresAt,
          isDemo: demo,
        },
      });

      return order;
    });

    return NextResponse.json({
      orderId: order.id,
      paymentRequestId,
      priceMzn: Number(listing.priceMzn),
      priceBch,
      bchAddress,
      expiresAt,
      isDemo: demo,
      listingTitle: listing.title,
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

    return NextResponse.json({
      id: order.id,
      status: order.status,
      priceMzn: Number(order.priceMzn),
      priceBch: order.priceBch ? Number(order.priceBch) : null,
      bchAddress: order.bchAddress,
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
    await prisma.profile
      .update({ where: { userId: order.sellerId }, data: { completedTx: { increment: 1 } } })
      .catch(() => {});
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
  if (id?.[0]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    return demoPayment(id[0], session.user.id, body.action);
  }
  return createOrder(req);
}
