import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireRole, AuthError } from "@/backend/lib/authz";
import { rateLimitResponse } from "@/backend/lib/rate-limit";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Verify file is actually the type its header claims by reading magic bytes. */
function detectMimeFromBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("CAFE_OWNER", "SUPER_ADMIN");

    const limited = await rateLimitResponse(`upload:${user.id}`, { max: 30, windowMs: 60 * 1000 });
    if (limited) return limited;

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_SIZE * 1.1) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 5 MB." },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 5 MB." },
        { status: 413 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic-byte check: actual content must match a whitelisted image type.
    const detected = detectMimeFromBytes(buffer);
    if (!detected || !ALLOWED_TYPES.includes(detected)) {
      return NextResponse.json(
        { success: false, error: "File contents are not a valid image" },
        { status: 400 }
      );
    }
    if (detected !== file.type) {
      return NextResponse.json(
        { success: false, error: "File extension does not match contents" },
        { status: 400 }
      );
    }

    const base64 = `data:${detected};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(base64, {
      folder: "qr-ordering/menu",
      // Force image-only resource type; never allow raw upload paths.
      resource_type: "image",
      transformation: [
        { width: 800, height: 800, crop: "limit", quality: "auto", fetch_format: "auto" },
      ],
    });

    return NextResponse.json({ success: true, data: { imageUrl: result.secure_url } });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Upload error:", (e as Error)?.message);
    }
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
