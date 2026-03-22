package httpx

import (
	"net/http"
	"strconv"
	"time"

	"{{MODULE_PATH}}/internal/logging"
	"{{MODULE_PATH}}/internal/metrics"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (w *statusRecorder) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func RequestLog(service string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rid := GetRequestID(r)
			logging.JSONLine("info", service, "request received", map[string]string{
				"requestId": rid,
				"method":    r.Method,
				"path":      r.URL.Path,
			})
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			start := time.Now()
			next.ServeHTTP(rec, r)
			durMs := time.Since(start).Milliseconds()
			code := rec.status
			if code == 0 {
				code = http.StatusOK
			}
			metrics.RecordRequest(float64(durMs), code)
			logging.JSONLine("info", service, "request completed", map[string]string{
				"requestId":  rid,
				"method":     r.Method,
				"path":       r.URL.Path,
				"durationMs": strconv.FormatInt(durMs, 10),
				"statusCode": strconv.Itoa(code),
			})
		})
	}
}
