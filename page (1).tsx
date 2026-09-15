"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Report = {
  id: string;
  reason: string;
  description?: string | null;
  status: string;
  listingId?: string | null;
  reporter: string;
  reportedUser?: string | null;
  reportedUserId?: string | null;
  createdAt: string;
};

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetch("/api/reports")
        .then((r) => r.json())
        .then((d) => {
          setReports(d.reports || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session]);

  async function moderate(reportId: string, action: string, targetId?: string) {
    try {
      await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action, targetId }),
      });
      setReports((rs) =>
        rs.map((r) =>
          r.id === reportId ? { ...r, status: action === "dismiss" ? "DISMISSED" : "RESOLVED" } : r
        )
      );
    } catch {
      alert("Failed");
    }
  }

  if (status === "loading" || session?.user?.role !== "ADMIN") {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-600 mb-4">
        <ChevronLeft className="w-4 h-4" /> Admin
      </Link>
      <h1 className="text-xl font-bold text-slate-900">Moderation & Reports</h1>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="mt-8 text-slate-500">No reports</p>
      ) : (
        <div className="mt-6 space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl border border-border bg-white">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-slate-900">{r.reason}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    r.status === "OPEN"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              {r.description && (
                <p className="text-sm text-slate-600 mt-1">{r.description}</p>
              )}
              <p className="text-xs text-slate-400 mt-2">
                By @{r.reporter}
                {r.reportedUser ? ` · against @${r.reportedUser}` : ""}
                {r.listingId ? ` · listing ${r.listingId.slice(0, 8)}…` : ""}
                · {new Date(r.createdAt).toLocaleDateString()}
              </p>
              {r.status === "OPEN" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.listingId && (
                    <button
                      onClick={() => moderate(r.id, "hide_listing", r.listingId!)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-medium"
                    >
                      Hide listing
                    </button>
                  )}
                  {r.reportedUserId && (
                    <button
                      onClick={() => moderate(r.id, "suspend_user", r.reportedUserId!)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-800 font-medium"
                    >
                      Suspend user
                    </button>
                  )}
                  <button
                    onClick={() => moderate(r.id, "dismiss")}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
