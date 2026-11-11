import { echoRequestSchema, echoResponseSchema, healthResponseSchema } from '@pokermanic/contracts';
import { createZodDto } from 'nestjs-zod';

export class HealthResponseDto extends createZodDto(healthResponseSchema) {}
export class EchoRequestDto extends createZodDto(echoRequestSchema) {}
export class EchoResponseDto extends createZodDto(echoResponseSchema) {}
