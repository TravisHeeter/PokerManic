import { describe, expect, it } from 'vitest';
import { echoRequestSchema, echoResponseSchema, healthResponseSchema } from '../src/index';

describe('shared contracts', () => {
  it('accepts the API health payload', () => {
    expect(healthResponseSchema.parse({
      status: 'ok', service: 'pokermanic-api', version: '0.1.0'
    }).status).toBe('ok');
  });

  it('rejects incorrect API health payloads', () => {
    expect(healthResponseSchema.safeParse({ status: 'down' }).success).toBe(false);
  });

  it('trims valid echo inputs and rejects blank or overlong messages', () => {
    expect(echoRequestSchema.parse({ message: '  hello  ' }).message).toBe('hello');
    expect(echoRequestSchema.safeParse({ message: '  ' }).success).toBe(false);
    expect(echoRequestSchema.safeParse({ message: 'a'.repeat(81) }).success).toBe(false);
    expect(echoResponseSchema.parse({ echo: 'hello' })).toEqual({ echo: 'hello' });
  });
});
