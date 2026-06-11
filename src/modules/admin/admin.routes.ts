import { Router } from "express";
import multer from "multer";
import { prisma } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validate, getValidated } from "../../middleware/validate";
import { uploadLimiter } from "../../middleware/rateLimiters";
import { idParamSchema, type IdParam } from "../../lib/schemas";
import { BadRequestError } from "../../lib/errors";
import { uploadImage } from "../../lib/cloudinary";
import { logActivity } from "../../lib/activity";
import {
  updateMessageStatusSchema,
  messagesQuerySchema,
  type UpdateMessageStatusInput,
  type MessagesQuery,
} from "../contact/contact.schemas";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // First gate only — the real check is sharp's decode in uploadImage.
    if (!file.mimetype.startsWith("image/")) {
      cb(new BadRequestError("Only image uploads are allowed."));
      return;
    }
    cb(null, true);
  },
});

const uploadFolderSchema = z.object({
  folder: z.enum(["gallery", "collection", "services", "menus", "avatars"]).default("gallery"),
});

export const adminRouter = Router();
adminRouter.use(requireAuth);

adminRouter.get("/stats", async (_req, res) => {
  const [testimonials, galleryImages, menuItems, collectionItems, services, newMessages] =
    await prisma.$transaction([
      prisma.testimonial.count(),
      prisma.galleryImage.count(),
      prisma.menuItem.count(),
      prisma.collectionItem.count(),
      prisma.service.count(),
      prisma.contactMessage.count({ where: { status: "new" } }),
    ]);
  res.json({ testimonials, galleryImages, menuItems, collectionItems, services, newMessages });
});

adminRouter.get("/activity", async (_req, res) => {
  const items = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, entity: true, createdAt: true },
  });
  res.json(items);
});

adminRouter.get("/messages", validate({ query: messagesQuerySchema }), async (req, res) => {
  const { status, page, limit } = getValidated<MessagesQuery>(req, "query");
  const where = status ? { status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contactMessage.count({ where }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

adminRouter.patch(
  "/messages/:id",
  validate({ params: idParamSchema, body: updateMessageStatusSchema }),
  async (req, res) => {
    const { id } = getValidated<IdParam>(req, "params");
    const { status } = getValidated<UpdateMessageStatusInput>(req, "body");
    const updated = await prisma.contactMessage.update({ where: { id }, data: { status } });
    res.json(updated);
  }
);

adminRouter.delete("/messages/:id", validate({ params: idParamSchema }), async (req, res) => {
  const { id } = getValidated<IdParam>(req, "params");
  await prisma.contactMessage.delete({ where: { id } });
  logActivity(req.adminId, "Deleted contact message", "message", id);
  res.status(204).end();
});

adminRouter.post(
  "/uploads",
  uploadLimiter,
  upload.single("file"),
  validate({ query: uploadFolderSchema }),
  async (req, res) => {
    if (!req.file) throw new BadRequestError("No file provided (field name: file).");

    const { folder } = getValidated<z.infer<typeof uploadFolderSchema>>(req, "query");
    const uploaded = await uploadImage(req.file.buffer, folder);
    logActivity(req.adminId, `Uploaded image to ${folder}`, "upload", uploaded.publicId);
    res.status(201).json(uploaded);
  }
);
