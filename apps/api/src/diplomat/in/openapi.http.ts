import { Controller as NestRoute, Get } from '@nestjs/common';
import { openApiDocument } from '../../wire/out/openapi.js';

@NestRoute('openapi.json')
export class OpenApiHttp {
  @Get()
  document(): Record<string, unknown> {
    return openApiDocument();
  }
}
