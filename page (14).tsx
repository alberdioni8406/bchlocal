"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Copy, CheckCircle, Clock, Loader2 } from "lucide-react";

type PaymentStatus = "PENDING" | "DETECTED" | "CONFIRMED" | "EXPIRED" | "FAILED";

export default function OrderPaymentPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<{
    id: string;
    listingTitle: string;
    priceMzn: number;
    priceBch: number | null;
    bchAddress: string | null;
    paymentRequestId: string | null;
    expiresAt: string | null;
    isDemo: boolean;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setLoading(false);
          return;
        }
        setOrder(d);
        const map: Record<string, PaymentStatus> = {
          PENDING_PAYMENT: "PENDING",
          PAYMENT_DETECTED: "DETECTED",
          PAYMENT_CONFIRMED: "CONFIRMED",
          COMPLETED: "CONFIRMED",
        };
        setStatus(map[d.status] || (d.paymentStatus as PaymentStatus) || "PENDING");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orderId]);

  function copyAddress() {
    if (!order?.bchAddress) return;
    navigator.clipboard.writeText(order.bchAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function simulateDemoPayment() {
    if (!order?.isDemo) return;
    setStatus("DETECTED");
    await fetch(`/api/orders/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "detect" }),
    });
    setTimeout(async () => {
      await fetch(`/api/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      setStatus("CONFIRMED");
    }, 2000);
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading order...</div>;
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p>Order not found</p>
        <Link href="/browse" className="text-primary underline mt-2 inline-block">
          Browse
        </Link>
      </div>
    );
  }

  const statusUI = {
    PENDING: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Waiting for payment" },
    DETECTED: { icon: Loader2, color: "text-blue-600", bg: "bg-blue-50", label: "Payment detected — confirming..." },
    CONFIRMED: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Payment confirmed" },
    EXPIRED: { icon: Clock, color: "text-red-600", bg: "bg-red-50", label: "Payment expired" },
    FAILED: { icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", label: "Payment failed" },
  };

  const s = statusUI[status];
  const StatusIcon = s.icon;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900">Pay with Bitcoin Cash</h1>
      <p className="text-sm text-slate-500 mt-1">Order {order.id.slice(0, 12)}…</p>

      <div className={`mt-6 flex items-center gap-3 p-4 rounded-2xl ${s.bg}`}>
        <StatusIcon className={`w-6 h-6 ${s.color} ${status === "DETECTED" ? "animate-spin" : ""}`} />
        <span className={`font-semibold ${s.color}`}>{s.label}</span>
      </div>

      {status === "CONFIRMED" ? (
        <div className="mt-8 text-center space-y-4">
          <p className="text-lg font-medium text-slate-900">Order completed!</p>
          <p className="text-slate-600">
            The seller has been notified. You can leave a review after delivery.
          </p>
          <Link
            href="/profile"
            className="inline-flex h-12 px-6 items-center rounded-xl bg-primary text-white font-semibold"
          >
            Go to Profile
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 p-4 rounded-2xl border border-border bg-white space-y-2">
            <p className="font-medium text-slate-900">{order.listingTitle}</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Price</span>
              <span className="font-semibold">
                {new Intl.NumberFormat("pt-MZ", {
                  style: "currency",
                  currency: "MZN",
                  maximumFractionDigits: 0,
                }).format(order.priceMzn)}
              </span>
            </div>
            {order.priceBch != null && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">BCH amount</span>
                <span className="font-semibold text-primary">
                  {order.priceBch.toFixed(6)} BCH
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 rounded-2xl border border-border bg-white">
            <p className="text-sm font-medium text-slate-700 mb-3">Send exactly this amount</p>
            <div className="aspect-square max-w-[220px] mx-auto bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-300 text-center p-4">
              QR Code
              <br />
              (BCH payment request)
            </div>
            {order.bchAddress && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-1">BCH address / payment destination</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-3 rounded-xl break-all">
                    {order.bchAddress}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="p-3 rounded-xl border border-border hover:bg-muted"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}
            <div className="mt-3 text-xs text-slate-500 space-y-1">
              {order.paymentRequestId && <p>Ref: {order.paymentRequestId}</p>}
              {order.expiresAt && (
                <p>Expires: {new Date(order.expiresAt).toLocaleTimeString()}</p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Important</p>
              <p className="mt-1">
                Only send BCH to the address shown above for this order. Never send
                outside this official payment flow. BCH Local does not hold your funds.
              </p>
            </div>
          </div>

          {order.isDemo && status === "PENDING" && (
            <div className="mt-6 p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Demo Payment Mode
              </p>
              <p className="text-sm text-slate-600 mb-3">
                Real blockchain detection is not active. Use this only for testing.
              </p>
              <button
                onClick={simulateDemoPayment}
                className="w-full h-11 rounded-xl bg-slate-800 text-white text-sm font-medium"
              >
                Simulate payment received (demo)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
