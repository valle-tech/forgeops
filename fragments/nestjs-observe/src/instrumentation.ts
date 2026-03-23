import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

if (process.env.OTEL_SDK_DISABLED !== 'true') {
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
  const exporter = new OTLPTraceExporter({ url: endpoint });
  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || process.env.SERVICE_NAME || 'service',
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });
  try {
    sdk.start();
  } catch {
  }
}
