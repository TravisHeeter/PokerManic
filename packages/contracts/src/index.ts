import { z } from 'zod';

// Shared by NestJS and the Nuxt server route. Game-state schemas come later.
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('pokermanic-api'),
  version: z.literal('0.1.0'),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// A deliberate smoke-test-only contract: demonstrates global Zod request validation.
export const echoRequestSchema = z.object({
  message: z.string().trim().min(1).max(80),
});
export type EchoRequest = z.infer<typeof echoRequestSchema>;

export const echoResponseSchema = z.object({
  echo: z.string(),
});
export type EchoResponse = z.infer<typeof echoResponseSchema>;

// Playing card types are shared; the pure game engine implements the rules.
export * from './cards.js';

export * from './game-save.js';
