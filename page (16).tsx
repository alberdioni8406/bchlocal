import Link from "next/link";
import {
  Smartphone,
  Laptop,
  Car,
  Shirt,
  Home,
  Utensils,
  Briefcase,
  Wrench,
  HardDrive,
  MoreHorizontal,
  MapPin,
  Search,
  ArrowRight,
  Rocket,
  Building2,
} from "lucide-react";

const categories = [
  { name: "Electronics", icon: Laptop, slug: "electronics" },
  { name: "Phones", icon: Smartphone, slug: "phones" },
  { name: "Computers", icon: Laptop, slug: "computers" },
  { name: "Vehicles", icon: Car, slug: "vehicles" },
  { name: "Fashion", icon: Shirt, slug: "fashion" },
  { name: "Home", icon: Home, slug: "home" },
  { name: "Food", icon: Utensils, slug: "food" },
  { name: "Services", icon: Wrench, slug: "services" },
  { name: "Jobs", icon: Briefcase, slug: "jobs" },
  { name: "Digital Goods", icon: HardDrive, slug: "digital-goods" },
  { name: "Other", icon: MoreHorizontal, slug: "other" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50 to-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 pt-10 pb-12 md:pt-16 md:pb-20">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Buy. Sell. Get paid.{" "}
              <span className="text-primary">In Bitcoin Cash.</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Find products, services and opportunities near you. Pay
              directly with Bitcoin Cash.
            </p>

            {/* Search */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="search"
                  placeholder="What are you looking for?"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-base"
                />
              </div>
              <div className="flex items-center gap-2 h-12 px-4 rounded-xl border border-border bg-white shadow-sm text-slate-700">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">
                  Maputo / Matola
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary text-white font-semibold shadow-sm hover:bg-green-700 transition"
              >
                Browse Listings
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-border bg-white font-semibold text-slate-800 hover:bg-muted transition"
              >
                Sell Something
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Popular categories
        </h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-1 px-1">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/browse?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 min-w-[76px] p-3 rounded-2xl bg-white border border-border hover:border-primary/40 hover:shadow-sm transition"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <cat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-slate-700 text-center leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured / Recent placeholder */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent listings
          </h2>
          <Link
            href="/browse"
            className="text-sm font-medium text-primary flex items-center gap-1"
          >
            See all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Demo cards - will be replaced by real data */}
          {[
            {
              title: "iPhone 13 128GB",
              price: "28,000 MZN",
              location: "Matola",
              img: "📱",
            },
            {
              title: "Toyota Corolla 2015",
              price: "850,000 MZN",
              location: "Maputo",
              img: "🚗",
            },
            {
              title: "MacBook Pro 2019",
              price: "65,000 MZN",
              location: "Maputo",
              img: "💻",
            },
            {
              title: "Sofa 3 places",
              price: "12,500 MZN",
              location: "Matola",
              img: "🛋️",
            },
          ].map((item, i) => (
            <Link
              key={i}
              href="/browse"
              className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition"
            >
              <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center text-4xl">
                {item.img}
              </div>
              <div className="p-3">
                <p className="font-semibold text-slate-900 truncate">
                  {item.title}
                </p>
                <p className="text-primary font-bold mt-0.5">{item.price}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {item.location}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Revenue / Promote section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="rounded-3xl bg-slate-900 text-white p-8 md:p-12">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
              <Rocket className="w-4 h-4" /> Sell more. Get seen.
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Posting is free.
            </h2>
            <p className="mt-3 text-slate-300">
              When you want more visibility, promote your listing with BCH.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1.5 rounded-full bg-white/10">
                Boost → 100 MZN
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white/10">
                Featured → 250 MZN
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white/10">
                Top Spot → 500 MZN
              </span>
            </div>
            <Link
              href="/sell"
              className="inline-flex mt-8 h-12 px-6 items-center rounded-xl bg-primary font-semibold hover:bg-green-600 transition"
            >
              Start selling
            </Link>
          </div>
        </div>
      </section>

      {/* Business section */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-3xl border border-border bg-white p-8 md:p-12 flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-3">
              <Building2 className="w-4 h-4" /> Businesses belong here too
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Build your local BCH business profile
            </h2>
            <p className="mt-3 text-slate-600">
              Showcase your products, reach buyers around you and accept
              Bitcoin Cash. Unlimited listings, verified badge and basic
              analytics from 500 MZN/month.
            </p>
            <Link
              href="/business"
              className="inline-flex mt-6 h-11 px-5 items-center rounded-xl border border-primary text-primary font-semibold hover:bg-green-50 transition"
            >
              Create Business Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:justify-between gap-8">
            <div>
              <p className="text-lg font-bold text-primary">BCH Local</p>
              <p className="mt-1 text-sm text-slate-500 max-w-xs">
                Buy. Sell. Get paid. In Bitcoin Cash.
              </p>
              <p className="mt-4 text-xs text-slate-400">
                Built for Bitcoin Cash.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <Link href="/browse" className="block text-slate-600 hover:text-primary">
                  Browse
                </Link>
                <Link href="/sell" className="block text-slate-600 hover:text-primary">
                  Sell
                </Link>
                <Link href="/business" className="block text-slate-600 hover:text-primary">
                  Businesses
                </Link>
              </div>
              <div className="space-y-2">
                <Link href="/how-it-works" className="block text-slate-600 hover:text-primary">
                  How it works
                </Link>
                <Link href="/safety" className="block text-slate-600 hover:text-primary">
                  Safety
                </Link>
                <Link href="/contact" className="block text-slate-600 hover:text-primary">
                  Contact
                </Link>
              </div>
              <div className="space-y-2">
                <Link href="/terms" className="block text-slate-600 hover:text-primary">
                  Terms
                </Link>
                <Link href="/privacy" className="block text-slate-600 hover:text-primary">
                  Privacy
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-8 text-xs text-slate-400">
            © {new Date().getFullYear()} BCH Local. Not affiliated with Bitcoin
            Cash developers or foundations.
          </p>
        </div>
      </footer>
    </div>
  );
}
