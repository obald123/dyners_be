import { z } from "zod";
import { imageUrlSchema } from "../../lib/schemas";

export const galleryCategories = ["weddings", "corporate", "private", "school"] as const;

export const createGalleryImageSchema = z.object({
  src: imageUrlSchema,
  publicId: z.string().max(200).optional(),
  alt: z.string().min(3).max(200),
  category: z.enum(galleryCategories),
  sortOrder: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});
export type CreateGalleryImageInput = z.infer<typeof createGalleryImageSchema>;

export const updateGalleryImageSchema = createGalleryImageSchema.partial();
export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageSchema>;

export const galleryQuerySchema = z.object({
  category: z.enum(galleryCategories).optional(),
});
export type GalleryQuery = z.infer<typeof galleryQuerySchema>;
