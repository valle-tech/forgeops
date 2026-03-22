package health

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"{{MODULE_PATH}}/internal/config"
	"{{MODULE_PATH}}/internal/httpx"
)

func Register(mux *http.ServeMux, cfg *config.Config) {
	mux.HandleFunc("GET /health", liveness(cfg))
	mux.HandleFunc("GET /ready", readiness(cfg))
	mux.HandleFunc("GET /metrics", metrics())
}

func liveness(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status":  "ok",
			"service": cfg.ServiceName,
		})
	}
}

func readiness(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if cfg.DatabaseURL == "" {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "ready",
				"checks": map[string]string{"database": "not_configured"},
			})
			return
		}
		if !strings.HasPrefix(cfg.DatabaseURL, "postgres") {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "ready",
				"checks": map[string]string{"database": "skipped_non_postgres"},
			})
			return
		}
		db, err := sql.Open("postgres", cfg.DatabaseURL)
		if err != nil {
			httpx.WriteError(w, http.StatusServiceUnavailable, "NOT_READY", "database open failed", httpx.GetRequestID(r))
			return
		}
		db.SetConnMaxLifetime(2 * time.Second)
		ctx := r.Context()
		if pingErr := db.PingContext(ctx); pingErr != nil {
			_ = db.Close()
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"error":   "NOT_READY",
				"message": "database ping failed",
				"checks":  map[string]string{"database": "failed"},
			})
			return
		}
		_ = db.Close()
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "ready",
			"checks": map[string]string{"database": "ok"},
		})
	}
}

func metrics() http.HandlerFunc {
	slug := "{{SERVICE_SLUG}}"
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		_, _ = w.Write([]byte("# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{service=\"" + slug + "\"} 0\n"))
	}
}
