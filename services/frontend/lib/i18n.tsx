"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

export type Language = "ru" | "kz"

interface Translations {
  // Header
  appTitle: string
  realTimeMonitoring: string
  unit: string
  online: string
  resetLayout: string

  // Interactive System View
  interactiveSystemView: string
  clickComponentsForDetails: string
  fullscreen: string
  exitFullscreen: string

  // Telemetry Widgets
  speed: string
  engineTemp: string
  voltage: string
  brakePressure: string
  fuelLevel: string
  compressorPressure: string
  coolingTemp: string

  // Units
  kmh: string
  celsius: string
  kv: string
  bar: string
  percent: string

  // System Efficiency
  systemEfficiency: string
  health: string
  efficiency: string

  // Metric Cards
  currentSpeed: string
  systemVoltage: string

  // Alerts
  alerts: string
  noActiveAlerts: string
  allSystemsNormal: string
  fixAll: string
  engineTempRising: string
  engineTempRisingMessage: string
  scheduledMaintenance: string
  scheduledMaintenanceMessage: string
  engine: string
  brakes: string

  // Charts
  speedOverTime: string
  engineTemperature: string
  systemVoltageChart: string
  live: string
  min5: string
  min15: string
  min30: string
  avg: string
  zoomedView: string
  dragToZoom: string
  resetZoom: string

  // Route Schematic
  routeProgress: string
  eastbound: string
  westbound: string
  eta: string
  passed: string
  speedRestriction: string
  warning: string
  station: string
  departed: string
  arrival: string
  upcoming: string
  current: string
  trackMaintenance: string
  gradeCrossing: string

  // Status Bar
  connection: string
  established: string
  latency: string
  mode: string
  autonomous: string
  route: string
  lastUpdate: string
  liveMonitoring: string

  // Component Hotspots
  mainDieselEngine: string
  brakeSystem: string
  electricalSystem: string
  wheelsBogies: string
  fuelEnergy: string
  coolingSystem: string
  compressor: string

  // Component Descriptions
  engineDescription: string
  brakeDescription: string
  electricalDescription: string
  wheelsDescription: string
  fuelDescription: string
  coolingDescription: string
  compressorDescription: string

  // Health Status
  healthScore: string
  excellent: string
  good: string
  fair: string
  poor: string
  critical: string

  // Drag hints
  dragToMove: string
}

