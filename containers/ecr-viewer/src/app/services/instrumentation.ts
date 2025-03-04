import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { containerDetector } from "@opentelemetry/resource-detector-container";
import { envDetector, hostDetector } from "@opentelemetry/resources";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK, tracing, metrics } from "@opentelemetry/sdk-node";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: "ecr-viewer",
  }),
  spanProcessors: [new tracing.SimpleSpanProcessor(new OTLPTraceExporter())],
  instrumentations: [
    getNodeAutoInstrumentations({
      // disable fs instrumentation to reduce noise
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
    }),
  ],
  metricReader: new metrics.PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
  resourceDetectors: [containerDetector, envDetector, hostDetector],
});

sdk.start();
