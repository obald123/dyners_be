import { z } from "zod";

export const subscribeSchema = z.object({
  email: z.string().email().max(254),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;
