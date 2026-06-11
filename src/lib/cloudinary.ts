import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import { env } from "../config/env";
import { prisma } from "../db/client";
import { BadRequestError } from "./errors";
import { logger } from "./logger";

const DB_PUBLIC_ID_PREFIX = "db:";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function cloudinaryConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Re-encodes the buffer to WebP via sharp — this both verifies the file is a
 * real image (decode fails otherwise) and strips any embedded payloads/EXIF —
 * then uploads it to Cloudinary. If Cloudinary is unconfigured or the upload
 * fails, the image is stored in the database instead and served from the API.
 */
export async function uploadImage(buffer: Buffer, folder: string): Promise<UploadedImage> {
  let safeBuffer: Buffer;
  let width = 0;
  let height = 0;
  try {
    const sized = sharp(buffer)
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 });
    safeBuffer = await sized.toBuffer();
    const meta = await sharp(safeBuffer).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch {
    throw new BadRequestError("File is not a valid image.");
  }

  if (cloudinaryConfigured()) {
    try {
      return await uploadToCloudinary(safeBuffer, folder);
    } catch (err) {
      logger.warn({ err, folder }, "cloudinary upload failed — falling back to database storage");
    }
  }

  const stored = await prisma.storedImage.create({
    data: { data: new Uint8Array(safeBuffer), mime: "image/webp" },
  });
  return {
    url: `/api/v1/images/${stored.id}`,
    publicId: `${DB_PUBLIC_ID_PREFIX}${stored.id}`,
    width,
    height,
  };
}

function uploadToCloudinary(buffer: Buffer, folder: string): Promise<UploadedImage> {
  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `dyners/${folder}`, resource_type: "image" },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error("Empty Cloudinary response"));
          return;
        }
        resolve({
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          width: uploaded.width,
          height: uploaded.height,
        });
      }
    );
    stream.end(buffer);
  });
}

/** Best-effort removal of a replaced/deleted image (Cloudinary or DB-stored). */
export function destroyImage(publicId: string | null | undefined): void {
  if (!publicId) return;

  if (publicId.startsWith(DB_PUBLIC_ID_PREFIX)) {
    const id = publicId.slice(DB_PUBLIC_ID_PREFIX.length);
    void prisma.storedImage
      .delete({ where: { id } })
      .catch((err) => logger.warn({ err, publicId }, "stored image delete failed"));
    return;
  }

  if (!cloudinaryConfigured()) return;
  void cloudinary.uploader
    .destroy(publicId)
    .catch((err) => logger.warn({ err, publicId }, "cloudinary destroy failed"));
}
