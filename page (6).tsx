import Link from "next/link";
import { Building2, Check, Star } from "lucide-react";

export default function BusinessPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          BCH Local Business
        </h1>
        <p className="mt-2 text-slate-600">
          Reach more local buyers, showcase your products and accept BCH.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-primary bg-green-50/50 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-900">Business</h2>
          <div>
            <span className="text-2xl font-bold text-primary">500</span>
            <span className="text-slate-600"> MZN/month</span>
          </div>
        </div>

        <ul className="mt-6 space-y-3">
          {[
            "Unlimited listings",
            "Business profile page",
            "Verified business badge",
            "Featured business placement",
            "Basic analytics",
            "Contact information",
            "BCH payment tools",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-slate-800">
              <Check className="w-5 h-5 text-primary shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <Link
          href="/auth/signin"
          className="mt-8 flex h-12 items-center justify-center rounded-xl bg-primary text-white font-semibold hover:bg-green-700 transition"
        >
          Upgrade — 500 MZN/month
        </Link>
      </div>

      <div className="mt-8 p-4 rounded-2xl border border-border bg-white">
        <p className="text-sm font-medium text-slate-700">Free plan</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-500">
          <li>• Basic profile</li>
          <li>• Limited listings</li>
          <li>• BCH payment information</li>
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Pricing is configurable by admin. BCH Local never holds your funds.
      </p>
    </div>
  );
}
