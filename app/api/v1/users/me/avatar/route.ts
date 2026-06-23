import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/shared/auth/helpers";
import { writeAuditLog } from "@/shared/audit-log/service";
import { toErrorResponse } from "@/shared/api/handle";
import fs from "node:fs/promises";
import path from "node:path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/v1/users/me/avatar — upload an image and set it as the user's avatar.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No file provided" } },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Only JPEG, PNG, WebP, and GIF images are allowed" } },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "File must be under 5MB" } },
        { status: 400 },
      );
    }

    const ext = file.type === "image/jpeg" ? ".jpg" : file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".gif";
    const filename = `${user.id}-${Date.now()}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/avatars/${filename}`;

    // Update user's image field
    const { updateProfile } = await import("@/modules/users/service");
    await updateProfile(user.id!, { image: url });

    await writeAuditLog({ actorId: user.id!, action: "user.avatar.update", targetId: user.id! });

    return NextResponse.json({ image: url });
  } catch (err) {
    return toErrorResponse(err);
  }
}
