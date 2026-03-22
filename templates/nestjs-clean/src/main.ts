import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const port = parseInt(process.env.PORT || '{{PORT}}', 10);
  await app.listen(port);
  logger.log(`{{SERVICE_NAME}} listening on port ${port} (json logs via Nest Logger)`);
}

bootstrap();
