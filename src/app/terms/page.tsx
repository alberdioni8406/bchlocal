export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 prose prose-slate">
      <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
      <p className="text-sm text-slate-500 mt-2">Last updated: September 2026</p>
      <div className="mt-8 space-y-4 text-sm text-slate-700">
        <p>
          BCH Local is a local marketplace that connects buyers and sellers. We provide the platform;
          transactions are between users. Bitcoin Cash payments go directly from buyer to seller.
          BCH Local does not hold user funds and does not act as an escrow in V1.
        </p>
        <p>
          You must not list illegal items, engage in fraud, harassment, or attempt to circumvent the
          official payment flow. We may hide listings, suspend accounts, or remove content that
          violates these terms.
        </p>
        <p>
          Promotional products (Boost, Featured, Top Spot) and Business subscriptions are paid
          services. Fees are non-refundable once activated, except where required by law.
        </p>
        <p>
          Reputation badges reflect platform activity and do not constitute a guarantee by BCH Local.
        </p>
        <p>
          These terms may be updated. Continued use of the platform constitutes acceptance.
        </p>
      </div>
    </div>
  );
}
