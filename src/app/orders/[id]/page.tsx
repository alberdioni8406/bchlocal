"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Copy, CheckCircle, Clock, Loader2, ExternalLink } from "lucide-react";
import QRCode from "qrcode";

type PaymentStatus = "PENDING" | "DETECTED" | "CONFIRMED" | "EXPIRED" | "FAILED";

export default function OrderPaymentPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  const [copied, setCopied] = useState<"address" | "uri" | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [order, setOrder] = useState<{
    id: string;
    listingTitle: string;
    priceMzn: number;
    priceBch: number | null;
    bchAddress: string | null;
    paymentUri: string | null;
    paymentRequestId: string | null;
    expiresAt: string | null;
    isDemo: boolean;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then(async (d) => {
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

        // Generate QR from payment URI (or address as fallback)
        const uri = d.paymentUri || d.bchAddress;
        if (uri) {
          try {
            const url = await QRCode.toDataURL(uri, {
              width: 260,
              margin: 2,
              color: { dark: "#0f172a", light: "#ffffff" },
            });
            setQrDataUrl(url);
          } catch (e) {
            console.error("QR generation failed", e);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orderId]);

  function copyText(text: string, kind: "address" | "uri") {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
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

  async function checkPayment() {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const data = await res.json();
      if (data.status === "CONFIRMED") setStatus("CONFIRMED");
      else if (data.status === "DETECTED") setStatus("DETECTED");
      else if (data.status === "EXPIRED") setStatus("EXPIRED");
    } catch {
      /* ignore */
    }
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
        <div className="mt-8 space-y-6">
          <div className="text-center space-y-3">
            <p className="text-lg font-medium text-slate-900">Order completed!</p>
            <p className="text-slate-600 text-sm">
              Payment confirmed. Leave a review if the trade went well.
            </p>
          </div>

          {!reviewDone ? (
            <div className="p-4 rounded-2xl border border-border bg-white space-y-3 text-left">
              <p className="font-semibold text-slate-900">Rate the seller</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewRating(n)}
                    className={`w-10 h-10 rounded-xl border text-sm font-bold ${
                      reviewRating >= n
                        ? "border-primary bg-green-50 text-primary"
                        : "border-border bg-white text-slate-400"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Optional comment"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
              {reviewError && (
                <p className="text-sm text-red-600">{reviewError}</p>
              )}
              <button
                type="button"
                disabled={reviewBusy}
                onClick={async () => {
                  setReviewBusy(true);
                  setReviewError("");
                  try {
                    const res = await fetch("/api/orders", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "review",
                        orderId,
                        rating: reviewRating,
                        comment: reviewComment || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setReviewError(data.error || "Could not submit review");
                      return;
                    }
                    setReviewDone(true);
                  } catch {
                    setReviewError("Something went wrong");
                  } finally {
                    setReviewBusy(false);
                  }
                }}
                className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
              >
                {reviewBusy ? "Submitting…" : "Submit review"}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-green-700 font-medium">
              Thanks for your review.
            </p>
          )}

          <div className="text-center">
            <Link
              href="/profile"
              className="inline-flex h-12 px-6 items-center rounded-xl bg-primary text-white font-semibold"
            >
              Go to Profile
            </Link>
          </div>
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
            <p className="text-sm font-medium text-slate-700 mb-1">Send exactly this amount</p>
            {order.priceBch != null && (
              <p className="text-2xl font-bold text-primary mb-4">
                {order.priceBch.toFixed(6)} BCH
              </p>
            )}

            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="BCH payment QR code"
                className="mx-auto w-[220px] h-[220px] rounded-xl border border-slate-200"
              />
            ) : (
              <div className="aspect-square max-w-[220px] mx-auto bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-300 text-center p-4">
                QR unavailable
              </div>
            )}

            {order.bchAddress && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Seller BCH address</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted p-3 rounded-xl break-all">
                      {order.bchAddress}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(order.bchAddress!, "address")}
                      className="p-3 rounded-xl border border-border hover:bg-muted shrink-0"
                      aria-label="Copy address"
                    >
                      {copied === "address" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {order.paymentUri && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Payment URI</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted p-3 rounded-xl break-all">
                        {order.paymentUri}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyText(order.paymentUri!, "uri")}
                        className="p-3 rounded-xl border border-border hover:bg-muted shrink-0"
                        aria-label="Copy payment URI"
                      >
                        {copied === "uri" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <a
                      href={order.paymentUri}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in wallet
                    </a>
                  </div>
                )}
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

          {status === "PENDING" && !order.isDemo && (
            <button
              type="button"
              onClick={checkPayment}
              className="mt-4 w-full h-11 rounded-xl border border-border bg-white text-sm font-medium"
            >
              Check payment status
            </button>
          )}

          {order.isDemo && status === "PENDING" && (
            <div className="mt-6 p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Demo Payment Mode
              </p>
              <p className="text-sm text-slate-600 mb-3">
                Real blockchain detection is not active. Use this only for testing. Never treat
                this as a real on-chain payment.
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
