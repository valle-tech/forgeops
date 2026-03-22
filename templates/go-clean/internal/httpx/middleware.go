package httpx

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

type ctxKey string

const requestIDKey ctxKey = "requestId"

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" {
			id = uuid.New().String()
		}
		w.Header().Set("X-Request-Id", id)
		ctx := context.WithValue(r.Context(), requestIDKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetRequestID(r *http.Request) string {
	v, _ := r.Context().Value(requestIDKey).(string)
	return v
}

func RecoverJSON(service string, log func(level, msg string, fields map[string]string)) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recover() != nil {
					rid := GetRequestID(r)
					log("error", "panic recovered", map[string]string{"requestId": rid, "detail": "internal_error"})
					WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred", rid)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
