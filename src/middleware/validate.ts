import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { BadRequestError } from "../lib/errors";

export interface Validated {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validated: Validated;
      adminId?: string;
    }
  }
}

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

/**
 * Validates request parts against Zod schemas. Parsed (and thus sanitized/typed)
 * values are exposed on req.validated — handlers must read from there, never
 * from the raw request.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    req.validated = {};
    for (const part of ["body", "query", "params"] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        const first = result.error.issues[0];
        const path = first?.path.join(".");
        next(new BadRequestError(path ? `${path}: ${first?.message}` : (first?.message ?? "Invalid input.")));
        return;
      }
      req.validated[part] = result.data;
    }
    next();
  };
}

export function getValidated<T>(req: { validated: Validated }, part: keyof Validated): T {
  return req.validated[part] as T;
}
