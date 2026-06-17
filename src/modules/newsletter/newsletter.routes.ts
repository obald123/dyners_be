import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../../db/client";
import { validate, getValidated } from "../../middleware/validate";
import { subscribeSchema, type SubscribeInput } from "./newsletter.schemas";
import { sendWelcomeEmail, notifyAdminOfNewSubscriber } from "./newsletter.service";
import { env } from "../../config/env";

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many subscription attempts. Try again later." },
});

export const newsletterRouter = Router();

newsletterRouter.post(
  "/subscribe",
  subscribeLimiter,
  validate({ body: subscribeSchema }),
  async (req, res) => {
    const { email } = getValidated<SubscribeInput>(req, "body");

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const settings = await prisma.siteSettings.findUnique({
      where: { id: "site" },
      select: { email: true },
    });

    void sendWelcomeEmail(email);
    void notifyAdminOfNewSubscriber(email, settings?.email ?? env.CONTACT_TO_EMAIL);

    res.status(201).json({ success: true });
  }
);
