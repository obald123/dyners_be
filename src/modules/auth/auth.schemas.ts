import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().max(254).optional(),
    currentPassword: z.string().min(8).max(128).optional(),
    newPassword: z
      .string()
      .min(10, "New password must be at least 10 characters")
      .max(128)
      .optional(),
  })
  .refine((data) => !data.newPassword || data.currentPassword, {
    message: "currentPassword is required to set a new password",
    path: ["currentPassword"],
  });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
