import { z } from "zod";
import { imageUrlSchema } from "../../lib/schemas";

export const createTestimonialSchema = z.object({
  name: z.string().min(2).max(100),
  role: z.string().max(100).optional(),
  quote: z.string().min(5).max(1000),
  rating: z.number().int().min(1).max(5).default(5),
  avatarUrl: imageUrlSchema.optional(),
  imageUrl: imageUrlSchema.optional(),
  published: z.boolean().default(true),
});
export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;

export const updateTestimonialSchema = createTestimonialSchema.partial();
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;
