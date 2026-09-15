export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mt-2">Last updated: September 2026</p>
      <div className="mt-8 space-y-4 text-sm text-slate-700">
        <p>
          We collect account information (email, username, profile details), listings, messages,
          and order metadata needed to operate the marketplace.
        </p>
        <p>
          We do <strong>not</strong> collect or store seed phrases, private keys, or wallet passwords.
          BCH payments happen outside our custody.
        </p>
        <p>
          Precise location is not shown publicly. Listings display approximate area only.
        </p>
        <p>
          We use data to provide the service, prevent fraud, and improve the product. We do not sell
          personal data.
        </p>
        <p>
          Contact us to request account deletion or data export.
        </p>
      </div>
    </div>
  );
}
