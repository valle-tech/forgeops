import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().required(),
  SERVICE_NAME: Joi.string().min(1).required(),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),
  DATABASE_URL: Joi.string().allow('').optional(),
  JWT_SECRET: Joi.string().allow('').optional(),
  JWT_EXPIRES_IN: Joi.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().allow('').optional(),
  OTEL_SERVICE_NAME: Joi.string().allow('').optional(),
  OTEL_SDK_DISABLED: Joi.string().valid('true', 'false').optional(),
  REDIS_URL: Joi.string().allow('').optional(),
});
