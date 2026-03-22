package httpx

import (
	"net/http"

	"{{MODULE_PATH}}/internal/logging"
)

func RequestLog(service string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rid := GetRequestID(r)
			logging.JSONLine("info", service, "request received", map[string]string{
				"requestId": rid,
				"method":    r.Method,
				"path":      r.URL.Path,
			})
			next.ServeHTTP(w, r)
			logging.JSONLine("info", service, "request completed", map[string]string{
				"requestId": rid,
				"method":    r.Method,
				"path":      r.URL.Path,
			})
		})
	}
}
