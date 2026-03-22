export default () => ({
  port: parseInt(process.env.PORT || '{{PORT}}', 10),
  serviceName: process.env.SERVICE_NAME || '{{SERVICE_NAME}}',
  databaseUrl: process.env.DATABASE_URL || '',
  logFormat: process.env.LOG_FORMAT || 'json',
});
