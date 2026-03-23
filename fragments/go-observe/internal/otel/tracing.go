package otel

import (
	"context"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func SetupTracing(serviceName string) {
	if os.Getenv("OTEL_SDK_DISABLED") == "true" {
		return
	}
	ctx := context.Background()
	exporter, err := otlptracehttp.New(ctx)
	if err != nil {
		return
	}
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	_ = serviceName
}
