"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Settings,
  TrendingUp,
} from "lucide-react";

type Stats = {
  totalUsers: number;
  activeListings: number;
  completedOrders: number;
  openReports: number;
  revenue: {
    today: number;
    week: number;
    month: number;
    total: number;
    breakdown: Record<string, number>;
  };
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then(setStats)
        .catch(() =>
          setStats({
            totalUsers: 0,
            activeListings: 0,
            completedOrders: 0,
            openReports: 0,
            revenue: { today: 0, week: 0, month: 0, total: 0, breakdown: {} },
          })
        );
    }
  }, [session]);

  if (status === "loading" || session?.user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-500">Loading admin...</p>
      </div>
    );
  }

  const s = stats || {
    totalUsers: 0,
    activeListings: 0,
    completedOrders: 0,
    openReports: 0,
    revenue: { today: 0, week: 0, month: 0, total: 0, breakdown: {} },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <p className="text-sm text-slate-500 mt-1">BCH Local marketplace control</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Marketplace
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Total users" value={s.totalUsers} />
          <StatCard icon={Package} label="Active listings" value={s.activeListings} />
          <StatCard icon={ShoppingCart} label="Completed tx" value={s.completedOrders} />
          <StatCard icon={AlertTriangle} label="Open reports" value={s.openReports} />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Revenue
          </h2>
        </div>
        <div className="rounded-2xl bg-slate-900 text-white p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400">Today</p>
              <p className="text-2xl font-bold">{s.revenue.today} MZN</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">This week</p>
              <p className="text-2xl font-bold">{s.revenue.week} MZN</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">This month</p>
              <p className="text-2xl font-bold">{s.revenue.month} MZN</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total</p>
              <p className="text-2xl font-bold text-primary">{s.revenue.total} MZN</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Only successful (PAID) revenue transactions are counted. Pending is excluded.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {["BOOST", "FEATURED", "TOP_SPOT", "BUSINESS_SUB"].map((p) => (
            <div key={p} className="p-3 rounded-xl bg-white border border-border">
              <p className="text-slate-500">{p.replace("_", " ")}</p>
              <p className="font-semibold">{s.revenue.breakdown[p] || 0} MZN</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/admin/reports"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border hover:border-primary/40"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="font-medium">Moderation & Reports</span>
        </Link>
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border hover:border-primary/40"
        >
          <Settings className="w-5 h-5 text-slate-600" />
          <span className="font-medium">Prices & Settings</span>
        </Link>
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border hover:border-primary/40"
        >
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-medium">Revenue & settings</span>
        </Link>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-border">
      <Icon className="w-5 h-5 text-slate-400 mb-2" />
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
