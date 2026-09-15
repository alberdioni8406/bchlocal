"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing");
  const { status } = useSession();
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/signin?callbackUrl=/orders/new?listing=${listingId}`);
      return;
    }
    if (status !== "authenticated" || !listingId) return;

    async function create() {
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not create order");
          return;
        }
        router.replace(`/orders/${data.orderId}`);
      } catch {
        setError("Something went wrong");
      }
    }
    create();
  }, [status, listingId, router]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <Link href="/browse" className="inline-block mt-4 text-primary underline">
          Back to browse
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-slate-500">Creating order...</p>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <NewOrderContent />
    </Suspense>
  );
}
