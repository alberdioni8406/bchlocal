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

/**
 * MZN per BCH.
 * Prefer a recent DB-cached rate (updated by admin or a future cron).
 * If missing/stale (>6h), attempt a live CoinGecko fetch and cache it.
 * Falls back to a conservative placeholder so the marketplace never breaks.
 */
export async function getBchRateMzn(): Promise<number> {
  const FALLBACK = 45000;
  const STALE_MS = 6 * 60 * 60 * 1000;

  try {
    const latest = await prisma.bchRate.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (latest) {
      const age = Date.now() - latest.createdAt.getTime();
      if (age < STALE_MS) return Number(latest.rateMzn);
    }

    // Live fetch (CoinGecko public endpoint). Fail soft.
    const apiUrl =
      process.env.BCH_RATE_API_URL ||
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd";
    const res = await fetch(apiUrl, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = (await res.json()) as { "bitcoin-cash"?: { usd?: number } };
      const usd = data?.["bitcoin-cash"]?.usd;
      if (typeof usd === "number" && usd > 0) {
        // Approximate MZN/USD. Prefer a platform setting if present.
        let mznPerUsd = 64; // conservative placeholder; update via PlatformSetting
        try {
          const setting = await prisma.platformSetting.findUnique({
            where: { key: "mzn_per_usd" },
          });
          if (setting) {
            const parsed = parseFloat(setting.value);
            if (parsed > 0) mznPerUsd = parsed;
          }
        } catch {
          /* ignore */
        }
        const rateMzn = Math.round(usd * mznPerUsd);
        // Cache for next callers (best-effort)
        prisma.bchRate
          .create({
            data: { rateMzn, source: "coingecko" },
          })
          .catch(() => {});
        return rateMzn;
      }
    }

    if (latest) return Number(latest.rateMzn);
    return FALLBACK;
  } catch {
    return FALLBACK;
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
 * Build a BIP21-style Bitcoin Cash payment URI.
 * amount is in BCH (not satoshis). label/message are optional.
 * Example: bitcoincash:q...?...amount=0.001&label=BCH%20Local
 */
export function buildBchPaymentUri(opts: {
  address: string;
  amountBch?: number | null;
  label?: string;
  message?: string;
}): string {
  let address = opts.address.trim();
  // Normalize: strip existing scheme if present so we can re-attach cleanly
  if (address.toLowerCase().startsWith("bitcoincash:")) {
    address = address.slice("bitcoincash:".length);
  }
  const params = new URLSearchParams();
  if (opts.amountBch != null && opts.amountBch > 0) {
    // Avoid scientific notation; max 8 decimal places for BCH
    params.set("amount", Number(opts.amountBch).toFixed(8).replace(/\.?0+$/, ""));
  }
  if (opts.label) params.set("label", opts.label);
  if (opts.message) params.set("message", opts.message);
  const qs = params.toString();
  return qs ? `bitcoincash:${address}?${qs}` : `bitcoincash:${address}`;
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
