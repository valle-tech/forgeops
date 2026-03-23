package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port        string
	ServiceName string
	DatabaseURL string
}

func MustLoad() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "{{PORT}}"
	}
	if _, err := strconv.Atoi(port); err != nil {
		panic(fmt.Sprintf("invalid PORT: %s", port))
	}
	name := os.Getenv("SERVICE_NAME")
	if name == "" {
		name = "{{SERVICE_NAME}}"
	}
	if name == "" {
		panic("SERVICE_NAME is required")
	}
	return &Config{
		Port:        port,
		ServiceName: name,
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}
}
