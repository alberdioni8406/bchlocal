import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPromotionPrice,
  mznToBch,
  isDemoPaymentMode,
  buildBchPaymentUri,
  generatePaymentRequestId,
} from "@/lib/bch";
import { z } from "zod";
import {
  grantBusinessEntitlements,
  revokeExpiredBusinessEntitlements,
  BUSINESS_ENTITLEMENTS,
} from "@/lib/entitlements";

type Ctx = { params: Promise<{ path?: string[] }> };

const promoSchema = z.object({
  listingId: z.string(),
  type: z.enum(["BOOST", "FEATURED", "TOP_SPOT"]),
});

const DURATION_DAYS = {
  BOOST: 3,
  FEATURED: 7,
  TOP_SPOT: 14,
} as const;

async function postPromotion(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { listingId, type } = promoSchema.parse(body);

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
    const platformAddress =
      process.env.PLATFORM_BCH_ADDRESS?.trim() ||
      (demo
        ? `bitcoincash:qp${generatePaymentRequestId(listingId).slice(-20).replace(/[^a-z0-9]/g, "")}platform`
        : null);

    if (!demo && !platformAddress) {
      return NextResponse.json(
        {
          error:
            "Platform BCH address is not configured. Set PLATFORM_BCH_ADDRESS to accept promotion payments.",
        },
        { status: 503 }
      );
    }

    const paymentRef = `promo-${listingId.slice(0, 8)}-${Date.now().toString(36)}`;

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
          paymentReference: demo ? `demo-promo-${promotion.id}` : paymentRef,
        },
      });

      return { promotion, revenue };
    });

    const paymentUri =
      platformAddress && priceBch > 0
        ? buildBchPaymentUri({
            address: platformAddress,
            amountBch: priceBch,
            label: "BCH Local",
            message: `${type} ${listing.title}`.slice(0, 40),
          })
        : null;

    return NextResponse.json({
      promotionId: result.promotion.id,
      revenueId: result.revenue.id,
      type,
      priceMzn,
      priceBch,
      days,
      status: result.promotion.status,
      isDemo: demo,
      bchAddress: platformAddress,
      paymentUri,
      paymentReference: result.revenue.paymentReference,
      message: demo
        ? "Demo mode: promotion activated immediately (not a real payment)"
        : "Pay the BCH amount to the platform address to activate this promotion",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Promotion error:", err);
    return NextResponse.json({ error: "Server error", detail: err instanceof Error ? err.message.slice(0, 500) : "unknown" }, { status: 500 });
  }
}

