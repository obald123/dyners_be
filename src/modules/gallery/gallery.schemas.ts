import { z } from "zod";
import { imageUrlSchema } from "../../lib/schemas";

export const galleryCategories = ["weddings", "corporate", "private", "school", "video"] as const;

export const createGalleryImageSchema = z.object({
  src: z.string().max(2000).refine(
    (url) => url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//")),
    "URL must be https or a server-relative path"
  ),
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

// Keep imageUrlSchema re-export so other modules aren't broken
export { imageUrlSchema };
