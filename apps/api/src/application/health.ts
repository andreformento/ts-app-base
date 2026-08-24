import { Injectable } from '@nestjs/common';
import { Database } from '../diplomat/out/prisma.js';

@Injectable()
export class HealthApplication {
  constructor(private readonly db: Database) {}

  async healthy(): Promise<boolean> {
    return this.db.reachable();
  }
}
