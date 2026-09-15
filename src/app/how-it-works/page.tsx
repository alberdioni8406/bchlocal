import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">How it works</h1>
      <p className="mt-2 text-slate-600">
        BCH Local is a simple local marketplace. Pay with Bitcoin Cash. No complicated crypto steps.
      </p>

      <ol className="mt-10 space-y-8">
        {[
          {
            t: "Browse or search",
            d: "Find products, services and opportunities near you. No account needed to look around.",
          },
          {
            t: "Message the seller",
            d: "Ask questions, agree on pickup or delivery. Keep communication on the platform.",
          },
          {
            t: "Buy with Bitcoin Cash",
            d: "Click Buy Now. You’ll see a clear BCH amount and payment destination for that order only. Pay from your own wallet.",
          },
          {
            t: "Complete & review",
            d: "After payment is confirmed and the deal is done, leave a review. Reputation builds trust.",
          },
        ].map((s, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">{s.t}</h2>
              <p className="mt-1 text-slate-600 text-sm">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 p-5 rounded-2xl bg-green-50 border border-green-100">
        <p className="font-medium text-slate-900">Sellers</p>
        <p className="mt-1 text-sm text-slate-600">
          Posting is free. Promote your listing (Boost, Featured, Top Spot) when you want more visibility. Businesses can upgrade for unlimited listings and a verified badge.
        </p>
      </div>

      <Link
        href="/browse"
        className="inline-flex mt-8 h-12 px-6 items-center rounded-xl bg-primary text-white font-semibold"
      >
        Start browsing
      </Link>
    </div>
  );
}
