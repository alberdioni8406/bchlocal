import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const MAX_LISTING_IMAGES = 5;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function extensionForType(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function publicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    ""
  ).replace(/\/$/, "");
}

/** Store one image file. Prefer Cloudinary when configured; otherwise local public/uploads. */
export async function storeListingImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Use JPEG, PNG, WebP, or GIF.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 4MB).");
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (cloudName && preset) {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", preset);
    form.append("folder", "bch-local/listings");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Cloudinary upload failed:", text);
      throw new Error("Cloud image upload failed");
    }
    const data = (await res.json()) as { secure_url?: string; url?: string };
    const url = data.secure_url || data.url;
    if (!url) throw new Error("Cloud image upload returned no URL");
    return url;
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${extensionForType(file.type)}`;
  const dir = path.join(process.cwd(), "public", "uploads", "listings");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  const base = publicBaseUrl();
  return `${base}/uploads/listings/${name}`;
}
