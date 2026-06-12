import { Router } from "express";
import multer from "multer";
import argon2 from "argon2";
import { prisma } from "../../db/client";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth";
import { validate, getValidated } from "../../middleware/validate";
import { uploadLimiter } from "../../middleware/rateLimiters";
import { idParamSchema, type IdParam } from "../../lib/schemas";
import { BadRequestError, ConflictError, ForbiddenError } from "../../lib/errors";
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

const updateSettingsSchema = z.object({
  address: z.string().min(2).max(200),
  email: z.string().email().max(254),
  phone: z.string().min(3).max(30),
});
type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

const createAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  password: z.string().min(10).max(128),
  role: z.enum(["admin", "super_admin"]).default("admin"),
});
type CreateAdminInput = z.infer<typeof createAdminSchema>;

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

adminRouter.get("/settings", async (_req, res) => {
  const settings = await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: { id: "site" },
    select: { address: true, email: true, phone: true },
  });
  res.json(settings);
});

adminRouter.patch("/settings", validate({ body: updateSettingsSchema }), async (req, res) => {
  const input = getValidated<UpdateSettingsInput>(req, "body");
  const settings = await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: input,
    create: { id: "site", ...input },
    select: { address: true, email: true, phone: true },
  });
  logActivity(req.adminId, "Updated site contact settings", "settings", "site");
  res.json(settings);
});

adminRouter.get("/users", requireSuperAdmin, async (_req, res) => {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.json(admins);
});

adminRouter.post("/users", requireSuperAdmin, validate({ body: createAdminSchema }), async (req, res) => {
  const input = getValidated<CreateAdminInput>(req, "body");
  const existing = await prisma.admin.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new ConflictError("An admin with this email already exists.");

  const created = await prisma.admin.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  logActivity(req.adminId, `Created admin ${created.email}`, "admin", created.id);
  res.status(201).json(created);
});

adminRouter.delete("/users/:id", requireSuperAdmin, validate({ params: idParamSchema }), async (req, res) => {
  const { id } = getValidated<IdParam>(req, "params");
  if (id === req.adminId) throw new BadRequestError("You cannot delete your own admin account.");

  const target = await prisma.admin.findUniqueOrThrow({ where: { id } });
  if (target.role === "super_admin") {
    const superAdminCount = await prisma.admin.count({ where: { role: "super_admin" } });
    if (superAdminCount <= 1) {
      throw new ForbiddenError("At least one super admin must remain.");
    }
  }

  await prisma.admin.delete({ where: { id } });
  logActivity(req.adminId, `Deleted admin ${target.email}`, "admin", id);
  res.status(204).end();
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
