package payments

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"{{MODULE_PATH}}/internal/config"
)

func TestListReturnsDomain(t *testing.T) {
	mux := http.NewServeMux()
	Register(mux, &config.Config{ServiceName: "test"})
	req := httptest.NewRequest(http.MethodGet, "/payments", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), `"domain":"payments"`) {
		t.Fatalf("body %s", rr.Body.String())
	}
}
