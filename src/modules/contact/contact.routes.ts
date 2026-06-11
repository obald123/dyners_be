import { Router } from "express";
import { prisma } from "../../db/client";
import { validate, getValidated } from "../../middleware/validate";
import { contactLimiter } from "../../middleware/rateLimiters";
import { createContactMessageSchema, type CreateContactMessageInput } from "./contact.schemas";
import { notifyByEmail } from "./contact.service";

export const contactRouter = Router();

contactRouter.post(
  "/",
  contactLimiter,
  validate({ body: createContactMessageSchema }),
  async (req, res) => {
    const input = getValidated<CreateContactMessageInput>(req, "body");
    await prisma.contactMessage.create({ data: input });
    void notifyByEmail(input);
    res.status(201).json({ success: true });
  }
);
