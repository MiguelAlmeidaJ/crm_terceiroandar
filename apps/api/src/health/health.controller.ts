import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../infra/prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const pong = await this.redis.client.ping();
      if (pong !== 'PONG') throw new Error('Redis unreachable');
      return { status: 'ok', services: { database: 'up', redis: 'up' } };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        message: 'Database or cache unavailable',
      });
    }
  }
}
