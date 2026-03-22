import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { JsonLoggerService } from '../logger/json-logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: JsonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId || 'unknown';
    this.logger.infoStructured('request received', {
      requestId,
      method: req.method,
      path: req.url,
    });
    return next.handle().pipe(
      tap(() => {
        this.logger.infoStructured('request completed', {
          requestId,
          method: req.method,
          path: req.url,
        });
      }),
    );
  }
}
