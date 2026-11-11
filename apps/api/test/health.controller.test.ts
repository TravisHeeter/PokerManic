import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/health/health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('returns the expected health payload', () => {
    expect(controller.getHealth()).toEqual({
      status: 'ok', service: 'pokermanic-api', version: '0.1.0'
    });
  });

  it('echoes an already validated request body', () => {
    expect(controller.echo({ message: 'hello' })).toEqual({ echo: 'hello' });
  });
});
