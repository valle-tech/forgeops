package payments

import (
	"encoding/json"
	"net/http"

	"{{MODULE_PATH}}/internal/config"
	"{{MODULE_PATH}}/internal/httpx"
	"{{MODULE_PATH}}/internal/logging"
)

func Register(mux *http.ServeMux, cfg *config.Config) {
	mux.HandleFunc("GET /", root(cfg))
	mux.HandleFunc("GET /payments", list(cfg))
	mux.HandleFunc("GET /payments/demo-error", demoError())
}

func root(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"service": cfg.ServiceName,
			"message": "Forgeops-generated Go service",
			"modules": []string{"health", "payments"},
		})
	}
}

func list(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logging.JSONLine("info", cfg.ServiceName, "important action", map[string]string{
			"requestId": httpx.GetRequestID(r),
			"action":    "list_payments",
			"domain":    "payments",
		})
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"domain": "payments",
			"items":  []any{},
		})
	}
}

func demoError() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid input", httpx.GetRequestID(r))
	}
}
