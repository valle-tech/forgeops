import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().required(),
  SERVICE_NAME: Joi.string().min(1).required(),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),
  DATABASE_URL: Joi.string().allow('').optional(),
});
