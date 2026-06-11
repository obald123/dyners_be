import { z } from "zod";
import { imageUrlSchema } from "../../lib/schemas";

export const menuCategories = ["weddings", "corporate", "school", "private", "delivery"] as const;

export const createMenuItemSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  price: z.number().int().min(0).max(100_000_000).optional(),
  image: imageUrlSchema.optional(),
  publicId: z.string().max(200).optional(),
  category: z.enum(menuCategories),
  course: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = createMenuItemSchema.partial();
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export const menuQuerySchema = z.object({
  category: z.enum(menuCategories).optional(),
});
export type MenuQuery = z.infer<typeof menuQuerySchema>;
