import { z } from "zod";
import { imageUrlSchema } from "../../lib/schemas";

export const serviceTabs = ["catering", "planning", "rentals"] as const;

export const createServiceSchema = z.object({
  tab: z.enum(serviceTabs),
  title: z.string().min(2).max(150),
  description: z.string().min(5).max(500),
  image: imageUrlSchema.optional(),
  publicId: z.string().max(200).optional(),
  included: z.array(z.string().min(2).max(200)).max(12).default([]),
  sortOrder: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const serviceQuerySchema = z.object({
  tab: z.enum(serviceTabs).optional(),
});
export type ServiceQuery = z.infer<typeof serviceQuerySchema>;
