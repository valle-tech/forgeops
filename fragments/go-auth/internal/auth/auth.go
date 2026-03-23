package auth

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"{{MODULE_PATH}}/internal/config"
)

type loginResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

func Register(mux *http.ServeMux, cfg *config.Config) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "change-me-in-production"
	}
	mux.HandleFunc("POST /auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub":   "demo-user",
			"roles": []string{"admin"},
			"exp":   time.Now().Add(time.Hour).Unix(),
			"iss":   cfg.ServiceName,
		})
		s, err := tok.SignedString([]byte(secret))
		if err != nil {
			http.Error(w, `{"error":"token_error"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(loginResponse{AccessToken: s, TokenType: "Bearer", ExpiresIn: 3600})
	})
}
