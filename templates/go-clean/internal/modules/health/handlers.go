package health

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"{{MODULE_PATH}}/internal/config"
	"{{MODULE_PATH}}/internal/httpx"
)

func Register(mux *http.ServeMux, cfg *config.Config) {
	mux.HandleFunc("GET /health", liveness(cfg))
	mux.HandleFunc("GET /ready", readiness(cfg))
	mux.Handle("GET /metrics", promhttp.Handler())
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
