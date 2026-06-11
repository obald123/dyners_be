import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { AppError, NotFoundError } from "../lib/errors";
import { logger } from "../lib/logger";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError("Route"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.expose ? err.message : "Request failed." });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Resource not found." });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ error: "Resource already exists." });
      return;
    }
  }

  // Body larger than the configured limit, malformed JSON, etc.
  if (typeof err === "object" && err !== null && "type" in err && err.type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large." });
    return;
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed JSON body." });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error." });
};
