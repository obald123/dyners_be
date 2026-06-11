import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { corsOrigins } from "./config/env";
import { logger } from "./lib/logger";
import { globalLimiter } from "./middleware/rateLimiters";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { testimonialsRouter } from "./modules/testimonials/testimonials.routes";
import { galleryRouter } from "./modules/gallery/gallery.routes";
import { menusRouter } from "./modules/menus/menus.routes";
import { collectionRouter } from "./modules/collection/collection.routes";
import { servicesRouter } from "./modules/services/services.routes";
import { contactRouter } from "./modules/contact/contact.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { imagesRouter } from "./modules/images/images.routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1); // behind nginx/render/railway — needed for correct client IPs in rate limiting

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/no-origin requests (curl, health checks) and the allowlist.
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
      autoLogging: { ignore: (req) => req.url === "/health" },
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const api = express.Router();
  api.use(globalLimiter);
  api.use("/auth", authRouter);
  api.use("/testimonials", testimonialsRouter);
  api.use("/gallery", galleryRouter);
  api.use("/menus", menusRouter);
  api.use("/collection", collectionRouter);
  api.use("/services", servicesRouter);
  api.use("/contact", contactRouter);
  api.use("/admin", adminRouter);
  api.use("/images", imagesRouter);
  app.use("/api/v1", api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
