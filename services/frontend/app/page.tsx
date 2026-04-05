"use client"

import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { InteractiveLocomotive } from "@/components/interactive-locomotive"
import { DraggableWidget } from "@/components/draggable-widget"
import { MetricCard } from "@/components/metric-card"
import { CircularProgress } from "@/components/circular-progress"
import { EnhancedChart, type TimeRange } from "@/components/enhanced-chart"
import { StatusBar } from "@/components/status-bar"
import { AlertsPanel, type Alert } from "@/components/alerts-panel"
import { RouteSchematic } from "@/components/route-schematic"
import { ReorderableMetricCards } from "@/components/reorderable-metric-cards"
import { ThemeToggleSimple } from "@/components/theme-toggle"
import { ReportExportButton } from "@/components/report-export-button"
import { LanguageProvider, useLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import {
  fetchLatest,
  fetchHistory,
  subscribeLive,
  type TelemetryFrame,
  type ChartDataPoint,
  type HistoryRange,
} from "@/lib/api"
import {
  Gauge,
  Thermometer,
  Zap,
  Fuel,
  Activity,
  Wind,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react"

// ── constants ─────────────────────────────────────────────────────────────────

const DEFAULT_WIDGET_POSITIONS = {
  speed:      { x: 30,  y: 20 },
  engineTemp: { x: 180, y: 20 },
  voltage:    { x: 330, y: 20 },
  brakes:     { x: 480, y: 20 },
}

// Fallback telemetry shown while the first frame has not arrived yet
const EMPTY_TELEMETRY: TelemetryFrame = {
  timestamp: 0,
  speed: 0,
  temp: 0,
  pressure: 0,
  fuel: 0,
  voltage: 0,
  error: false,
  health: 0,
  alerts: [],
}

// Map TimeRange → HistoryRange accepted by the API client
const TIME_RANGE_MAP: Record<TimeRange, HistoryRange> = {
  live:   "5min",
  "5min": "5min",
  "15min":"15min",
  "30min":"30min",
}

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive simple component health percentages from a raw telemetry frame.
 * These mirror the thresholds used in the Go processing service.
 */
function deriveComponentHealth(f: TelemetryFrame) {
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(100, v)))

  // engine: temp 60-90 nominal, 130+ critical
  const engineScore =
    f.temp <= 90  ? 100
    : f.temp >= 130 ? 0
    : 100 * (130 - f.temp) / 40

  // brakes: pressure 8+ nominal, 5- critical
  const brakesScore =
    f.pressure >= 8 ? 100
    : f.pressure <= 5 ? 0
    : 100 * (f.pressure - 5) / 3

  // electrical: voltage 1500+ nominal, 1200- critical
  const elecScore =
    f.voltage >= 1500 ? 100
    : f.voltage <= 1200 ? 0
    : 100 * (f.voltage - 1200) / 300

  // fuel / cooling / hydraulics / compressor – approximate from fuel %
  const fuelScore =
    f.fuel >= 20 ? 100
    : f.fuel <= 0 ? 0
    : 100 * f.fuel / 20

  return {
    engine:     clamp(engineScore),
    brakes:     clamp(brakesScore),
    electrical: clamp(elecScore),
    wheels:     clamp(f.health),          // global health proxy
    hydraulics: clamp(f.health * 0.9),
    cooling:    clamp(engineScore * 0.85),
    compressor: clamp(brakesScore * 0.9),
  }
}

/** Parse backend alert strings into UI Alert objects */
let alertIdCounter = 100
function parseAlerts(raw: string[], t: any): Alert[] {
  return raw.map((msg) => {
    const severity = msg.startsWith("CRITICAL") ? "critical"
      : msg.startsWith("WARNING") ? "warning"
      : "info"
    return {
      id: String(++alertIdCounter),
      severity,
      title: msg,
      message: "",
      timestamp: new Date(),
      component: t.engine,
    }
  })
}

// ── Language Toggle ───────────────────────────────────────────────────────────

