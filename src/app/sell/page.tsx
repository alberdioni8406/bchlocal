"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, ChevronRight, Star, Trash2, ArrowLeft, ArrowRight } from "lucide-react";

type DraftImage = { url: string; preview: string };

const STEPS = [
  "Photos",
  "Title",
  "Description",
  "Category",
  "Condition",
  "Price",
  "Location",
  "Delivery",
  "Payment",
  "Preview",
];

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

const CITIES = ["Maputo", "Matola", "Beira", "Nampula", "Chimoio", "Nacala", "Quelimane", "Tete", "Pemba", "Other"];

export default function SellPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);

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
  });
  const [images, setImages] = useState<DraftImage[]>([]);
  const [uploading, setUploading] = useState(false);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const remaining = 5 - images.length;
    const batch = Array.from(files).slice(0, remaining);
    if (!batch.length) {
      setError("Maximum 5 photos per listing");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      batch.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      const urls: string[] = data.urls || (data.url ? [data.url] : []);
      setImages((prev) => [
        ...prev,
        ...urls.map((url, i) => ({
          url,
          preview: URL.createObjectURL(batch[i] || batch[0]),
        })),
      ]);
    } catch {
      setError("Upload failed. Try a smaller JPEG or PNG.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function moveImage(index: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  function setPrimary(index: number) {
    setImages((prev) => {
      if (index === 0) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  }

  if (status === "unauthenticated") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold">Sign in to sell</h1>
        <p className="mt-2 text-slate-600">Create an account to post listings.</p>
        <Link
          href="/auth/signin?callbackUrl=/sell"
          className="inline-flex mt-6 h-12 px-6 items-center rounded-xl bg-primary text-white font-semibold"
        >
          Sign in
        </Link>
      </div>
    );
  }

  async function publish() {
    setError("");
    setPublishing(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || form.title,
          priceMzn: parseFloat(form.priceMzn),
          categorySlug: form.categorySlug,
          condition: form.condition,
          locationCity: form.locationCity,
          locationArea: form.locationArea || undefined,
          deliveryOption: form.deliveryOption,
          acceptsBch: true,
          imageUrls: images.map((img) => img.url),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to publish");
        setPublishing(false);
        return;
      }
      setPublishedId(data.id);
    } catch {
      setError("Something went wrong");
    } finally {
      setPublishing(false);
    }
  }

  async function promote(type: "BOOST" | "FEATURED" | "TOP_SPOT") {
    if (!publishedId) return;
    setPromoting(true);
    try {
      const res = await fetch("/api/revenue/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: publishedId, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed");
        return;
      }
      if (data.isDemo || data.status === "ACTIVE") {
        alert(data.message || "Promotion activated (demo)");
        router.push(`/listing/${publishedId}`);
        return;
      }
      // Real path: show payment instructions
      const params = new URLSearchParams({
        promotionId: data.promotionId,
        type: data.type,
        priceMzn: String(data.priceMzn),
        priceBch: String(data.priceBch || ""),
        address: data.bchAddress || "",
        uri: data.paymentUri || "",
        listingId: publishedId,
      });
      router.push(`/promotions/pay?${params.toString()}`);
    } catch {
      alert("Error");
    } finally {
      setPromoting(false);
    }
  }

  if (publishedId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Your listing is live</h1>
        <p className="mt-2 text-slate-600">Want more people to see it?</p>

        <div className="mt-8 space-y-3 text-left">
          <button
            disabled={promoting}
            onClick={() => promote("BOOST")}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-white hover:border-primary/40 transition disabled:opacity-50"
          >
            <div>
              <p className="font-semibold">🚀 Boost</p>
              <p className="text-sm text-slate-500">Higher position · 3 days</p>
            </div>
            <span className="font-bold text-primary">100 MZN</span>
          </button>
          <button
            disabled={promoting}
            onClick={() => promote("FEATURED")}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-white hover:border-primary/40 transition disabled:opacity-50"
          >
            <div>
              <p className="font-semibold">⭐ Featured</p>
              <p className="text-sm text-slate-500">Featured placement · 7 days</p>
            </div>
            <span className="font-bold text-primary">250 MZN</span>
          </button>
          <button
            disabled={promoting}
            onClick={() => promote("TOP_SPOT")}
            className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-primary bg-green-50 hover:bg-green-100 transition disabled:opacity-50"
          >
            <div>
              <p className="font-semibold">🔥 Top Spot</p>
              <p className="text-sm text-slate-500">Premium + badge · 14 days</p>
            </div>
            <span className="font-bold text-primary">500 MZN</span>
          </button>
        </div>

        <Link
          href={`/listing/${publishedId}`}
          className="inline-block mt-8 text-sm font-medium text-slate-600 underline"
        >
          Skip for now · View listing
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900">Sell Something</h1>
      <p className="text-sm text-slate-500 mt-1">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="mt-8 space-y-4">
        {step === 0 && (
          <div>
            <p className="font-medium mb-3">Upload photos</p>
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {images.map((img, i) => (
                  <div key={img.url + i} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex gap-1 justify-end">
                      <button type="button" onClick={() => moveImage(i, -1)} className="p-1.5 rounded-lg bg-white/90" aria-label="Move left">
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => moveImage(i, 1)} className="p-1.5 rounded-lg bg-white/90" aria-label="Move right">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      {i !== 0 && (
                        <button type="button" onClick={() => setPrimary(i)} className="p-1.5 rounded-lg bg-white/90" aria-label="Make primary">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button type="button" onClick={() => removeImage(i)} className="p-1.5 rounded-lg bg-white/90 text-red-600" aria-label="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {images.length < 5 && (
              <label className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-primary/50 transition cursor-pointer">
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">
                  {uploading ? "Uploading…" : "Add photos"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
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
            <p className="mt-2 text-xs text-slate-400">
              Up to 5 photos. First photo is the primary marketplace image. You can publish without photos.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <label className="font-medium">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. iPhone 13 128GB"
              className="mt-2 w-full h-12 px-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              placeholder="Describe your item or service..."
              className="mt-2 w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="font-medium mb-2 block">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setForm({ ...form, categorySlug: c.slug })}
                  className={`h-11 rounded-xl border text-sm font-medium ${
                    form.categorySlug === c.slug
                      ? "border-primary bg-green-50 text-primary"
                      : "border-border bg-white"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <label className="font-medium mb-2 block">Condition</label>
            <div className="space-y-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, condition: c.value })}
                  className={`w-full h-11 rounded-xl border text-sm font-medium text-left px-4 ${
                    form.condition === c.value
                      ? "border-primary bg-green-50 text-primary"
                      : "border-border bg-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <label className="font-medium">Price (MZN)</label>
            <input
              type="number"
              value={form.priceMzn}
              onChange={(e) => setForm({ ...form, priceMzn: e.target.value })}
              placeholder="28000"
              className="mt-2 w-full h-12 px-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {form.priceMzn && (
              <p className="mt-2 text-sm text-slate-500">≈ BCH equivalent shown after publish</p>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <label className="font-medium">City</label>
              <select
                value={form.locationCity}
                onChange={(e) => setForm({ ...form, locationCity: e.target.value })}
                className="mt-2 w-full h-12 px-4 rounded-xl border border-border bg-white"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium">Area (optional)</label>
              <input
                value={form.locationArea}
                onChange={(e) => setForm({ ...form, locationArea: e.target.value })}
                placeholder="e.g. Machava"
                className="mt-2 w-full h-12 px-4 rounded-xl border border-border"
              />
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <label className="font-medium mb-2 block">Pickup / Delivery</label>
            {["PICKUP", "DELIVERY", "BOTH"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setForm({ ...form, deliveryOption: opt })}
                className={`w-full h-11 mb-2 rounded-xl border text-sm font-medium ${
                  form.deliveryOption === opt
                    ? "border-primary bg-green-50 text-primary"
                    : "border-border bg-white"
                }`}
              >
                {opt === "BOTH" ? "Pickup or delivery" : opt.charAt(0) + opt.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        )}

        {step === 8 && (
          <div>
            <p className="font-medium mb-3">Payment methods</p>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-primary bg-green-50">
              <input type="checkbox" checked readOnly className="w-5 h-5" />
              <span className="font-medium">Bitcoin Cash ✓</span>
            </label>
            <p className="mt-2 text-xs text-slate-500">
              Buyers pay you directly in BCH. BCH Local never holds your funds.
            </p>
          </div>
        )}

        {step === 9 && (
          <div className="p-4 rounded-2xl border border-border bg-white space-y-2 text-sm">
            {images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0].preview || images[0].url} alt="" className="w-full aspect-[4/3] object-cover rounded-xl mb-2" />
            )}
            <p className="font-semibold text-lg">{form.title || "Untitled"}</p>
            <p className="text-primary font-bold">
              {form.priceMzn
                ? new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 }).format(Number(form.priceMzn))
                : "—"}
            </p>
            <p className="text-slate-600">{form.locationCity}</p>
            <p className="text-slate-500 line-clamp-3">{form.description || "No description"}</p>
            <p className="text-xs text-slate-400">
              {form.condition} · {form.categorySlug} · BCH ✓
            </p>
          </div>
        )}
      </div>

      <div className="mt-10 flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="h-12 px-5 rounded-xl border border-border font-medium"
          >
            Back
          </button>
        )}
        <button
          disabled={publishing || (step === 1 && form.title.length < 3) || (step === 5 && !form.priceMzn)}
          onClick={() => {
            if (step < STEPS.length - 1) setStep((s) => s + 1);
            else publish();
          }}
          className="flex-1 h-12 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {publishing ? "Publishing..." : step === STEPS.length - 1 ? "Publish" : "Continue"}
          {!publishing && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
