/**
 * Clean BCH payment verification provider layer.
 * Never mark an order paid just because the buyer clicked "I paid".
 * Demo mode is isolated and must never be presented as on-chain confirmation.
 */

import { prisma } from "./prisma";
import { isDemoPaymentMode } from "./bch";
import { createNotification } from "./notifications";

export type ProviderPaymentCheck = {
  status: "PENDING" | "DETECTED" | "CONFIRMED" | "EXPIRED" | "FAILED";
  txId?: string | null;
  confirmedAt?: Date | null;
  detectedAt?: Date | null;
  provider?: string;
  raw?: unknown;
};

export interface BchPaymentProvider {
  name: string;
  checkAddress(opts: {
    address: string;
    expectedAmountBch: number;
    since: Date;
  }): Promise<ProviderPaymentCheck>;
}

/** Default stub — wire BCH_RPC_URL / indexer APIs here for production. */
class NullProvider implements BchPaymentProvider {
  name = "null";
  async checkAddress(): Promise<ProviderPaymentCheck> {
    return { status: "PENDING", provider: this.name };
  }
}

/**
 * Optional HTTP indexer adapter.
 * Expects an API that can answer address activity; configure via env.
 * Example: BCH_INDEXER_URL=https://your-indexer/api
 */
class HttpIndexerProvider implements BchPaymentProvider {
  name = "http-indexer";
  constructor(private baseUrl: string, private apiKey?: string) {}

  async checkAddress(opts: {
    address: string;
    expectedAmountBch: number;
    since: Date;
  }): Promise<ProviderPaymentCheck> {
    try {
      const url = new URL("/payments/check", this.baseUrl.replace(/\/$/, "") + "/");
      url.searchParams.set("address", opts.address);
      url.searchParams.set("amount", String(opts.expectedAmountBch));
      url.searchParams.set("since", opts.since.toISOString());
      const res = await fetch(url.toString(), {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        console.error("BCH indexer error", res.status, await res.text());
        return { status: "PENDING", provider: this.name };
      }
      const data = (await res.json()) as {
        status?: string;
        txId?: string;
        confirmed?: boolean;
        detected?: boolean;
      };
      if (data.confirmed || data.status === "CONFIRMED") {
        return {
          status: "CONFIRMED",
          txId: data.txId || null,
          confirmedAt: new Date(),
          provider: this.name,
          raw: data,
        };
      }
      if (data.detected || data.status === "DETECTED") {
        return {
          status: "DETECTED",
          txId: data.txId || null,
          detectedAt: new Date(),
          provider: this.name,
          raw: data,
        };
      }
      return { status: "PENDING", provider: this.name, raw: data };
    } catch (err) {
      console.error("BCH indexer provider failure:", err);
      return { status: "PENDING", provider: this.name };
    }
  }
}

export function getBchPaymentProvider(): BchPaymentProvider {
  const indexer = process.env.BCH_INDEXER_URL || process.env.BCH_RPC_URL;
  if (indexer) {
    return new HttpIndexerProvider(indexer, process.env.BCH_API_KEY);
  }
  return new NullProvider();
}

/**
 * Verify a payment row against the provider and update Payment + Order.
 * Safe to call repeatedly (idempotent for already-confirmed payments).
 */
export async function verifyPaymentById(paymentId: string): Promise<{
  status: string;
  txId?: string | null;
  isDemo: boolean;
}> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });
  if (!payment) {
    return { status: "FAILED", isDemo: false };
  }
  if (payment.status === "CONFIRMED") {
    return { status: "CONFIRMED", txId: payment.txId, isDemo: payment.isDemo };
  }
  if (payment.expiresAt < new Date()) {
    if (payment.status !== "EXPIRED") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "EXPIRED" },
      });
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "EXPIRED" },
      });
    }
    return { status: "EXPIRED", isDemo: payment.isDemo };
  }

  // Demo payments are never auto-confirmed by the provider layer
  if (payment.isDemo || isDemoPaymentMode()) {
    return { status: payment.status, txId: payment.txId, isDemo: true };
  }

  const provider = getBchPaymentProvider();
  const result = await provider.checkAddress({
    address: payment.bchAddress,
    expectedAmountBch: Number(payment.amountBch),
    since: payment.createdAt,
  });

  if (result.status === "CONFIRMED") {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "CONFIRMED",
          txId: result.txId || payment.txId,
          confirmedAt: result.confirmedAt || new Date(),
          detectedAt: payment.detectedAt || result.detectedAt || new Date(),
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "PAYMENT_CONFIRMED" },
      });
    });
    await createNotification({
      userId: payment.order.sellerId,
      type: "PAYMENT_CONFIRMED",
      title: "Payment confirmed",
      body: "A BCH payment for your order was confirmed.",
      link: `/orders/${payment.orderId}`,
    });
    await createNotification({
      userId: payment.order.buyerId,
      type: "PAYMENT_CONFIRMED",
      title: "Payment confirmed",
      body: "Your BCH payment was confirmed.",
      link: `/orders/${payment.orderId}`,
    });
    return { status: "CONFIRMED", txId: result.txId, isDemo: false };
  }

  if (result.status === "DETECTED") {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "DETECTED",
          txId: result.txId || payment.txId,
          detectedAt: result.detectedAt || new Date(),
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "PAYMENT_DETECTED" },
      });
    });
    await createNotification({
      userId: payment.order.sellerId,
      type: "PAYMENT_DETECTED",
      title: "Payment detected",
      body: "A possible BCH payment was detected for your order.",
      link: `/orders/${payment.orderId}`,
    });
    return { status: "DETECTED", txId: result.txId, isDemo: false };
  }

  return { status: "PENDING", isDemo: false };
}
