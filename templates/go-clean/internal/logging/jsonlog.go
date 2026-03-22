package logging

import (
	"encoding/json"
	"os"
	"time"
)

func JSONLine(level, service, message string, extra map[string]string) {
	m := map[string]string{
		"level":     level,
		"service":   service,
		"message":   message,
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
	}
	for k, v := range extra {
		m[k] = v
	}
	b, _ := json.Marshal(m)
	_, _ = os.Stdout.Write(append(b, '\n'))
}
