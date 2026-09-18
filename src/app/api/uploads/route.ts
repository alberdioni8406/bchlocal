import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  MAX_LISTING_IMAGES,
  storeListingImage,
} from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const single = form.get("file");
    if (single instanceof File) files.push(single);

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }
    if (files.length > MAX_LISTING_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LISTING_IMAGES} images per listing` },
        { status: 400 }
      );
    }

    const urls: string[] = [];
    for (const file of files) {
      urls.push(await storeListingImage(file));
    }

    return NextResponse.json({ urls, url: urls[0] });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
