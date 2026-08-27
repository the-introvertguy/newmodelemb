import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCloudinaryUploadSignature } from "@/lib/cloudinary";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const folder = body.folder || "new_model_embroidery";

    const signatureData = generateCloudinaryUploadSignature(folder);
    return NextResponse.json(signatureData);
  } catch (error: any) {
    console.error("[Upload Signature Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate upload signature" },
      { status: 500 }
    );
  }
}
