import { Router } from "express";
import { prisma } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validate, getValidated } from "../../middleware/validate";
import { idParamSchema, type IdParam } from "../../lib/schemas";
import { logActivity } from "../../lib/activity";
import { destroyImage } from "../../lib/cloudinary";
import {
  createGalleryImageSchema,
  updateGalleryImageSchema,
  galleryQuerySchema,
  type CreateGalleryImageInput,
  type UpdateGalleryImageInput,
  type GalleryQuery,
} from "./gallery.schemas";

export const galleryRouter = Router();

galleryRouter.get("/", validate({ query: galleryQuerySchema }), async (req, res) => {
  const { category } = getValidated<GalleryQuery>(req, "query");
  const items = await prisma.galleryImage.findMany({
    where: { published: true, ...(category ? { category } : {}) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, src: true, alt: true, category: true },
  });
  res.json(items);
});

galleryRouter.get("/all", requireAuth, async (_req, res) => {
  res.json(
    await prisma.galleryImage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] })
  );
});

galleryRouter.post(
  "/",
  requireAuth,
  validate({ body: createGalleryImageSchema }),
  async (req, res) => {
    const input = getValidated<CreateGalleryImageInput>(req, "body");
    const created = await prisma.galleryImage.create({ data: input });
    logActivity(req.adminId, `Added ${created.category} gallery image`, "gallery", created.id);
    res.status(201).json(created);
  }
);

galleryRouter.patch(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema, body: updateGalleryImageSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const input = getValidated<UpdateGalleryImageInput>(req, "body");

    const existing = await prisma.galleryImage.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.galleryImage.update({ where: { id }, data: input });
    if (input.publicId && existing.publicId && input.publicId !== existing.publicId) {
      destroyImage(existing.publicId);
    }

    logActivity(req.adminId, `Updated ${updated.category} gallery image`, "gallery", id);
    res.json(updated);
  }
);

galleryRouter.delete(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const deleted = await prisma.galleryImage.delete({ where: { id } });
    destroyImage(deleted.publicId);
    logActivity(req.adminId, `Deleted ${deleted.category} gallery image`, "gallery", id);
    res.status(204).end();
  }
);