function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-secondary/50 rounded-lg border border-border/30">
      <button
        onClick={() => setLanguage("ru")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
          language === "ru"
            ? "bg-foreground/10 text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        RU
      </button>
      <button
        onClick={() => setLanguage("kz")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
          language === "kz"
            ? "bg-foreground/10 text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        KZ
      </button>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

function CabinDashboardContent() {
  const { t } = useLanguage()

  // Refs
  const locomotiveContainerRef = useRef<HTMLDivElement>(null)
  const dragAreaRef = useRef<HTMLDivElement>(null)

  // UI state
  const [widgetPositions, setWidgetPositions] = useState(DEFAULT_WIDGET_POSITIONS)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>("5min")
  const [locomotiveFullscreen, setLocomotiveFullscreen] = useState(false)
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null)

  // ── Live telemetry ──────────────────────────────────────────────────────────
  const [telemetry, setTelemetry] = useState<TelemetryFrame>(EMPTY_TELEMETRY)
  const [connected, setConnected] = useState(false)

  // Live feed via WebSocket + fallback REST poll
  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval>

    // Initial load from REST
    fetchLatest().then((f) => {
      if (f) { setTelemetry(f); setConnected(true) }
    })

    // WebSocket live stream
    const unsubscribe = subscribeLive((frame) => {
      setTelemetry(frame)
      setConnected(true)
    })

    // REST poll every 2 s as a fallback in case WS is unavailable
    pollInterval = setInterval(async () => {
      const f = await fetchLatest()
      if (f) { setTelemetry(f); setConnected(true) }
    }, 2000)

    return () => {
      unsubscribe()
      clearInterval(pollInterval)
    }
  }, [])

  // Derive component health from live frame
  const componentHealth = useMemo(
    () => deriveComponentHealth(telemetry),
    [telemetry]
  )

  // ── Chart data ──────────────────────────────────────────────────────────────
  const [chartData, setChartData] = useState<{
    speed:       ChartDataPoint[]
    temperature: ChartDataPoint[]
    pressure:    ChartDataPoint[]
    fuel:        ChartDataPoint[]
    voltage:     ChartDataPoint[]
  }>({
    speed: [], temperature: [], pressure: [], fuel: [], voltage: [],
  })

  // Append live frames to chart buffers (keep last 300 pts)
  const MAX_CHART_PTS = 300
  useEffect(() => {
    if (telemetry.timestamp === 0) return
    const point = (value: number): ChartDataPoint => ({
      time: new Date(telemetry.timestamp).toLocaleTimeString([], {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }),
      value,
      timestamp: telemetry.timestamp,
    })
    const push = (arr: ChartDataPoint[], pt: ChartDataPoint) =>
      [...arr, pt].slice(-MAX_CHART_PTS)

    setChartData((prev) => ({
      speed:       push(prev.speed,       point(telemetry.speed)),
      temperature: push(prev.temperature, point(telemetry.temp)),
      pressure:    push(prev.pressure,    point(telemetry.pressure)),
      fuel:        push(prev.fuel,        point(telemetry.fuel)),
      voltage:     push(prev.voltage,     point(telemetry.voltage)),
    }))
  }, [telemetry])

  // Reload chart history when timeRange changes (non-live)
  useEffect(() => {
    if (timeRange === "live") return
    const range = TIME_RANGE_MAP[timeRange]
    Promise.all([
      fetchHistory(range, "speed"),
      fetchHistory(range, "temp"),
      fetchHistory(range, "pressure"),
      fetchHistory(range, "fuel"),
      fetchHistory(range, "voltage"),
    ]).then(([speed, temperature, pressure, fuel, voltage]) => {
      setChartData({ speed, temperature, pressure, fuel, voltage })
    }).catch(() => {/* keep existing data on error */})
  }, [timeRange])

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<Alert[]>([])

  // Convert backend alert strings to UI alerts on each live frame
  useEffect(() => {
    if (!telemetry.alerts?.length) return
    const newAlerts = parseAlerts(telemetry.alerts, t)
    setAlerts((prev) => {
      // Deduplicate by title – keep existing + add truly new ones
      const existing = new Set(prev.map((a) => a.title))
      const added = newAlerts.filter((a) => !existing.has(a.title))
      return added.length ? [...prev, ...added].slice(-20) : prev
    })
  }, [telemetry.alerts, t])

  const handleDismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleFixAll = useCallback(() => {
    // Clear all alerts - simulates fixing all issues
    setAlerts([])
  }, [])

  // ── Static / route data ─────────────────────────────────────────────────────
  const stations = useMemo(() => [
    { id: "1", name: "Астана",     position: 0,   type: "origin"       as const, arrivalTime: "08:00", status: "passed" as const },
    { id: "2", name: "Караганда",  position: 20,  type: "intermediate" as const, arrivalTime: "09:15", status: "passed" as const },
    { id: "3", name: "Балхаш",     position: 38,  type: "intermediate" as const, arrivalTime: "10:30", status: "current" as const },
    { id: "4", name: "Сарышаган",  position: 55,  type: "intermediate" as const, arrivalTime: "11:45" },
    { id: "5", name: "Шу",         position: 78,  type: "intermediate" as const, arrivalTime: "13:20" },
    { id: "6", name: "Алматы",     position: 100, type: "destination"  as const, arrivalTime: "14:35" },
  ], [])

  const speedZones = useMemo(() => [
    { start: 45, end: 60, speedLimit: 80, type: "restriction" as const },
    { start: 72, end: 82, speedLimit: 60, type: "warning"     as const },
  ], [])

  const warningZones = useMemo(() => [
    { position: 52, type: "construction" as const, message: t.trackMaintenance },
    { position: 75, type: "crossing"     as const, message: t.gradeCrossing },
  ], [t])

  const latencyLabel = connected ? "live" : "–"
  const statusItems = useMemo(() => [
    { label: t.connection, value: connected ? t.established : "…", status: connected ? "online" as const : "offline" as const },
    { label: t.latency,    value: latencyLabel, status: "online" as const },
    { label: t.mode,       value: t.autonomous },
    { label: t.route,      value: "AST - ALA" },
  ], [t, connected, latencyLabel])

  // ── Widget / layout handlers ────────────────────────────────────────────────
  const handleWidgetPositionChange = useCallback(
    (id: string, position: { x: number; y: number }) => {
      setWidgetPositions((prev) => ({ ...prev, [id]: position }))
    },
    []
  )

  const handleResetLayout = useCallback(() => {
    setWidgetPositions(DEFAULT_WIDGET_POSITIONS)
    Object.keys(DEFAULT_WIDGET_POSITIONS).forEach((key) =>
      localStorage.removeItem(`widget-position-${key}`)
    )
  }, [])

  const toggleLocomotiveFullscreen = useCallback(() => {
    if (!locomotiveContainerRef.current) return
    if (!locomotiveFullscreen) {
      locomotiveContainerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }, [locomotiveFullscreen])

  useEffect(() => {
    const handler = () => setLocomotiveFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  // ── Derived display values ──────────────────────────────────────────────────
  const speedDisplay      = Math.round(telemetry.speed)
  const tempDisplay       = Math.round(telemetry.temp)
  const pressureDisplay   = telemetry.pressure.toFixed(1)
  const fuelDisplay       = Math.round(telemetry.fuel)
  const voltageKv         = (telemetry.voltage / 1000).toFixed(1)
  const healthDisplay     = Math.round(telemetry.health)
  // Efficiency = health with small bias from error flag
  const efficiencyDisplay = Math.round(telemetry.health * (telemetry.error ? 0.85 : 0.95))

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-foreground/5 border border-border/50 flex items-center justify-center">
                <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-foreground/70" />
              </div>
              <div>
                <h1 className="text-base lg:text-lg font-semibold text-foreground tracking-tight">
                  {t.appTitle}
                </h1>
                <p className="text-[10px] lg:text-xs text-muted-foreground">
                  {t.realTimeMonitoring}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              <LanguageToggle />

              <div className="hidden sm:flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl bg-secondary/50 border border-border/30">
                <span className="text-[10px] lg:text-xs text-muted-foreground">{t.unit}:</span>
                <span className="text-xs lg:text-sm font-mono font-medium text-foreground">
                  LT-2847
                </span>
              </div>

              <div className={`flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl border ${
                connected
                  ? "bg-pastel-green/10 border-pastel-green/20"
                  : "bg-yellow-500/10 border-yellow-500/20"
              }`}>
                <div className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${
                  connected ? "bg-pastel-green animate-pulse" : "bg-yellow-500"
                }`} />
                <span className={`text-[10px] lg:text-xs font-medium ${
                  connected ? "text-pastel-green" : "text-yellow-500"
                }`}>
                  {connected ? t.online : "Connecting…"}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 lg:w-9 lg:h-9"
                onClick={handleResetLayout}
                title={t.resetLayout}
              >
                <RotateCcw className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </Button>
              <ReportExportButton />
              <ThemeToggleSimple />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 lg:pt-20 pb-20 lg:pb-24">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 py-4 lg:py-6">

            {/* Left/Center – Locomotive + Charts */}
            <div className="lg:col-span-8">
              {/* Locomotive */}
              <div
                ref={locomotiveContainerRef}
                className={`relative bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg transition-all duration-300 ${
                  locomotiveFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
                }`}
              >
                <div className={`flex items-center justify-between p-4 lg:p-6 pb-2 ${locomotiveFullscreen ? "pt-4" : ""}`}>
                  <div>
                    <h2 className="text-lg lg:text-xl font-semibold text-foreground">
                      {t.interactiveSystemView}
                    </h2>
                    <p className="text-xs lg:text-sm text-muted-foreground">
                      {t.clickComponentsForDetails}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={toggleLocomotiveFullscreen}
                  >
                    {locomotiveFullscreen ? (
                      <><Minimize2 className="w-3.5 h-3.5 mr-1.5" />{t.exitFullscreen}</>
                    ) : (
                      <><Maximize2 className="w-3.5 h-3.5 mr-1.5" />{t.fullscreen}</>
                    )}
                  </Button>
                </div>

                <div
                  ref={dragAreaRef}
                  className={`relative mx-4 lg:mx-6 mb-4 lg:mb-6 ${
                    locomotiveFullscreen ? "h-[calc(100vh-120px)]" : "min-h-[450px] lg:min-h-[520px]"
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[100px] border-b border-dashed border-border/20 pointer-events-none">
                    <div className="absolute top-2 left-2 text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                      {t.dragToMove}
                    </div>
                  </div>

                  <div className={`absolute inset-x-0 ${locomotiveFullscreen ? "top-[120px] bottom-4" : "top-[100px] bottom-0"}`}>
                    <InteractiveLocomotive
                      componentHealth={componentHealth}
                      telemetryData={{
                        engineTemp:          tempDisplay,
                        brakesPressure:      telemetry.pressure,
                        voltage:             telemetry.voltage,
                        fuelLevel:           fuelDisplay,
                        wheelPressure:       telemetry.pressure,
                        compressorPressure:  telemetry.pressure,
                        coolingTemp:         tempDisplay * 0.5,
                      }}
                      onComponentSelect={setSelectedComponent}
                      selectedComponent={selectedComponent}
                    />
                  </div>

                  {/* Draggable widgets – desktop only */}
                  <div className="hidden lg:block absolute inset-0">
                    <DraggableWidget id="speed" initialPosition={widgetPositions.speed} onPositionChange={handleWidgetPositionChange} containerRef={dragAreaRef}>
                      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl px-4 py-3 shadow-lg min-w-[130px]">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t.speed}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-foreground tabular-nums">{speedDisplay}</span>
                          <span className="text-xs text-muted-foreground">{t.kmh}</span>
                        </div>
                      </div>
                    </DraggableWidget>

                    <DraggableWidget id="engineTemp" initialPosition={widgetPositions.engineTemp} onPositionChange={handleWidgetPositionChange} containerRef={dragAreaRef}>
                      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl px-4 py-3 shadow-lg min-w-[130px]">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t.engineTemp}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-foreground tabular-nums">{tempDisplay}</span>
                          <span className="text-xs text-muted-foreground">{t.celsius}</span>
                        </div>
                      </div>
                    </DraggableWidget>

                    <DraggableWidget id="voltage" initialPosition={widgetPositions.voltage} onPositionChange={handleWidgetPositionChange} containerRef={dragAreaRef}>
                      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl px-4 py-3 shadow-lg min-w-[130px]">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t.voltage}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-foreground tabular-nums">{voltageKv}</span>
                          <span className="text-xs text-muted-foreground">{t.kv}</span>
                        </div>
                      </div>
                    </DraggableWidget>

                    <DraggableWidget id="brakes" initialPosition={widgetPositions.brakes} onPositionChange={handleWidgetPositionChange} containerRef={dragAreaRef}>
                      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl px-4 py-3 shadow-lg min-w-[130px]">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t.brakePressure}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-foreground tabular-nums">{pressureDisplay}</span>
                          <span className="text-xs text-muted-foreground">{t.bar}</span>
                        </div>
                      </div>
                    </DraggableWidget>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 lg:mt-6">
                <EnhancedChart
                  title={t.speedOverTime}
                  data={chartData.speed}
                  unit={t.kmh}
                  healthValue={92}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  delay={600}
                  isFullscreen={fullscreenChart === "speed"}
                  onToggleFullscreen={() => setFullscreenChart(fullscreenChart === "speed" ? null : "speed")}
                />
                <EnhancedChart
                  title={t.engineTemperature}
                  data={chartData.temperature}
                  unit={t.celsius}
                  healthValue={componentHealth.engine}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  delay={700}
                  isFullscreen={fullscreenChart === "temperature"}
                  onToggleFullscreen={() => setFullscreenChart(fullscreenChart === "temperature" ? null : "temperature")}
                />
                <EnhancedChart
                  title={t.brakePressure}
                  data={chartData.pressure}
                  unit={t.bar}
                  healthValue={componentHealth.brakes}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  delay={800}
                  isFullscreen={fullscreenChart === "pressure"}
                  onToggleFullscreen={() => setFullscreenChart(fullscreenChart === "pressure" ? null : "pressure")}
                />
                <EnhancedChart
                  title={t.systemVoltageChart}
                  data={chartData.voltage}
                  unit="V"
                  healthValue={componentHealth.electrical}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  delay={900}
                  isFullscreen={fullscreenChart === "voltage"}
                  onToggleFullscreen={() => setFullscreenChart(fullscreenChart === "voltage" ? null : "voltage")}
                />
              </div>

              {/* Route */}
              <div className="mt-4 lg:mt-6">
                <RouteSchematic
                  stations={stations}
                  speedZones={speedZones}
                  warningZones={warningZones}
                  currentPosition={38}
                  direction="forward"
                  delay={1000}
                />
              </div>
            </div>

            {/* Right – Metrics Panel */}
            <div className="lg:col-span-4">
              {/* Health Index - Centered */}
              <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 lg:p-6 shadow-lg mb-4 lg:mb-6">
                <h3 className="text-sm font-medium text-foreground mb-4 text-center">{t.health}</h3>
                <div className="flex justify-center">
                  <CircularProgress value={healthDisplay} label={t.health} size={140} strokeWidth={10} delay={200} />
                </div>
              </div>

              {/* Metric cards */}
              <ReorderableMetricCards
                storageKey="locomotive-metric-cards-order"
                items={[
                  {
                    id: "speed",
                    content: (
                      <MetricCard
                        label={t.currentSpeed}
                        value={String(speedDisplay)}
                        unit={t.kmh}
                        icon={<Gauge className="w-4 h-4" />}
                        delay={400}
                      />
                    ),
                  },
                  {
                    id: "fuel",
                    content: (
                      <MetricCard
                        label={t.fuelLevel}
                        value={String(fuelDisplay)}
                        unit={t.percent}
                        progress={fuelDisplay}
                        icon={<Fuel className="w-4 h-4" />}
                        delay={450}
                      />
                    ),
                  },
                  {
                    id: "engine-temp",
                    content: (
                      <MetricCard
                        label={t.engineTemp}
                        value={String(tempDisplay)}
                        unit={t.celsius}
                        progress={componentHealth.engine}
                        icon={<Thermometer className="w-4 h-4" />}
                        delay={500}
                      />
                    ),
                  },
                  {
                    id: "voltage",
                    content: (
                      <MetricCard
                        label={t.systemVoltage}
                        value={voltageKv}
                        unit={t.kv}
                        progress={componentHealth.electrical}
                        icon={<Zap className="w-4 h-4" />}
                        delay={550}
                      />
                    ),
                  },
                  {
                    id: "brakes",
                    content: (
                      <MetricCard
                        label={t.brakePressure}
                        value={pressureDisplay}
                        unit={t.bar}
                        progress={componentHealth.brakes}
                        icon={<Wind className="w-4 h-4" />}
                        delay={600}
                      />
                    ),
                  },
                  {
                    id: "alerts",
                    content: (
                      <AlertsPanel
                        alerts={alerts}
                        onDismiss={handleDismissAlert}
                        onFixAll={handleFixAll}
                        delay={700}
                      />
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <StatusBar items={statusItems} />

      {/* Fullscreen Chart Overlay */}
      {fullscreenChart && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl p-4 lg:p-8 flex items-center justify-center"
          onClick={() => setFullscreenChart(null)}
        >
          <div
            className="w-full max-w-6xl h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <EnhancedChart
              title={
                fullscreenChart === "speed"       ? t.speedOverTime :
                fullscreenChart === "temperature" ? t.engineTemperature :
                fullscreenChart === "pressure"    ? t.brakePressure :
                t.systemVoltageChart
              }
              data={
                fullscreenChart === "speed"       ? chartData.speed :
                fullscreenChart === "temperature" ? chartData.temperature :
                fullscreenChart === "pressure"    ? chartData.pressure :
                chartData.voltage
              }
              unit={
                fullscreenChart === "speed"       ? t.kmh :
                fullscreenChart === "temperature" ? t.celsius :
                fullscreenChart === "pressure"    ? t.bar :
                "V"
              }
              healthValue={
                fullscreenChart === "speed"       ? 92 :
                fullscreenChart === "temperature" ? componentHealth.engine :
                fullscreenChart === "pressure"    ? componentHealth.brakes :
                componentHealth.electrical
              }
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              delay={0}
              isFullscreen={true}
              onToggleFullscreen={() => setFullscreenChart(null)}
              fullscreenHeight="100%"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function CabinDashboard() {
  return (
    <LanguageProvider>
      <CabinDashboardContent />
    </LanguageProvider>
  )
}
