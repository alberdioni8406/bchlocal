"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Send } from "lucide-react";

type Msg = {
  id: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  senderUsername?: string;
};

export default function ConversationPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [listing, setListing] = useState<{ id: string; title: string } | null>(null);
  const [otherName, setOtherName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/messages/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setMessages(d.messages || []);
        setListing(d.listing);
        const other = d.buyer?.id === d.messages?.[0]?.senderId ? d.seller : d.buyer;
        // simpler: pick non-self
        setOtherName(d.seller?.username || d.buyer?.username || "");
      })
      .catch(() => {});
  }, [status, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, data]);
        setText("");
      }
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="px-4 py-3 border-b border-border bg-white sticky top-14 z-10">
        <Link href="/messages" className="inline-flex items-center gap-1 text-sm text-slate-600 mb-1">
          <ChevronLeft className="w-4 h-4" /> Messages
        </Link>
        <p className="font-semibold text-slate-900">@{otherName || "Conversation"}</p>
        {listing && (
          <Link href={`/listing/${listing.id}`} className="text-xs text-primary truncate block">
            Re: {listing.title}
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                m.isMine
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-muted text-slate-900 rounded-bl-md"
              }`}
            >
              {m.content}
              <p className={`text-[10px] mt-1 ${m.isMine ? "text-green-100" : "text-slate-400"}`}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="p-3 border-t border-border bg-white flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-11 px-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
