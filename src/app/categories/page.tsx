import Link from "next/link";
import {
  Smartphone, Laptop, Car, Shirt, Home, Utensils,
  Briefcase, Wrench, HardDrive, MoreHorizontal,
} from "lucide-react";

const categories = [
  { name: "Electronics", namePt: "Eletrônicos", icon: Laptop, slug: "electronics" },
  { name: "Phones", namePt: "Telemóveis", icon: Smartphone, slug: "phones" },
  { name: "Computers", namePt: "Computadores", icon: Laptop, slug: "computers" },
  { name: "Vehicles", namePt: "Veículos", icon: Car, slug: "vehicles" },
  { name: "Fashion", namePt: "Moda", icon: Shirt, slug: "fashion" },
  { name: "Home", namePt: "Casa", icon: Home, slug: "home" },
  { name: "Food", namePt: "Comida", icon: Utensils, slug: "food" },
  { name: "Services", namePt: "Serviços", icon: Wrench, slug: "services" },
  { name: "Jobs", namePt: "Empregos", icon: Briefcase, slug: "jobs" },
  { name: "Digital Goods", namePt: "Bens Digitais", icon: HardDrive, slug: "digital-goods" },
  { name: "Other", namePt: "Outros", icon: MoreHorizontal, slug: "other" },
];

export default function CategoriesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Categories</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/browse?category=${cat.slug}`}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border border-border hover:border-primary/40 hover:shadow-sm transition"
          >
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <cat.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-slate-800 text-center">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
