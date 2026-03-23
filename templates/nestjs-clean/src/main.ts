{{NEST_INSTRUMENT_IMPORT}}
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { JsonLoggerService } from './common/logger/json-logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(JsonLoggerService);
  app.useLogger(logger);
  const config = app.get(ConfigService);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const port = config.getOrThrow<number>('port');
  await app.listen(port);
  logger.log(`listening on port ${port}`, 'Bootstrap');
}

bootstrap();
