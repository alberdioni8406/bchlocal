import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SafetyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-8 h-8 text-amber-600" />
        <h1 className="text-2xl font-bold text-slate-900">Stay safe</h1>
      </div>

      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="font-semibold text-slate-900">Payments</h2>
          <ul className="mt-2 space-y-2 text-sm list-disc pl-5">
            <li>Only send BCH through the official order / payment flow on BCH Local.</li>
            <li>Never send funds to an address someone sends you in chat.</li>
            <li>BCH Local does not hold your money. Buyer pays seller directly.</li>
            <li>If payment details change suddenly, stop and report.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Meeting in person</h2>
          <ul className="mt-2 space-y-2 text-sm list-disc pl-5">
            <li>Prefer public places for pickup.</li>
            <li>Tell someone where you’re going.</li>
            <li>Inspect the item before completing payment when possible.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Report problems</h2>
          <p className="mt-2 text-sm">
            Use Report Listing or Report User for scams, fake items, harassment, or illegal goods.
            Our team reviews reports and can hide listings or suspend accounts.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Badges</h2>
          <p className="mt-2 text-sm">
            New, Established, Trusted and Verified badges reflect activity and reputation.
            They do not mean BCH Local guarantees a seller. Always use your judgment.
          </p>
        </section>
      </div>

      <Link href="/browse" className="inline-flex mt-10 text-primary font-medium underline">
        Back to marketplace
      </Link>
    </div>
  );
}
