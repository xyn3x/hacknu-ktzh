package main

import(
	"os"
	"strings"
)

func main() {
	brokers := strings.Split(env("REDPANDA_BROKERS", "localhost:9092"), ",")



}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}