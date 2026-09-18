"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, Star, Trash2 } from "lucide-react";

const CATEGORIES = [
  { slug: "electronics", name: "Electronics" },
  { slug: "phones", name: "Phones" },
  { slug: "computers", name: "Computers" },
  { slug: "vehicles", name: "Vehicles" },
  { slug: "fashion", name: "Fashion" },
  { slug: "home", name: "Home" },
  { slug: "food", name: "Food" },
  { slug: "services", name: "Services" },
  { slug: "jobs", name: "Jobs" },
  { slug: "digital-goods", name: "Digital Goods" },
  { slug: "other", name: "Other" },
];

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "FOR_PARTS", label: "For parts" },
];

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

export default function EditListingPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    categorySlug: "electronics",
    condition: "GOOD",
    priceMzn: "",
    locationCity: "Maputo",
    locationArea: "",
    deliveryOption: "BOTH",
    acceptsBch: true,
    status: "ACTIVE",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/signin?callbackUrl=/listing/${id}/edit`);
    }
  }, [status, router, id]);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setForm({
          title: d.title || "",
          description: d.description || "",
          categorySlug: d.category?.slug || "electronics",
          condition: d.condition || "GOOD",
          priceMzn: String(d.priceMzn ?? ""),
          locationCity: d.locationCity || "Maputo",
          locationArea: d.locationArea || "",
          deliveryOption: d.deliveryOption || "BOTH",
          acceptsBch: d.acceptsBch !== false,
          status: d.status || "ACTIVE",
        });
        setImageUrls((d.images || []).map((img: { url: string }) => img.url));
      })
      .catch(() => setError("Failed to load listing"))
      .finally(() => setLoading(false));
  }, [id]);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    const remaining = 5 - imageUrls.length;
    const batch = Array.from(files).slice(0, remaining);
    if (!batch.length) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      batch.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setImageUrls((prev) => [...prev, ...(data.urls || [])]);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          priceMzn: parseFloat(form.priceMzn),
          categorySlug: form.categorySlug,
          condition: form.condition,
          locationCity: form.locationCity,
          locationArea: form.locationArea || null,
          deliveryOption: form.deliveryOption,
          acceptsBch: form.acceptsBch,
          status: form.status,
          imageUrls,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to save");
        return;
      }
      router.push(`/listing/${id}`);
    } catch {
      setError("Unable to save listing");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/listing/${id}`} className="p-2 -ml-2 rounded-xl hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Edit listing</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="font-medium">Photos</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {imageUrls.map((url, i) => (
              <div key={url + i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 text-[10px] bg-primary text-white px-1.5 rounded">
                    Main
                  </span>
                )}
                <div className="absolute bottom-1 right-1 flex gap-1">
                  {i !== 0 && (
                    <button
                      type="button"
                      className="p-1 bg-white/90 rounded"
                      onClick={() =>
                        setImageUrls((prev) => {
                          const next = [...prev];
                          const [item] = next.splice(i, 1);
                          next.unshift(item);
                          return next;
                        })
                      }
                    >
                      <Star className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1 bg-white/90 rounded text-red-600"
                    onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {imageUrls.length < 5 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer">
                <Camera className="w-6 h-6 text-slate-400" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    onPickFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="font-medium">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-border"
          />
        </div>
        <div>
          <label className="font-medium">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-border"
          />
        </div>
        <div>
          <label className="font-medium">Price (MZN)</label>
          <input
            type="number"
            value={form.priceMzn}
            onChange={(e) => setForm({ ...form, priceMzn: e.target.value })}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-border"
          />
        </div>
        <div>
          <label className="font-medium">Category</label>
          <select
            value={form.categorySlug}
            onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-border bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-medium">Condition</label>
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-border bg-white"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-medium">City</label>
          <select
            value={form.locationCity}
            onChange={(e) => setForm({ ...form, locationCity: e.target.value })}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-border bg-white"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-medium">Area</label>
          <input
            value={form.locationArea}
            onChange={(e) => setForm({ ...form, locationArea: e.target.value })}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-border"
          />
        </div>
        <div>
          <label className="font-medium">Delivery</label>
          <select
            value={form.deliveryOption}
            onChange={(e) => setForm({ ...form, deliveryOption: e.target.value })}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-border bg-white"
          >
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
            <option value="BOTH">Pickup or delivery</option>
          </select>
        </div>
        <div>
          <label className="font-medium">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-border bg-white"
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="SOLD">Sold</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-6 w-full h-12 rounded-xl bg-primary text-white font-semibold disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
