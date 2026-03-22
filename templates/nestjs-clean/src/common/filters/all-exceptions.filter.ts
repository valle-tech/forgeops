import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        if ('message' in body) {
          const m = (body as { message: string | string[] }).message;
          message = Array.isArray(m) ? m.join(', ') : String(m);
        } else {
          message = JSON.stringify(body);
        }
      } else {
        message = exception.message;
      }
      code =
        status === HttpStatus.BAD_REQUEST
          ? 'VALIDATION_ERROR'
          : status === HttpStatus.SERVICE_UNAVAILABLE
            ? 'NOT_READY'
            : `HTTP_${status}`;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    res.status(status).json({
      error: code,
      message,
      requestId: req.requestId,
    });
  }
}