const translations: Record<Language, Translations> = {
  ru: {
    // Header
    appTitle: "LocoTwin Кабина",
    realTimeMonitoring: "Мониторинг в реальном времени",
    unit: "Единица",
    online: "В сети",
    resetLayout: "Сбросить позиции",

    // Interactive System View
    interactiveSystemView: "Интерактивный обзор системы",
    clickComponentsForDetails: "Нажмите на компоненты для подробностей - Перетащите виджеты",
    fullscreen: "На весь экран",
    exitFullscreen: "Выйти из полноэкранного режима",

    // Telemetry Widgets
    speed: "Скорость",
    engineTemp: "Температура двигателя",
    voltage: "Напряжение",
    brakePressure: "Давление тормозов",
    fuelLevel: "Уровень топлива",
    compressorPressure: "Давление компрессора",
    coolingTemp: "Температура охлаждения",

    // Units
    kmh: "км/ч",
    celsius: "°C",
    kv: "кВ",
    bar: "бар",
    percent: "%",

    // System Efficiency
    systemEfficiency: "Эффективность системы",
    health: "Состояние",
    efficiency: "Эффективность",

    // Metric Cards
    currentSpeed: "Текущая скорость",
    systemVoltage: "Напряжение системы",

    // Alerts
    alerts: "Оповещения",
    noActiveAlerts: "Нет активных оповещений",
    allSystemsNormal: "Все системы работают нормально",
    fixAll: "Исправить всё",
    engineTempRising: "Температура двигателя растёт",
    engineTempRisingMessage: "Температура приближается к верхнему порогу. Рекомендуется снизить нагрузку.",
    scheduledMaintenance: "Плановое обслуживание",
    scheduledMaintenanceMessage: "Осмотр тормозной системы через 250 км.",
    engine: "Двигатель",
    brakes: "Тормоза",

    // Charts
    speedOverTime: "Скорость во времени",
    engineTemperature: "Температура двигателя",
    systemVoltageChart: "Напряжение системы",
    live: "Live",
    min5: "5 мин",
    min15: "15 мин",
    min30: "30 мин",
    avg: "сред",
    zoomedView: "Увеличенный вид - перетащите для выбора диапазона или нажмите сброс",
    dragToZoom: "Перетащите для увеличения",
    resetZoom: "Сбросить масштаб",

    // Route Schematic
    routeProgress: "Прогресс маршрута",
    eastbound: "Восточное направление",
    westbound: "Западное направление",
    eta: "Прибытие",
    passed: "Пройдено",
    speedRestriction: "Ограничение скорости",
    warning: "Предупреждение",
    station: "Станция",
    departed: "Отправление",
    arrival: "Прибытие",
    upcoming: "Предстоящий",
    current: "Текущий",
    trackMaintenance: "Ремонт пути",
    gradeCrossing: "Переезд впереди",

    // Status Bar
    connection: "Соединение",
    established: "Установлено",
    latency: "Задержка",
    mode: "Режим",
    autonomous: "Автономный",
    route: "Маршрут",
    lastUpdate: "Последнее обновление",
    liveMonitoring: "Мониторинг в реальном времени",

    // Component Hotspots
    mainDieselEngine: "Двигатель",
    brakeSystem: "Тормозная система",
    electricalSystem: "Электрическая система",
    wheelsBogies: "Колёса / Тележки",
    fuelEnergy: "Топливо / Энер��ия",
    coolingSystem: "Система охлаждения",
    compressor: "Компрессор",

    // Component Descriptions
    engineDescription: "Главный дизель-электрический силовой агрегат. Температура в рабочем диапазоне. Следите за перегревом.",
    brakeDescription: "Давление пневматической тормозной системы. Оптимальный диапазон: 5.5-7.0 бар. Аварийный резерв доступен.",
    electricalDescription: "Главное распределение тяговой мощности. Все цепи в норме. Рекуперативное торможение активно.",
    wheelsDescription: "Система подшипников колёс и подвески тележек. Распределение осевой нагрузки оптимально.",
    fuelDescription: "Уровень основного топливного бака и система подачи топлива. Расход: 12.4 л/км.",
    coolingDescription: "Радиатор и циркуляция охлаждающей жидкости. Температура охлаждающей жидкости в норме.",
    compressorDescription: "Главный воздушный компрессор для пневматических систем. Скорость зарядки оптимальна.",

    // Health Status
    healthScore: "Оценка состояния",
    excellent: "Отлично",
    good: "Хорошо",
    fair: "Удовлетворительно",
    poor: "Плохо",
    critical: "Критическое",

    // Drag hints
    dragToMove: "Перетащите",
  },
  kz: {
    // Header
    appTitle: "LocoTwin Кабина",
    realTimeMonitoring: "Нақты уақытта бақылау",
    unit: "Бірлік",
    online: "Желіде",
    resetLayout: "Орналасуды қалпына келтіру",

    // Interactive System View
    interactiveSystemView: "Интерактивті жүйе көрінісі",
    clickComponentsForDetails: "Толық мәлімет үшін компоненттерді басыңыз - Виджеттерді сүйреңіз",
    fullscreen: "Толық экран",
    exitFullscreen: "Толық экраннан шығу",

    // Telemetry Widgets
    speed: "Жылдамдық",
    engineTemp: "Қозғалтқыш температурасы",
    voltage: "Кернеу",
    brakePressure: "Тежегіш қысымы",
    fuelLevel: "Отын деңгейі",
    compressorPressure: "Компрессор қысымы",
    coolingTemp: "Салқындату температурасы",

    // Units
    kmh: "км/сағ",
    celsius: "°C",
    kv: "кВ",
    bar: "бар",
    percent: "%",

    // System Efficiency
    systemEfficiency: "Жүйе тиімділігі",
    health: "Күй",
    efficiency: "Тиімділік",

    // Metric Cards
    currentSpeed: "Ағымдағы жылдамдық",
    systemVoltage: "Жүйе кернеуі",

    // Alerts
    alerts: "Ескертулер",
    noActiveAlerts: "Белсенді ескертулер жоқ",
    allSystemsNormal: "Барлық жүйелер қалыпты жұмыс істеуде",
    fixAll: "Барлығын түзету",
    engineTempRising: "Қозғалтқыш температурасы көтеріліп жатыр",
    engineTempRisingMessage: "Температура жоғарғы шекке жақындауда. Жүктемені азайтуды қарастырыңыз.",
    scheduledMaintenance: "Жоспарлы техникалық қызмет",
    scheduledMaintenanceMessage: "Тежегіш жүйесін тексеру 250 км кейін.",
    engine: "Қозғалтқыш",
    brakes: "Тежегіштер",

    // Charts
    speedOverTime: "Уақыт бойынша жылдамдық",
    engineTemperature: "Қозғалтқыш температурасы",
    systemVoltageChart: "Жүйе кернеуі",
    live: "Тікелей",
    min5: "5 мин",
    min15: "15 мин",
    min30: "30 мин",
    avg: "орт",
    zoomedView: "Үлкейтілген көрініс - диапазонды таңдау үшін сүйреңіз",
    dragToZoom: "Үлкейту үшін сүйреңіз",
    resetZoom: "Масштабты қалпына келтіру",

    // Route Schematic
    routeProgress: "Маршрут барысы",
    eastbound: "Шығыс бағыты",
    westbound: "Батыс бағыты",
    eta: "Келу уақыты",
    passed: "Өтті",
    speedRestriction: "Жылдамдық шектеуі",
    warning: "Ескерту",
    station: "Станция",
    departed: "Жөнелді",
    arrival: "Келу",
    upcoming: "Алдағы",
    current: "Ағымдағы",
    trackMaintenance: "Жол жөндеу жұмыстары",
    gradeCrossing: "Алдыда өткел",

    // Status Bar
    connection: "Байланыс",
    established: "Орнатылды",
    latency: "Кідіріс",
    mode: "Режим",
    autonomous: "Автономды",
    route: "Маршрут",
    lastUpdate: "Соңғы жаңарту",
    liveMonitoring: "Тікелей бақылау",

    // Component Hotspots
    mainDieselEngine: "Қозғалтқыш",
    brakeSystem: "Тежегіш жүйесі",
    electricalSystem: "Электр жүйесі",
    wheelsBogies: "Дөңгелектер / Візкілер",
    fuelEnergy: "Отын / Энергия",
    coolingSystem: "Салқындату жүйесі",
    compressor: "Компрессор",

    // Component Descriptions
    engineDescription: "Негізгі дизель-электр қуат агрегаты. Температура жұмыс диапазонында. Қызып кетуді бақылаңыз.",
    brakeDescription: "Пневматикалық тежегіш жүйесінің қысымы. Оңтайлы диапазон: 5.5-7.0 бар. Төтенше қор қол жетімді.",
    electricalDescription: "Негізгі тарту қуатын тарату. Барлық тізбектер қалыпты. Рекуперативті тежеу белсенді.",
    wheelsDescription: "Дөңгелек подшипниктері және візкі аспа жүйесі. Ось жүктемесінің таралуы оңтайлы.",
    fuelDescription: "Негізгі отын багының деңгейі және отын беру жүйесі. Шығын: 12.4 л/км.",
    coolingDescription: "Радиатор және салқындатқыш сұйықтықтың айналымы. Салқындатқыш сұйықтықтың температурасы қалыпты.",
    compressorDescription: "Пневматикалық жүйелер үшін негізгі ауа компрессоры. Зарядтау жылдамдығы оңтайлы.",

    // Health Status
    excellent: "Өте жақсы",
    good: "Жақсы",
    fair: "Қанағаттанарлық",
    poor: "Нашар",
    critical: "Сыни",

    // Drag hints
    dragToMove: "Сүйреңіз",
  },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru")

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboard-language", lang)
    }
  }, [])

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem("dashboard-language") as Language | null
    if (saved && (saved === "ru" || saved === "kz")) {
      setLanguageState(saved)
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
