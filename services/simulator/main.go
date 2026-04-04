package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// streamToIngestion работает в фоне, подключается к Ingestion и шлет данные
func streamToIngestion(ingestionURL string) {
	// Бесконечный цикл всей работы
	for {
		var conn *websocket.Conn
		var err error

		// 1. Цикл переподключения
		for {
			log.Printf("🔄 Попытка подключения к Ingestion: %s...", ingestionURL)
			conn, _, err = websocket.DefaultDialer.Dial(ingestionURL, nil)
			if err == nil {
				break // Подключились!
			}
			log.Println("⚠️ Ingestion пока недоступен. Ждем 2 секунды...")
			time.Sleep(2 * time.Second)
		}

		log.Println("✅ Соединение с Ingestion установлено!")

		// 2. Таймер на отправку
		ticker := time.NewTicker(500 * time.Millisecond)

		// 3. Цикл отправки
		for range ticker.C {
			data := SharedLoco.Next()
			err = conn.WriteJSON(data)
			if err != nil {
				log.Println("❌ Обрыв связи! Начинаем переподключение...")
				ticker.Stop()
				conn.Close()
				break // Выходим из цикла отправки, возвращаемся к циклу переподключения
			}
		}
	}
}
func main() {
	// 1. ЗАПУСКАЕМ КЛИЕНТА В ФОНЕ
	// ВАЖНО: Замени "8081" на порт, который укажет тиммейт в Ingestion!
	ingestionURL := "ws://localhost:8081/ws"
	go streamToIngestion(ingestionURL)

	// 2. МАРШРУТ ДЛЯ ПОЧИНКИ (Трогать нельзя, фронтенд ждет его тут)
	http.HandleFunc("/fix", func(w http.ResponseWriter, r *http.Request) {
		// 1. Сначала ставим заголовки
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// 2. Если это проверка от браузера (Preflight) - отдаем OK и уходим
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// 3. А тут уже твоя логика
		SharedLoco.Fix()
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "success", "message": "Train is repaired!"}`))
		log.Println("🛠 Кнопка ПОЧИНИТЬ нажата! Поезд восстановлен.")
	})

	log.Println("🚀 Симулятор запущен!")
	log.Println("💡 HTTP сервер (для кнопки) слушает на http://localhost:8080/fix")

	// 3. Запускаем сервер для кнопки /fix
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("Ошибка запуска сервера: ", err)
	}
}
