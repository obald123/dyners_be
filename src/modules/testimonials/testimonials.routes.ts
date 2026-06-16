import { Router } from "express";
import { prisma } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validate, getValidated } from "../../middleware/validate";
import { idParamSchema, type IdParam } from "../../lib/schemas";
import { logActivity } from "../../lib/activity";
import {
  createTestimonialSchema,
  updateTestimonialSchema,
  type CreateTestimonialInput,
  type UpdateTestimonialInput,
} from "./testimonials.schemas";

export const testimonialsRouter = Router();

testimonialsRouter.get("/", async (_req, res) => {
  const items = await prisma.testimonial.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, role: true, quote: true, rating: true, avatarUrl: true, imageUrl: true },
  });
  res.json(items);
});

testimonialsRouter.get("/all", requireAuth, async (_req, res) => {
  res.json(await prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } }));
});

testimonialsRouter.post(
  "/",
  requireAuth,
  validate({ body: createTestimonialSchema }),
  async (req, res) => {
    const input = getValidated<CreateTestimonialInput>(req, "body");
    const created = await prisma.testimonial.create({ data: input });
    logActivity(req.adminId, `Added testimonial from ${created.name}`, "testimonial", created.id);
    res.status(201).json(created);
  }
);

testimonialsRouter.patch(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema, body: updateTestimonialSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const input = getValidated<UpdateTestimonialInput>(req, "body");
    const updated = await prisma.testimonial.update({ where: { id }, data: input });
    logActivity(req.adminId, `Updated testimonial from ${updated.name}`, "testimonial", id);
    res.json(updated);
  }
);

testimonialsRouter.delete(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const deleted = await prisma.testimonial.delete({ where: { id } });
    logActivity(req.adminId, `Deleted testimonial from ${deleted.name}`, "testimonial", id);
    res.status(204).end();
  }
);
