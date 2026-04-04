package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// streamToIngestion работает в фоне, подключается к Ingestion и шлет данные
func streamToIngestion(ingestionURL string) {
	var conn *websocket.Conn
	var err error

	// 1. Цикл переподключения (если Ingestion еще не запустился)
	for {
		log.Printf("🔄 Попытка подключения к Ingestion: %s...", ingestionURL)
		conn, _, err = websocket.DefaultDialer.Dial(ingestionURL, nil)
		if err != nil {
			log.Println("⚠️ Ingestion пока недоступен. Ждем 2 секунды...")
			time.Sleep(2 * time.Second)
			continue
		}
		break // Успешно подключились!
	}
	defer conn.Close()
	log.Println("✅ Соединение с Ingestion установлено! Начинаем трансляцию...")

	// 2. Таймер на отправку (2 раза в секунду = 500ms)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	// 3. Бесконечный цикл отправки данных
	for range ticker.C {
		// Берем свежие данные из локомотива!
		data := SharedLoco.Next()

		err = conn.WriteJSON(data)
		if err != nil {
			log.Println("❌ Ошибка отправки данных (обрыв связи):", err)
			// Выходим из функции при обрыве. Контейнер перезапустится.
			return
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
		SharedLoco.Fix()

		// Разрешаем фронтенду делать запросы (CORS)
		w.Header().Set("Access-Control-Allow-Origin", "*")
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
