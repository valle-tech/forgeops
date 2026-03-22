import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../lib/logger';
import { recordHttpRequest } from '../../lib/metrics';
import { requestContext } from '../../lib/request-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    (req as Request & { requestId: string }).requestId = id;
    res.setHeader('X-Request-Id', id);
    const start = Date.now();

    requestContext.run({ requestId: id }, () => {
      logger.info('request received', {
        method: req.method,
        path: req.url,
      });

      res.on('finish', () => {
        const durationMs = Date.now() - start;
        const statusCode = res.statusCode || 200;
        recordHttpRequest(durationMs, statusCode);
        logger.info('request completed', {
          method: req.method,
          path: req.url,
          statusCode,
          durationMs,
        });
      });

      next();
    });
  }
}
