import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(config.maxMessageLength, `Message too long (max ${config.maxMessageLength} chars)`),
  sessionId: z.string().optional(),
});

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.issues.map((i) => i.message),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
