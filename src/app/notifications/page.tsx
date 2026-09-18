"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin?callbackUrl=/notifications");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.notifications || []);
        setLoading(false);
        if ((d.unreadCount || 0) > 0) {
          fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ all: true }),
          }).catch(() => {});
        }
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-slate-900 mb-4">Notifications</h1>
      {items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const content = (
              <div
                className={`p-4 rounded-2xl border ${
                  n.isRead ? "border-border bg-white" : "border-primary/20 bg-green-50"
                }`}
              >
                <p className="font-medium text-slate-900 text-sm">{n.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
