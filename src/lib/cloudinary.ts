import crypto from "crypto";

export interface CloudinarySignatureResult {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}

/**
 * Generates an HMAC-SHA256 signature for secure client-direct uploads to Cloudinary
 * Zero Vercel payload streaming or memory overhead
 */
export function generateCloudinaryUploadSignature(
  folder = "new_model_embroidery"
): CloudinarySignatureResult {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";

  // Cloudinary signature string format: alphabetical params concatenated with secret
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha256")
    .update(paramsToSign + apiSecret)
    .digest("hex");

  return {
    signature,
    timestamp,
    cloudName,
    apiKey,
    folder,
  };
}

export type ImageCropMode = "fill" | "fit" | "limit" | "thumb" | "scale";

export interface TransformImageOptions {
  width?: number;
  height?: number;
  crop?: ImageCropMode;
  quality?: "auto" | number;
  format?: "auto" | "webp" | "png" | "jpg";
}

/**
 * Creates dynamic on-the-fly optimized Cloudinary image URLs without making ANY Cloudinary API calls
 */
export function getOptimizedImageUrl(
  urlOrPublicId: string,
  options: TransformImageOptions = {}
): string {
  if (!urlOrPublicId) return "";

  // If it's already a full Cloudinary URL
  if (urlOrPublicId.includes("res.cloudinary.com")) {
    const parts = urlOrPublicId.split("/upload/");
    if (parts.length === 2) {
      const transforms: string[] = ["f_auto", "q_auto"];
      if (options.width) transforms.push(`w_${options.width}`);
      if (options.height) transforms.push(`h_${options.height}`);
      if (options.crop) transforms.push(`c_${options.crop}`);

      return `${parts[0]}/upload/${transforms.join(",")}/${parts[1]}`;
    }
    return urlOrPublicId;
  }

  // If it's a publicId
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  const transforms: string[] = ["f_auto", "q_auto"];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.crop) transforms.push(`c_${options.crop}`);

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(",")}/${urlOrPublicId}`;
}

/**
 * Destroys an image in Cloudinary via its REST destroy endpoint
 */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
    const apiKey = process.env.CLOUDINARY_API_KEY || "";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

    if (!cloudName || !apiKey || !apiSecret || !publicId) {
      return false;
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha256")
      .update(paramsToSign + apiSecret)
      .digest("hex");

    const formData = new URLSearchParams();
    formData.append("public_id", publicId);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data.result === "ok";
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return false;
  }
}
