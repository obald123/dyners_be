import { z } from "zod";
import { imageUrlSchema } from "../../lib/schemas";
import { SCHOOL_DAYS, SCHOOL_MEALS, isSchoolDay, isSchoolMeal } from "./schoolMenu";

export const menuCategories = ["weddings", "corporate", "school", "private", "delivery"] as const;

const menuItemBaseSchema = z.object({
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

function validateSchoolMenuFields(
  data: { category?: string; course?: string; description?: string },
  ctx: z.RefinementCtx
) {
  if (data.category !== "school") return;

  if (!data.course || !isSchoolDay(data.course)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "School menu items must use a weekday (Monday–Sunday) as course",
      path: ["course"],
    });
  }

  if (!data.description || !isSchoolMeal(data.description)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "School menu items must use Breakfast, Lunch, or Dinner as description",
      path: ["description"],
    });
  }
}

export const createMenuItemSchema = menuItemBaseSchema.superRefine(validateSchoolMenuFields);
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = menuItemBaseSchema.partial().superRefine((data, ctx) => {
  if (data.category === "school" || (data.course && isSchoolDay(data.course)) || (data.description && isSchoolMeal(data.description))) {
    validateSchoolMenuFields(
      {
        category: data.category ?? "school",
        course: data.course,
        description: data.description,
      },
      ctx
    );
  }
});
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export const menuQuerySchema = z.object({
  category: z.enum(menuCategories).optional(),
});
export type MenuQuery = z.infer<typeof menuQuerySchema>;

export { SCHOOL_DAYS, SCHOOL_MEALS };
