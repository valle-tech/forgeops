package main

import (
	"net/http"

	"{{MODULE_PATH}}/internal/config"
	{{GO_OPTIONAL_IMPORTS}}
	"{{MODULE_PATH}}/internal/httpx"
	"{{MODULE_PATH}}/internal/logging"
	"{{MODULE_PATH}}/internal/modules/health"
	"{{MODULE_PATH}}/internal/modules/payments"
)

func main() {
	cfg := config.MustLoad()
	{{GO_OTEL_BOOTSTRAP}}
	logFn := func(level, msg string, fields map[string]string) {
		logging.JSONLine(level, cfg.ServiceName, msg, fields)
	}

	mux := http.NewServeMux()
	health.Register(mux, cfg)
	payments.Register(mux, cfg)
	{{GO_AUTH_REGISTER}}

	handler := httpx.RequestID(
		httpx.RecoverJSON(cfg.ServiceName, logFn)(
			httpx.RequestLog(cfg.ServiceName)(mux),
		),
	)

	logging.JSONLine("info", cfg.ServiceName, "server starting", map[string]string{"port": cfg.Port})
	toHTTP := http.Handler(handler)
	{{GO_OTEL_WRAP}}
	if err := http.ListenAndServe(":"+cfg.Port, toHTTP); err != nil {
		panic(err)
	}
}
