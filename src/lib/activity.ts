import { prisma } from "../db/client";
import { logger } from "./logger";

/**
 * Records an admin action for the dashboard "Recent Activity" feed.
 * Fire-and-forget: activity logging must never fail a request.
 */
export function logActivity(adminId: string | undefined, action: string, entity: string, entityId?: string): void {
  void prisma.activityLog
    .create({ data: { adminId, action, entity, entityId } })
    .catch((err) => logger.warn({ err }, "activity log write failed"));
}
