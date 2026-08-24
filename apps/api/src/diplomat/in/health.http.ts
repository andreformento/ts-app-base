import {
  Controller as NestRoute,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthApplication } from '../../application/health.js';

@NestRoute('health')
export class HealthHttp {
  constructor(private readonly health: HealthApplication) {}

  @Get()
  async check() {
    if (!(await this.health.healthy())) {
      throw new ServiceUnavailableException({
        error: { code: 'health.database', message: 'Database unreachable.' },
      });
    }
    return { status: 'ok' };
  }
}
