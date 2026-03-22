package httpx

import (
	"encoding/json"
	"net/http"
)

type APIError struct {
	Error     string `json:"error"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
}

func WriteError(w http.ResponseWriter, status int, code, msg, requestID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIError{
		Error:     code,
		Message:   msg,
		RequestID: requestID,
	})
}