async function patchPromotion(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = z
      .object({
        promotionId: z.string(),
        action: z.enum(["activate_demo", "cancel"]),
      })
      .parse(await req.json());

    const promotion = await prisma.promotion.findFirst({
      where: { id: body.promotionId, userId: session.user.id },
      include: { revenueTransaction: true },
    });
    if (!promotion) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.action === "cancel") {
      await prisma.$transaction(async (tx) => {
        await tx.promotion.update({
          where: { id: promotion.id },
          data: { status: "CANCELLED" },
        });
        if (promotion.revenueTransaction) {
          await tx.revenueTransaction.update({
            where: { id: promotion.revenueTransaction.id },
            data: { status: "EXPIRED" },
          });
        }
      });
      return NextResponse.json({ ok: true, status: "CANCELLED" });
    }

    if (body.action === "activate_demo") {
      if (!isDemoPaymentMode()) {
        return NextResponse.json(
          { error: "Demo activation only allowed when DEMO_PAYMENT_MODE=true" },
          { status: 403 }
        );
      }
      const days = DURATION_DAYS[promotion.type as keyof typeof DURATION_DAYS] || 3;
      await prisma.$transaction(async (tx) => {
        await tx.promotion.update({
          where: { id: promotion.id },
          data: {
            status: "ACTIVE",
            startsAt: new Date(),
            endsAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          },
        });
        if (promotion.revenueTransaction) {
          await tx.revenueTransaction.update({
            where: { id: promotion.revenueTransaction.id },
            data: { status: "PAID", paidAt: new Date() },
          });
        }
      });
      return NextResponse.json({ ok: true, status: "ACTIVE" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Promotion PATCH error:", err);
    return NextResponse.json({ error: "Server error", detail: err instanceof Error ? err.message.slice(0, 500) : "unknown" }, { status: 500 });
  }
}

async function getPromotions(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const listingId = req.nextUrl.searchParams.get("listingId");
    const promotions = await prisma.promotion.findMany({
      where: {
        userId: session.user.id,
        ...(listingId ? { listingId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        listing: { select: { id: true, title: true } },
        revenueTransaction: true,
      },
    });
    return NextResponse.json({
      promotions: promotions.map((p) => ({
        id: p.id,
        type: p.type,
        status: p.status,
        priceMzn: Number(p.priceMzn),
        priceBch: p.priceBch ? Number(p.priceBch) : null,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        listing: p.listing,
        revenueStatus: p.revenueTransaction?.status,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ promotions: [] });
  }
}

async function getBusiness() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let sub = await prisma.businessSubscription.findUnique({
      where: { userId: session.user.id },
    });

    if (sub && sub.status === "ACTIVE" && sub.endsAt <= new Date()) {
      await prisma.businessSubscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
      await revokeExpiredBusinessEntitlements(prisma, session.user.id);
      sub = { ...sub, status: "EXPIRED" };
    }

    if (sub && sub.status === "ACTIVE" && sub.endsAt > new Date()) {
      await grantBusinessEntitlements(prisma, session.user.id);
    }

    const priceMzn = await getPromotionPrice("BUSINESS_MONTHLY");
    const priceBch = await mznToBch(priceMzn);

    return NextResponse.json({
      active: Boolean(sub && sub.status === "ACTIVE" && sub.endsAt > new Date()),
      subscription: sub
        ? {
            status: sub.status,
            startsAt: sub.startsAt,
            endsAt: sub.endsAt,
            priceMzn: Number(sub.priceMzn),
          }
        : null,
      priceMzn,
      priceBch,
      entitlements: BUSINESS_ENTITLEMENTS,
    });
  } catch (err) {
    console.error(err);
    const detail = err instanceof Error ? err.message.slice(0, 500) : "unknown";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}

async function postBusiness() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const priceMzn = await getPromotionPrice("BUSINESS_MONTHLY");
    const priceBch = await mznToBch(priceMzn);
    const demo = isDemoPaymentMode();
    const platformAddress =
      process.env.PLATFORM_BCH_ADDRESS?.trim() ||
      (demo
        ? `bitcoincash:qp${generatePaymentRequestId(session.user.id).slice(-20).replace(/[^a-z0-9]/g, "")}platform`
        : null);

    if (!demo && !platformAddress) {
      return NextResponse.json(
        {
          error: "Platform BCH address is not configured. Set PLATFORM_BCH_ADDRESS.",
        },
        { status: 503 }
      );
    }

    const startsAt = new Date();
    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const paymentRef = `biz-${session.user.id.slice(0, 8)}-${Date.now().toString(36)}`;

    const result = await prisma.$transaction(async (tx) => {
      const sub = await tx.businessSubscription.upsert({
        where: { userId: session.user.id },
        update: {
          status: demo ? "ACTIVE" : "PENDING",
          priceMzn,
          startsAt,
          endsAt,
        },
        create: {
          userId: session.user.id,
          status: demo ? "ACTIVE" : "PENDING",
          priceMzn,
          startsAt,
          endsAt,
        },
      });

      const revenue = await tx.revenueTransaction.create({
        data: {
          userId: session.user.id,
          product: "BUSINESS_SUB",
          amountMzn: priceMzn,
          amountBch: priceBch,
          currency: "MZN",
          status: demo ? "PAID" : "PENDING",
          businessSubId: sub.id,
          paidAt: demo ? new Date() : null,
          paymentReference: demo ? `demo-biz-${sub.id}` : paymentRef,
        },
      });

      if (demo) {
        await grantBusinessEntitlements(tx, session.user.id);
      }

      return { sub, revenue };
    });

    const paymentUri =
      platformAddress && priceBch > 0
        ? buildBchPaymentUri({
            address: platformAddress,
            amountBch: priceBch,
            label: "BCH Local Business",
            message: "Business subscription 30 days",
          })
        : null;

    return NextResponse.json({
      subscriptionId: result.sub.id,
      revenueId: result.revenue.id,
      priceMzn,
      priceBch,
      status: demo ? "ACTIVE" : "PENDING",
      isDemo: demo,
      bchAddress: platformAddress,
      paymentUri,
      paymentReference: result.revenue.paymentReference,
      message: demo
        ? "Demo mode: business subscription activated (not a real payment)"
        : "Pay with BCH to activate your business subscription",
    });
  } catch (err) {
    console.error("POST business error:", err);
    const detail =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message).slice(0, 500)
        : "unknown";
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : undefined;
    return NextResponse.json(
      { error: "Unable to start subscription", detail, code },
      { status: 500 }
    );
  }
}

/**
 * /api/revenue/promotions — listing boosts / featured / top spot
 * /api/revenue/business  — business subscription
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const segment = path?.[0];
  if (segment === "promotions") return getPromotions(req);
  if (segment === "business") return getBusiness();
  return NextResponse.json({ error: "Use /api/revenue/promotions or /api/revenue/business" }, { status: 404 });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const segment = path?.[0];
  if (segment === "promotions") return postPromotion(req);
  if (segment === "business") return postBusiness();
  return NextResponse.json({ error: "Use /api/revenue/promotions or /api/revenue/business" }, { status: 404 });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const segment = path?.[0];
  if (segment === "promotions") return patchPromotion(req);
  if (segment === "business") return patchBusiness(req);
  return NextResponse.json({ error: "Unknown revenue path" }, { status: 404 });
}

async function patchBusiness(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = z
      .object({ action: z.enum(["activate_demo"]) })
      .parse(await req.json());

    if (body.action !== "activate_demo" || !isDemoPaymentMode()) {
      return NextResponse.json(
        { error: "Demo activation only allowed when DEMO_PAYMENT_MODE=true" },
        { status: 403 }
      );
    }

    const sub = await prisma.businessSubscription.findUnique({
      where: { userId: session.user.id },
    });
    if (!sub) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.$transaction(async (tx) => {
      await tx.businessSubscription.update({
        where: { id: sub.id },
        data: { status: "ACTIVE", startsAt: new Date(), endsAt },
      });
      await tx.revenueTransaction.updateMany({
        where: { businessSubId: sub.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      await grantBusinessEntitlements(tx, session.user.id);
    });

    return NextResponse.json({ ok: true, status: "ACTIVE", endsAt });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("PATCH business error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
