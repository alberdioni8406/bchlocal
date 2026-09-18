"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, LogOut } from "lucide-react";

type ProfileData = {
  displayName: string;
  bio: string;
  locationCity: string;
  locationArea: string;
  phone: string;
  avatarUrl: string;
  bchAddress: string;
  defaultDelivery: string;
};

const CITIES = [
  "Maputo",
  "Matola",
  "Beira",
  "Nampula",
  "Chimoio",
  "Nacala",
  "Quelimane",
  "Tete",
  "Pemba",
  "Other",
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [form, setForm] = useState<ProfileData>({
    displayName: "",
    bio: "",
    locationCity: "Maputo",
    locationArea: "",
    phone: "",
    avatarUrl: "",
    bchAddress: "",
    defaultDelivery: "BOTH",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/profile/settings");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/me/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setEmail(data.email || "");
        setUsername(data.username || "");
        if (data.profile) {
          setForm({
            displayName: data.profile.displayName || data.username || "",
            bio: data.profile.bio || "",
            locationCity: data.profile.locationCity || "Maputo",
            locationArea: data.profile.locationArea || "",
            phone: data.profile.phone || "",
            avatarUrl: data.profile.avatarUrl || "",
            bchAddress: data.profile.bchAddress || "",
            defaultDelivery: data.profile.defaultDelivery || "BOTH",
          });
        } else {
          setForm((f) => ({
            ...f,
            displayName: data.username || session?.user?.name || "",
          }));
        }
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [status, router, session]);

  async function save() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName || undefined,
          bio: form.bio || null,
          locationCity: form.locationCity || null,
          locationArea: form.locationArea || null,
          phone: form.phone || null,
          avatarUrl: form.avatarUrl || null,
          bchAddress: form.bchAddress || null,
          defaultDelivery: form.defaultDelivery || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      setSuccess("Settings saved");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/profile"
          className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 text-green-700 text-sm">{success}</div>
      )}

      {/* Account */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Account
        </h2>
        <div className="space-y-4 rounded-2xl border border-border bg-white p-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <p className="mt-1 text-slate-900">{email || "—"}</p>
            <p className="text-xs text-slate-400 mt-0.5">Contact support to change email</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Username</label>
            <p className="mt-1 text-slate-900">@{username || "—"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Display name</label>
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="How others see you"
            />
          </div>
        </div>
      </section>

      {/* Profile */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Profile
        </h2>
        <div className="space-y-4 rounded-2xl border border-border bg-white p-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              maxLength={500}
              className="mt-1.5 w-full px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              placeholder="Tell buyers a bit about yourself"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">City</label>
            <select
              value={form.locationCity}
              onChange={(e) => setForm({ ...form, locationCity: e.target.value })}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Area / neighbourhood</label>
            <input
              value={form.locationArea}
              onChange={(e) => setForm({ ...form, locationArea: e.target.value })}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Sommerschield, Matola Cidade"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Phone (optional)</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="+258 ..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Profile image URL</label>
            <input
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              placeholder="https://..."
            />
            <p className="text-xs text-slate-400 mt-1">
              Paste an image URL for now. Upload support comes with listing images.
            </p>
          </div>
        </div>
      </section>

      {/* Selling */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Selling
        </h2>
        <div className="space-y-4 rounded-2xl border border-border bg-white p-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              BCH receiving address
            </label>
            <input
              value={form.bchAddress}
              onChange={(e) => setForm({ ...form, bchAddress: e.target.value })}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-sm"
              placeholder="bitcoincash:q..."
            />
            <p className="text-xs text-slate-400 mt-1">
              Your own wallet address. BCH Local never takes custody of funds. Buyers pay you
              directly.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Default delivery</label>
            <select
              value={form.defaultDelivery}
              onChange={(e) => setForm({ ...form, defaultDelivery: e.target.value })}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="PICKUP">Pickup only</option>
              <option value="DELIVERY">Delivery only</option>
              <option value="BOTH">Pickup or delivery</option>
            </select>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Security
        </h2>
        <div className="rounded-2xl border border-border bg-white p-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full h-12 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save settings
          </>
        )}
      </button>
    </div>
  );
}
