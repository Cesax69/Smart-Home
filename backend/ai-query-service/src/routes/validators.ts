import { z } from 'zod';

export const chatBodySchema = z.object({
  message: z.string().min(3),
  connectionId: z.string().optional(),
  limit: z.number().min(1).max(500).optional()
});

export const parseChatBody = (body: any) => chatBodySchema.safeParse(body);