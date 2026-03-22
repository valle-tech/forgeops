package main

import (
	"log"
	"net/http"
	"os"

	"{{MODULE_PATH}}/internal/health"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "{{PORT}}"
	}
	mux := http.NewServeMux()
	health.Register(mux)
	log.Printf("listening on :%s service=%s (json-friendly std log)", port, "{{SERVICE_NAME}}")
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
