import { z } from "zod";

export const createContactMessageSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().max(20).optional(),
  eventType: z.string().max(50).optional(),
  guestCount: z.string().max(20).optional(),
  message: z.string().min(10).max(2000),
});
export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>;

export const messageStatuses = ["new", "read", "archived"] as const;

export const updateMessageStatusSchema = z.object({
  status: z.enum(messageStatuses),
});
export type UpdateMessageStatusInput = z.infer<typeof updateMessageStatusSchema>;

export const messagesQuerySchema = z.object({
  status: z.enum(messageStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
