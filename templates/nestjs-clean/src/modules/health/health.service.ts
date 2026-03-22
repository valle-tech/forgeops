import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService) {}

  async checkReadiness(): Promise<Record<string, unknown>> {
    const url = this.config.get<string>('databaseUrl', '');
    if (!url) {
      return { status: 'ready', checks: { database: 'not_configured' } };
    }
    const pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 2000,
    });
    try {
      await pool.query('SELECT 1');
      return { status: 'ready', checks: { database: 'ok' } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'database_unreachable';
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks: { database: 'failed', detail: message },
      });
    } finally {
      await pool.end().catch(() => undefined);
    }
  }
}
