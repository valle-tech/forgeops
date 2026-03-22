package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	HTTPRequestsTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total HTTP requests",
	})
	HTTPErrorsTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "http_errors_total",
		Help: "Total failed HTTP requests (status >= 400)",
	})
	HTTPRequestDurationMs = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "http_request_duration_ms",
		Help:    "HTTP request duration in milliseconds",
		Buckets: []float64{5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000},
	})
)

func RecordRequest(durationMs float64, statusCode int) {
	HTTPRequestsTotal.Inc()
	HTTPRequestDurationMs.Observe(durationMs)
	if statusCode >= 400 {
		HTTPErrorsTotal.Inc()
	}
}
