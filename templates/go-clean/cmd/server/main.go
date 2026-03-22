package main

import (
	"net/http"

	"{{MODULE_PATH}}/internal/config"
	"{{MODULE_PATH}}/internal/httpx"
	"{{MODULE_PATH}}/internal/logging"
	"{{MODULE_PATH}}/internal/modules/health"
	"{{MODULE_PATH}}/internal/modules/payments"
)

func main() {
	cfg := config.MustLoad()
	logFn := func(level, msg string, fields map[string]string) {
		logging.JSONLine(level, cfg.ServiceName, msg, fields)
	}

	mux := http.NewServeMux()
	health.Register(mux, cfg)
	payments.Register(mux, cfg)

	handler := httpx.RequestID(
		httpx.RecoverJSON(cfg.ServiceName, logFn)(
			httpx.RequestLog(cfg.ServiceName)(mux),
		),
	)

	logging.JSONLine("info", cfg.ServiceName, "server starting", map[string]string{"port": cfg.Port})
	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		panic(err)
	}
}
