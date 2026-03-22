package health

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"{{MODULE_PATH}}/internal/config"
)

func TestLivenessEndpoint(t *testing.T) {
	mux := http.NewServeMux()
	Register(mux, &config.Config{ServiceName: "int-test", DatabaseURL: ""})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status %d", rr.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "ok" {
		t.Fatalf("unexpected body %#v", body)
	}
}
