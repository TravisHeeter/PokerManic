import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EchoRequestDto, EchoResponseDto, HealthResponseDto } from './health.dto.js';
import { ZodResponse } from 'nestjs-zod';
import type { EchoResponse, HealthResponse } from '@pokermanic/contracts';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API availability' })
  @ZodResponse({ type: HealthResponseDto })
  getHealth(): HealthResponse {
    return { status: 'ok', service: 'pokermanic-api', version: '0.1.0' };
  }

  // This is a disposable diagnostic endpoint, NOT the game's player/session model.
  @Post('echo')
  @ApiOperation({ summary: 'Validate a sample request body with Zod' })
  @ZodResponse({ type: EchoResponseDto, status: 200 })
  echo(@Body() body: EchoRequestDto): EchoResponse {
    return { echo: body.message };
  }
}
