export default function ContactPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Contact</h1>
      <p className="mt-2 text-slate-600">
        Questions, safety reports, or partnership inquiries.
      </p>
      <div className="mt-8 p-6 rounded-2xl border border-border bg-white space-y-3 text-sm">
        <p>
          <span className="font-medium text-slate-900">Email:</span>{" "}
          <a href="mailto:hello@bchlocal.mz" className="text-primary">
            hello@bchlocal.mz
          </a>
        </p>
        <p className="text-slate-500">
          For urgent safety issues, use Report on the listing or user profile so our moderation team can act quickly.
        </p>
      </div>
    </div>
  );
}
