import { z } from "zod";
import { imageUrlSchema } from "../../lib/schemas";

export const collectionCategories = ["tents", "chairs", "tables", "linens", "lighting", "decor"] as const;

export const createCollectionItemSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(300).optional(),
  image: imageUrlSchema,
  publicId: z.string().max(200).optional(),
  category: z.enum(collectionCategories),
  published: z.boolean().default(true),
});
export type CreateCollectionItemInput = z.infer<typeof createCollectionItemSchema>;

export const updateCollectionItemSchema = createCollectionItemSchema.partial();
export type UpdateCollectionItemInput = z.infer<typeof updateCollectionItemSchema>;

export const collectionQuerySchema = z.object({
  category: z.enum(collectionCategories).optional(),
});
export type CollectionQuery = z.infer<typeof collectionQuerySchema>;
