
# Digital Twin Locomotive Dashboard

Цифровой двойник локомотива — это full-stack веб-приложение для визуализации телеметрии в реальном времени и оценки состояния поезда через интегральный индекс здоровья.
Проект решает проблему перегрузки данными: вместо сотен параметров пользователь получает понятную и приоритизированную картину состояния системы.

# 🚆 Digital Twin Locomotive Dashboard

## 📌 Introduction
**Digital Twin Locomotive Dashboard** — это full-stack веб-приложение для визуализации телеметрии локомотива в реальном времени и оценки его состояния через интегральный индекс здоровья.

Проект решает проблему перегрузки данными: вместо сотен параметров пользователь получает понятную, структурированную и приоритизированную картину состояния системы.

---

## 📚 Table of Contents
- [Introduction](#-introduction)
- [Examples](#-examples)
- [Installation](#-installation)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Data Pipeline](#-data-pipeline)
- [Health Index](#-health-index)
- [UI Usage Guide](#-ui-usage-guide)

---
---

## ⚙️ Installation

### 🐳 Docker

```bash
git clone <repo>
cd project
docker-compose up --build
```

---

---

## 🚀 Features

- 📊 Визуализация телеметрии:
  - скорость
  - топливо
  - давление
  - температура
  - электрические параметры

- 🧠 Индекс здоровья (0–100):
  - 🟢 Норма  
  - 🟡 Внимание  
  - 🔴 Критично  

- 🚨 Система алертов и рекомендаций  
- 📈 Живые графики (auto-scale + zoom)  
- 🗺️ Карта маршрута с текущим положением  
- ⏪ Replay последних 5–15 минут  
- 📄 Экспорт отчетов (PDF / CSV)  
- ⚡ Режим повышенной нагрузки (highload)  

---

## 🏗️ Architecture

Микросервисная архитектура обеспечивает масштабируемость и отказоустойчивость:


### Components
- **Frontend** — UI и визуализация
- **API Gateway** — единая точка входа
- **Generator** — генерация телеметрии
- **Ingestion Service** — прием данных
- **Processing Service** — обработка и расчет индекса
- **Message Broker** — Kafka / Redpanda
- **Database** — PostgreSQL / TimescaleDB

---

## 🧰 Tech Stack

### Backend
- Node.js (Express / NestJS)
- Go (Fiber / Gin)

### Real-time & Messaging
- Kafka / Redpanda
- WebSocket

### Databases
- PostgreSQL
- TimescaleDB

### Frontend
- TypeScript / JavaScript
- React / Vue / Svelte

### Infrastructure
- Docker
- Docker Compose
- Git

---

## 🔄 Data Pipeline

Полный цикл обработки потоковой телеметрии:

### 📥 Ingestion
- WebSocket поток (≥ 1 Hz)

### 🧹 Cleaning
- Буферизация
- Дедубликация
- Сглаживание (EMA / медиана)

### ✅ Validation
- Проверка корректности входящих данных

### 🔁 Fault Tolerance
- Авто-reconnect
- Backoff стратегия
- Индикация потери связи

---

## ❤️ Health Index

Интегральный показатель состояния локомотива.

- Диапазон: **0 – 100**

### Категории:
- **A — Норма**
- **B — Внимание**
- **C — Критично**

### Формируется на основе:
- Скорость  
- Давление  
- Температура  
- Топливо  
- Электрические параметры  
- Ошибки и алерты  

### Особенность:
- 🔍 Explainability — отображение вклада каждого параметра

---

## 🖥️ UI Usage Guide

### A. Workspace Setup
- Темная / светлая тема
- Выбор языка
- Drag-and-drop виджетов
- Сброс layout

### B. Monitoring & Analytics
- Индекс здоровья как главный KPI
- Живые графики (auto-scale + zoom)
- Карта маршрута
- Панель алертов

### C. Testing & Reporting
- Highload режим (x10 нагрузка)
- Экспорт отчетов (PDF / CSV)

---
