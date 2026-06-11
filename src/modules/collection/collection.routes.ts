import { Router } from "express";
import { prisma } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validate, getValidated } from "../../middleware/validate";
import { idParamSchema, type IdParam } from "../../lib/schemas";
import { logActivity } from "../../lib/activity";
import { destroyImage } from "../../lib/cloudinary";
import {
  createCollectionItemSchema,
  updateCollectionItemSchema,
  collectionQuerySchema,
  type CreateCollectionItemInput,
  type UpdateCollectionItemInput,
  type CollectionQuery,
} from "./collection.schemas";

export const collectionRouter = Router();

collectionRouter.get("/", validate({ query: collectionQuerySchema }), async (req, res) => {
  const { category } = getValidated<CollectionQuery>(req, "query");
  const items = await prisma.collectionItem.findMany({
    where: { published: true, ...(category ? { category } : {}) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, image: true, category: true },
  });
  res.json(items);
});

collectionRouter.get("/all", requireAuth, async (_req, res) => {
  res.json(await prisma.collectionItem.findMany({ orderBy: { name: "asc" } }));
});

collectionRouter.post(
  "/",
  requireAuth,
  validate({ body: createCollectionItemSchema }),
  async (req, res) => {
    const input = getValidated<CreateCollectionItemInput>(req, "body");
    const created = await prisma.collectionItem.create({ data: input });
    logActivity(req.adminId, `Added collection item ${created.name}`, "collection", created.id);
    res.status(201).json(created);
  }
);

collectionRouter.patch(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema, body: updateCollectionItemSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const input = getValidated<UpdateCollectionItemInput>(req, "body");

    const existing = await prisma.collectionItem.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.collectionItem.update({ where: { id }, data: input });
    if (input.publicId && existing.publicId && input.publicId !== existing.publicId) {
      destroyImage(existing.publicId);
    }

    logActivity(req.adminId, `Updated collection item ${updated.name}`, "collection", id);
    res.json(updated);
  }
);

collectionRouter.delete(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const deleted = await prisma.collectionItem.delete({ where: { id } });
    destroyImage(deleted.publicId);
    logActivity(req.adminId, `Deleted collection item ${deleted.name}`, "collection", id);
    res.status(204).end();
  }
);
