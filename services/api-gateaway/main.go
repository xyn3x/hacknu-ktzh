package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
	"github.com/segmentio/kafka-go"
)

// ── Models ────────────────────────────────────────────────────────────────────

type ProcessedFrame struct {
	Timestamp int64    `json:"timestamp"`
	Speed     float64  `json:"speed"`
	Temp      float64  `json:"temp"`
	Pressure  float64  `json:"pressure"`
	Fuel      float64  `json:"fuel"`
	Voltage   float64  `json:"voltage"`
	Error     bool     `json:"error"`
	Health    float64  `json:"health"`
	Alerts    []string `json:"alerts"`
}

// ── Database ──────────────────────────────────────────────────────────────────

type DB struct {
	db *sql.DB
}

func NewDB(dsn string) (*DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("postgres ping: %w", err)
	}
	return &DB{db: db}, nil
}

func (d *DB) Latest() (*ProcessedFrame, error) {
	row := d.db.QueryRow(`
		SELECT ts, speed, temp, pressure, fuel, voltage, error, health, alerts
		FROM telemetry
		ORDER BY ts DESC
		LIMIT 1`)
	var f ProcessedFrame
	var ts time.Time
	var alertsJSON []byte
	err := row.Scan(&ts, &f.Speed, &f.Temp, &f.Pressure, &f.Fuel, &f.Voltage, &f.Error, &f.Health, &alertsJSON)
	if err != nil {
		return nil, err
	}
	f.Timestamp = ts.UnixMilli()
	_ = json.Unmarshal(alertsJSON, &f.Alerts)
	if f.Alerts == nil {
		f.Alerts = []string{}
	}
	return &f, nil
}

func (d *DB) History(from int64, limit int, downsample bool) ([]ProcessedFrame, error) {
	var query string
	if downsample {
		query = `
			SELECT
				time_bucket('1 minute', ts) AS ts,
				AVG(speed)    AS speed,
				AVG(temp)     AS temp,
				AVG(pressure) AS pressure,
				AVG(fuel)     AS fuel,
				AVG(voltage)  AS voltage,
				BOOL_OR(error) AS error,
				AVG(health)   AS health,
				'[]'::jsonb   AS alerts
			FROM telemetry
			WHERE ts > $1
			GROUP BY 1
			ORDER BY 1 ASC
			LIMIT $2`
	} else {
		query = `
			SELECT ts, speed, temp, pressure, fuel, voltage, error, health, alerts
			FROM telemetry
			WHERE ts > $1
			ORDER BY ts ASC
			LIMIT $2`
	}

	fromTime := time.UnixMilli(from)
	rows, err := d.db.Query(query, fromTime, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var frames []ProcessedFrame
	for rows.Next() {
		var f ProcessedFrame
		var ts time.Time
		var alertsJSON []byte
		if err := rows.Scan(&ts, &f.Speed, &f.Temp, &f.Pressure, &f.Fuel, &f.Voltage, &f.Error, &f.Health, &alertsJSON); err != nil {
			return nil, err
		}
		f.Timestamp = ts.UnixMilli()
		_ = json.Unmarshal(alertsJSON, &f.Alerts)
		if f.Alerts == nil {
			f.Alerts = []string{}
		}
		frames = append(frames, f)
	}
	if frames == nil {
		frames = []ProcessedFrame{}
	}
	return frames, nil
}

func (d *DB) Close() { d.db.Close() }

// ── Live broadcast hub ────────────────────────────────────────────────────────

type Hub struct {
	mu      sync.RWMutex
	clients map[chan []byte]struct{}
}

func NewHub() *Hub { return &Hub{clients: make(map[chan []byte]struct{})} }

func (h *Hub) Subscribe() chan []byte {
	ch := make(chan []byte, 16)
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *Hub) Unsubscribe(ch chan []byte) {
	h.mu.Lock()
	delete(h.clients, ch)
	h.mu.Unlock()
	close(ch)
}

func (h *Hub) Broadcast(data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.clients {
		select {
		case ch <- data:
		default:
		}
	}
}

func KafkaConsumer(ctx context.Context, brokers []string, hub *Hub) {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     brokers,
		Topic:       "telemetry.processed",
		GroupID:     "api-gateway",
		MinBytes:    1,
		MaxBytes:    10e6,
		StartOffset: kafka.LastOffset,
	})
	defer r.Close()
	log.Println("[kafka] listening on telemetry.processed")
	for {
		msg, err := r.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Println("[kafka] read error:", err)
			time.Sleep(time.Second)
			continue
		}
		hub.Broadcast(msg.Value)
	}
}

// ── WebSocket handler ─────────────────────────────────────────────────────────

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func wsHandler(hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("[ws] upgrade error:", err)
			return
		}
		defer conn.Close()

		ch := hub.Subscribe()
		defer hub.Unsubscribe(ch)

		log.Printf("[ws] client connected: %s", r.RemoteAddr)

		done := make(chan struct{})
		go func() {
			defer close(done)
			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					return
				}
			}
		}()

		for {
			select {
			case <-done:
				log.Printf("[ws] client disconnected: %s", r.RemoteAddr)
				return
			case data, ok := <-ch:
				if !ok {
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
					return
				}
			}
		}
	}
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	brokers := strings.Split(env("REDPANDA_BROKERS", "redpanda:29092"), ",")
	pgDSN := env("POSTGRES_DSN", "postgres://postgres:postgres@timescaledb:5432/telemetry?sslmode=disable")
	port := env("PORT", "8080")

	db, err := NewDB(pgDSN)
	if err != nil {
		log.Fatal("[db] connect error:", err)
	}
	defer db.Close()
	log.Println("[db] connected to postgres")

	hub := NewHub()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go KafkaConsumer(ctx, brokers, hub)

	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// GET /api/telemetry/latest
	mux.HandleFunc("/api/telemetry/latest", func(w http.ResponseWriter, r *http.Request) {
		frame, err := db.Latest()
		if err != nil {
			if err == sql.ErrNoRows {
				writeJSON(w, http.StatusOK, nil)
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, frame)
	})

	// GET /api/telemetry/history?from=<unix_ms>&limit=<n>&downsample=<bool>
	mux.HandleFunc("/api/telemetry/history", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()

		from, _ := strconv.ParseInt(q.Get("from"), 10, 64)
		if from == 0 {
			from = time.Now().Add(-5 * time.Minute).UnixMilli()
		}

		limit, _ := strconv.Atoi(q.Get("limit"))
		if limit <= 0 || limit > 1000 {
			limit = 300
		}

		downsample := q.Get("downsample") == "true"

		frames, err := db.History(from, limit, downsample)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, frames)
	})

	// GET /api/ws - WebSocket live feed
	mux.Handle("/api/ws", wsHandler(hub))

	handler := corsMiddleware(mux)
	log.Printf("[gateway] listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
