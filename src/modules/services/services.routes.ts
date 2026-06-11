import { Router } from "express";
import { prisma } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validate, getValidated } from "../../middleware/validate";
import { idParamSchema, type IdParam } from "../../lib/schemas";
import { logActivity } from "../../lib/activity";
import { destroyImage } from "../../lib/cloudinary";
import {
  createServiceSchema,
  updateServiceSchema,
  serviceQuerySchema,
  type CreateServiceInput,
  type UpdateServiceInput,
  type ServiceQuery,
} from "./services.schemas";

export const servicesRouter = Router();

servicesRouter.get("/", validate({ query: serviceQuerySchema }), async (req, res) => {
  const { tab } = getValidated<ServiceQuery>(req, "query");
  const items = await prisma.service.findMany({
    where: { published: true, ...(tab ? { tab } : {}) },
    orderBy: [{ tab: "asc" }, { sortOrder: "asc" }],
    select: { id: true, tab: true, title: true, description: true, image: true, included: true },
  });
  res.json(items);
});

servicesRouter.get("/all", requireAuth, async (_req, res) => {
  res.json(
    await prisma.service.findMany({ orderBy: [{ tab: "asc" }, { sortOrder: "asc" }] })
  );
});

servicesRouter.post("/", requireAuth, validate({ body: createServiceSchema }), async (req, res) => {
  const input = getValidated<CreateServiceInput>(req, "body");
  const created = await prisma.service.create({ data: input });
  logActivity(req.adminId, `Added service ${created.title}`, "service", created.id);
  res.status(201).json(created);
});

servicesRouter.patch(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema, body: updateServiceSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const input = getValidated<UpdateServiceInput>(req, "body");

    const existing = await prisma.service.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.service.update({ where: { id }, data: input });
    if (input.publicId && existing.publicId && input.publicId !== existing.publicId) {
      destroyImage(existing.publicId);
    }

    logActivity(req.adminId, `Updated service ${updated.title}`, "service", id);
    res.json(updated);
  }
);

servicesRouter.delete(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const deleted = await prisma.service.delete({ where: { id } });
    destroyImage(deleted.publicId);
    logActivity(req.adminId, `Deleted service ${deleted.title}`, "service", id);
    res.status(204).end();
  }
);
