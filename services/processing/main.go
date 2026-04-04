package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// 1. Структура данных (такие прилетят из Ingestion)
type CleanTelemetry struct {
	Timestamp int64   `json:"timestamp"`
	Speed     float64 `json:"speed"`
	Temp      float64 `json:"temp"`
	Pressure  float64 `json:"pressure"`
	Fuel      float64 `json:"fuel"`
	Voltage   float64 `json:"voltage"`
	Error     bool    `json:"error"`
}

// 2. Модель для БД (TimescaleDB)
type ProcessedData struct {
	ID        uint      `gorm:"primaryKey"`
	Timestamp time.Time `gorm:"index"` // Индекс по времени (критично для графиков)
	Speed     float64
	Temp      float64
	Pressure  float64
	Fuel      float64
	Voltage   float64
	IsAnomaly bool
}

func main() {
	log.Println("🚀 Запускаем сервис Processing...")

	// --- ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ ---
	dsn := "host=localhost user=admin password=password dbname=telemetry_db port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Ошибка подключения к БД: %v", err)
	}

	// Автоматически создаем таблицу в БД, если ее еще нет
	db.AutoMigrate(&ProcessedData{})
	log.Println("✅ Успешно подключились к TimescaleDB и создали таблицы!")

	// --- ПОДКЛЮЧЕНИЕ К KAFKA (REDPANDA) ---
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:   []string{"localhost:9092"},
		Topic:     "clean-telemetry",
		Partition: 0,
		MinBytes:  10e3, // 10KB
		MaxBytes:  10e6, // 10MB
	})
	defer r.Close()
	log.Println("🎧 Готов слушать топик 'clean-telemetry'...")

	// --- БЕСКОНЕЧНЫЙ ЦИКЛ ЧТЕНИЯ ---
	for {
		// Ждем новое сообщение из Кафки
		m, err := r.ReadMessage(context.Background())
		if err != nil {
			log.Println("❌ Ошибка чтения из Kafka:", err)
			break
		}

		// Декодируем JSON
		var t CleanTelemetry
		if err := json.Unmarshal(m.Value, &t); err != nil {
			log.Printf("⚠️ Ошибка парсинга JSON: %v. Данные: %s", err, string(m.Value))
			continue
		}

		// Логируем в консоль, чтобы видеть, что процесс идет
		log.Printf("📥 Из Kafka: Скорость=%.1f, Температура=%.1f, Ошибка=%v", t.Speed, t.Temp, t.Error)

		// Сохраняем обработанные данные в Базу Данных
		record := ProcessedData{
			Timestamp: time.UnixMilli(t.Timestamp),
			Speed:     t.Speed,
			Temp:      t.Temp,
			Pressure:  t.Pressure,
			Fuel:      t.Fuel,
			Voltage:   t.Voltage,
			IsAnomaly: t.Error,
		}

		if err := db.Create(&record).Error; err != nil {
			log.Printf("❌ Ошибка сохранения в БД: %v", err)
		}
	}
}
