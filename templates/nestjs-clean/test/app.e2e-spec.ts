import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JsonLoggerService } from '../src/common/logger/json-logger.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { RequestLoggingInterceptor } from '../src/common/interceptors/request-logging.interceptor';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'e2e-test';
    process.env.PORT = process.env.PORT || '3999';
    process.env.DATABASE_URL = process.env.DATABASE_URL || '';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    const logger = app.get(JsonLoggerService);
    app.useLogger(logger);
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new RequestLoggingInterceptor(logger));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health — liveness', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect((res) => {
      expect(res.body.status).toBe('ok');
    });
  });

  it('GET /ready — readiness without DB', () => {
    return request(app.getHttpServer()).get('/ready').expect(200).expect((res) => {
      expect(res.body.status).toBe('ready');
    });
  });

  it('GET /payments/demo-error — standard error JSON', async () => {
    const res = await request(app.getHttpServer()).get('/payments/demo-error').expect(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.message).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
