import { z } from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });
export type IdParam = z.infer<typeof idParamSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

/** https URLs (Cloudinary) or server-relative paths (DB-stored fallback images). */
export const imageUrlSchema = z
  .string()
  .max(500)
  .refine(
    (url) =>
      url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//")),
    "Image URL must be https or a server-relative path"
  );
