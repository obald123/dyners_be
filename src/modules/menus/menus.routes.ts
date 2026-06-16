import { Router } from "express";
import { prisma } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validate, getValidated } from "../../middleware/validate";
import { idParamSchema, type IdParam } from "../../lib/schemas";
import { logActivity } from "../../lib/activity";
import { destroyImage } from "../../lib/cloudinary";
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  menuQuerySchema,
  type CreateMenuItemInput,
  type UpdateMenuItemInput,
  type MenuQuery,
} from "./menus.schemas";

export const menusRouter = Router();

menusRouter.get("/", validate({ query: menuQuerySchema }), async (req, res) => {
  const { category } = getValidated<MenuQuery>(req, "query");
  const items = await prisma.menuItem.findMany({
    where: { published: true, ...(category ? { category } : {}) },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, description: true, price: true, image: true, category: true, course: true, sortOrder: true },
  });
  res.json(items);
});

menusRouter.get("/all", requireAuth, async (_req, res) => {
  res.json(
    await prisma.menuItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] })
  );
});

menusRouter.post("/", requireAuth, validate({ body: createMenuItemSchema }), async (req, res) => {
  const input = getValidated<CreateMenuItemInput>(req, "body");
  const created = await prisma.menuItem.create({ data: input });
  logActivity(req.adminId, `Added menu item ${created.name}`, "menu", created.id);
  res.status(201).json(created);
});

menusRouter.patch(
  "/:id",
  requireAuth,
  validate({ params: idParamSchema, body: updateMenuItemSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const input = getValidated<UpdateMenuItemInput>(req, "body");

    const existing = await prisma.menuItem.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.menuItem.update({ where: { id }, data: input });
    if (input.publicId && existing.publicId && input.publicId !== existing.publicId) {
      destroyImage(existing.publicId);
    }

    logActivity(req.adminId, `Updated menu item ${updated.name}`, "menu", id);
    res.json(updated);
  }
);

menusRouter.delete("/:id", requireAuth, validate({ params: idParamSchema }), async (req, res) => {
  const { id } = getValidated<IdParam>(req, "params");
  const deleted = await prisma.menuItem.delete({ where: { id } });
  destroyImage(deleted.publicId);
  logActivity(req.adminId, `Deleted menu item ${deleted.name}`, "menu", id);
  res.status(204).end();
});
