import { Router } from "express";
import { prisma } from "../../db/client";
import { validate, getValidated } from "../../middleware/validate";
import { contactLimiter } from "../../middleware/rateLimiters";
import { createContactMessageSchema, type CreateContactMessageInput } from "./contact.schemas";
import { notifyByEmail } from "./contact.service";

export const contactRouter = Router();

contactRouter.get("/settings", async (_req, res) => {
  const settings = await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: { id: "site" },
    select: { address: true, email: true, phone: true },
  });
  res.json(settings);
});

contactRouter.post(
  "/",
  contactLimiter,
  validate({ body: createContactMessageSchema }),
  async (req, res) => {
    const input = getValidated<CreateContactMessageInput>(req, "body");
    await prisma.contactMessage.create({ data: input });
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "site" },
      select: { email: true },
    });
    void notifyByEmail(input, settings?.email);
    res.status(201).json({ success: true });
  }
);
