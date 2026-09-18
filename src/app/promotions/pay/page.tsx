"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Copy, CheckCircle, ExternalLink } from "lucide-react";
import QRCode from "qrcode";

function PayContent() {
  const params = useSearchParams();
  const listingId = params.get("listingId");
  const type = params.get("type") || "BOOST";
  const priceMzn = params.get("priceMzn");
  const priceBch = params.get("priceBch");
  const address = params.get("address");
  const uri = params.get("uri");
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const payload = uri || address;
    if (!payload) return;
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => {});
  }, [uri, address]);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-slate-900">Pay for promotion</h1>
      <p className="text-sm text-slate-500 mt-1">
        {type.replace("_", " ")} · BCH Local never takes custody of marketplace trade payments.
        Promotion fees go to the platform address below.
      </p>

      <div className="mt-6 p-4 rounded-2xl border border-border bg-white space-y-2">
        {priceMzn && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Price</span>
            <span className="font-semibold">
              {new Intl.NumberFormat("pt-MZ", {
                style: "currency",
                currency: "MZN",
                maximumFractionDigits: 0,
              }).format(Number(priceMzn))}
            </span>
          </div>
        )}
        {priceBch && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">BCH amount</span>
            <span className="font-semibold text-primary">
              {Number(priceBch).toFixed(6)} BCH
            </span>
          </div>
        )}
      </div>

      {qr && (
        <img
          src={qr}
          alt="Promotion payment QR"
          className="mx-auto mt-6 w-[220px] h-[220px] rounded-xl border border-slate-200"
        />
      )}

      {address && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-1">Platform BCH address</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted p-3 rounded-xl break-all">{address}</code>
            <button
              type="button"
              onClick={() => copy(address)}
              className="p-3 rounded-xl border border-border"
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

      {uri && (
        <a
          href={uri}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          <ExternalLink className="w-4 h-4" /> Open in wallet
        </a>
      )}

      <p className="mt-6 text-xs text-slate-500">
        After payment is detected, the promotion will activate. In demo mode promotions activate
        immediately without real chain settlement.
      </p>

      {listingId && (
        <Link
          href={`/listing/${listingId}`}
          className="mt-6 inline-flex h-11 px-5 items-center rounded-xl border border-border font-medium"
        >
          Back to listing
        </Link>
      )}
    </div>
  );
}

export default function PromotionPayPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading…</div>}>
      <PayContent />
    </Suspense>
  );
}
