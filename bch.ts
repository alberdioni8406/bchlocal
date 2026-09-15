import { prisma } from "./prisma";

/**
 * BCH payment helpers.
 * V1 supports Demo Payment Mode (env DEMO_PAYMENT_MODE=true).
 * Production path is ready for integration with a reliable BCH provider
 * (e.g. BCH RPC, FullStack.cash, Bitcoin.com APIs, etc.).
 * Never claim a payment is confirmed without real detection.
 */

const DEMO_MODE = process.env.DEMO_PAYMENT_MODE === "true";

export function isDemoPaymentMode(): boolean {
  return DEMO_MODE;
}

/** Approximate MZN per BCH. In production, fetch live rate. */
export async function getBchRateMzn(): Promise<number> {
  try {
    const latest = await prisma.bchRate.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (latest) return Number(latest.rateMzn);

    // Fallback approximate (update via admin or cron)
    return 45000; // example placeholder ~ USD price * MZN/USD
  } catch {
    return 45000;
  }
}

export async function mznToBch(mzn: number): Promise<number> {
  const rate = await getBchRateMzn();
  if (rate <= 0) return 0;
  return mzn / rate;
}

export async function bchToMzn(bch: number): Promise<number> {
  const rate = await getBchRateMzn();
  return bch * rate;
}

/**
 * Generate a unique payment destination for an order.
 * In production: derive from seller's provided address + unique memo/OP_RETURN,
 * or use a payment protocol (BIP70 / JSON payment requests) with a non-custodial provider.
 * Never use a platform-owned address for user-to-user payments.
 */
export function generatePaymentRequestId(orderId: string): string {
  return `bchlocal-${orderId}-${Date.now().toString(36)}`;
}

/**
 * In real integration, this would poll a BCH indexer / websocket for the address
 * or payment request. Demo mode simulates detection after a delay only when
 * explicitly triggered by admin/demo controls — never auto-confirm on button click alone.
 */
export async function checkPaymentStatus(
  paymentId: string
): Promise<"PENDING" | "DETECTED" | "CONFIRMED" | "EXPIRED" | "FAILED"> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return "FAILED";
  if (payment.status === "CONFIRMED") return "CONFIRMED";
  if (payment.status === "DETECTED") return "DETECTED";
  if (payment.expiresAt < new Date()) return "EXPIRED";

  if (DEMO_MODE && payment.isDemo) {
    // Demo only: status is updated via explicit demo endpoint, not auto.
    return payment.status as "PENDING" | "DETECTED" | "CONFIRMED" | "EXPIRED" | "FAILED";
  }

  // Production path: query blockchain / payment provider here.
  // Example pseudo:
  // const txs = await bchProvider.getTransactions(payment.bchAddress, payment.createdAt);
  // if (matching confirmed tx) update status...
  return "PENDING";
}

export const PROMOTION_PRICES_DEFAULT = {
  BOOST: 100,
  FEATURED: 250,
  TOP_SPOT: 500,
  BUSINESS_MONTHLY: 500,
} as const;

export async function getPromotionPrice(
  type: "BOOST" | "FEATURED" | "TOP_SPOT" | "BUSINESS_MONTHLY"
): Promise<number> {
  const key = `price_${type.toLowerCase()}`;
  const setting = await prisma.platformSetting.findUnique({ where: { key } });
  if (setting) return parseFloat(setting.value);
  return PROMOTION_PRICES_DEFAULT[type];
}
