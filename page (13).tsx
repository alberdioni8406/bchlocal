"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";

type Convo = {
  id: string;
  listing?: { id: string; title: string } | null;
  otherUser: { username: string; displayName?: string | null };
  lastMessage?: { content: string; createdAt: string } | null;
  lastMessageAt: string;
};

function MessagesContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing");
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d) => {
        setConversations(d.conversations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  async function startConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!listingId || !newMsg.trim()) return;
    setStarting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, content: newMsg }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/messages/${data.conversationId}`);
      } else {
        alert(data.error || "Failed");
      }
    } catch {
      alert("Error");
    } finally {
      setStarting(false);
    }
  }

  if (status === "loading" || loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  // Start new conversation from listing
  if (listingId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900">Message seller</h1>
        <p className="text-sm text-slate-500 mt-1">About this listing</p>
        <form onSubmit={startConversation} className="mt-6 space-y-4">
          <textarea
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            rows={4}
            placeholder="Hi, is this still available?"
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
          <button
            type="submit"
            disabled={starting}
            className="w-full h-12 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {starting ? "Sending..." : "Send message"}
          </button>
        </form>
        <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <p className="font-medium">Safety tip</p>
          <p className="mt-1">
            Never send BCH outside the official order flow. Keep communication here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900">Messages</h1>
      <p className="text-sm text-slate-500 mt-1">Buyer & seller conversations</p>

      {conversations.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">No conversations yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Message a seller from any listing to start chatting.
          </p>
          <Link
            href="/browse"
            className="inline-flex mt-6 h-11 px-5 items-center rounded-xl bg-primary text-white font-semibold"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="block p-4 rounded-2xl border border-border bg-white hover:border-primary/30 transition"
            >
              <div className="flex justify-between gap-2">
                <p className="font-medium text-slate-900">
                  @{c.otherUser.username}
                </p>
                <span className="text-xs text-slate-400">
                  {new Date(c.lastMessageAt).toLocaleDateString()}
                </span>
              </div>
              {c.listing && (
                <p className="text-xs text-primary mt-0.5 truncate">
                  Re: {c.listing.title}
                </p>
              )}
              {c.lastMessage && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                  {c.lastMessage.content}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <p className="font-medium">Safety tip</p>
        <p className="mt-1">
          Never send BCH outside the official order flow. If someone asks you to pay differently, report them.
        </p>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
