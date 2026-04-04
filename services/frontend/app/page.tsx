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
import { LanguageProvider, useLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
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

// Seeded random for consistent SSR/client values
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Generate mock telemetry data with timestamps (deterministic)
function generateChartData(baseValue: number, variance: number, points: number = 24, seed: number = 1) {
  return Array.from({ length: points }, (_, i) => ({
    time: `${i * 5}s`,
    value: Math.round(baseValue + (seededRandom(seed + i) - 0.5) * variance),
    timestamp: 0,
  }))
}

// Default widget positions - positioned to utilize space above train
const DEFAULT_WIDGET_POSITIONS = {
  speed: { x: 30, y: 20 },
  engineTemp: { x: 180, y: 20 },
  voltage: { x: 330, y: 20 },
  brakes: { x: 480, y: 20 },
}

// Language Toggle Component
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

function CabinDashboardContent() {
  const { t } = useLanguage()
  
  // Refs for fullscreen
  const locomotiveContainerRef = useRef<HTMLDivElement>(null)
  const dragAreaRef = useRef<HTMLDivElement>(null)
  
  // Widget positions state
  const [widgetPositions, setWidgetPositions] = useState(DEFAULT_WIDGET_POSITIONS)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>("5min")
  const [locomotiveFullscreen, setLocomotiveFullscreen] = useState(false)
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null)

  // Mock telemetry data
  const telemetryData = useMemo(
    () => ({
      speed: 142,
      brakePressure: 6.2,
      wheelPressure: 8.4,
      engineTemp: 87,
      voltage: 3200,
      fuelLevel: 78,
      healthIndex: 94,
      efficiency: 89,
      coolingTemp: 42,
      compressorPressure: 7.8,
    }),
    []
  )

  // Component health values for the locomotive
  const componentHealth = useMemo(
    () => ({
      wheels: 92,
      engine: 65,
      brakes: 78,
      electrical: 95,
      hydraulics: 85,
      cooling: 72,
      compressor: 88,
    }),
    []
  )

  const chartData = useMemo(
    () => ({
      speed: generateChartData(140, 20, 30, 100),
      temperature: generateChartData(85, 10, 30, 200),
      pressure: generateChartData(6.5, 1.5, 30, 300),
      fuel: generateChartData(80, 5, 30, 400),
      voltage: generateChartData(3200, 100, 30, 500),
    }),
    []
  )

  // Mock alerts - use static timestamps to avoid hydration mismatch
  const [alerts, setAlerts] = useState<Alert[]>([])
  
  // Initialize alerts on client only
  useEffect(() => {
    setAlerts([
      {
        id: "1",
        severity: "warning",
        title: t.engineTempRising,
        message: t.engineTempRisingMessage,
        timestamp: new Date(Date.now() - 5 * 60000),
        component: t.engine,
      },
      {
        id: "2",
        severity: "info",
        title: t.scheduledMaintenance,
        message: t.scheduledMaintenanceMessage,
        timestamp: new Date(Date.now() - 15 * 60000),
        component: t.brakes,
      },
    ])
  }, [t])

  // Route data
  const stations = useMemo(() => [
    { id: "1", name: "Астана", position: 0, type: "origin" as const, arrivalTime: "08:00", status: "passed" as const },
    { id: "2", name: "Караганда", position: 20, type: "intermediate" as const, arrivalTime: "09:15", status: "passed" as const },
    { id: "3", name: "Балхаш", position: 38, type: "intermediate" as const, arrivalTime: "10:30", status: "current" as const },
    { id: "4", name: "Сарышаган", position: 55, type: "intermediate" as const, arrivalTime: "11:45" },
    { id: "5", name: "Шу", position: 78, type: "intermediate" as const, arrivalTime: "13:20" },
    { id: "6", name: "Алматы", position: 100, type: "destination" as const, arrivalTime: "14:35" },
  ], [])

  const speedZones = useMemo(() => [
    { start: 45, end: 60, speedLimit: 80, type: "restriction" as const },
    { start: 72, end: 82, speedLimit: 60, type: "warning" as const },
  ], [])

  const warningZones = useMemo(() => [
    { position: 52, type: "construction" as const, message: t.trackMaintenance },
    { position: 75, type: "crossing" as const, message: t.gradeCrossing },
  ], [t])

  const statusItems = useMemo(() => [
    { label: t.connection, value: t.established, status: "online" as const },
    { label: t.latency, value: "24ms", status: "online" as const },
    { label: t.mode, value: t.autonomous },
    { label: t.route, value: "AST - ALA" },
  ], [t])

  const handleWidgetPositionChange = useCallback((id: string, position: { x: number; y: number }) => {
    setWidgetPositions(prev => ({
      ...prev,
      [id]: position,
    }))
  }, [])

  const handleResetLayout = useCallback(() => {
    setWidgetPositions(DEFAULT_WIDGET_POSITIONS)
    // Clear localStorage
    Object.keys(DEFAULT_WIDGET_POSITIONS).forEach(key => {
      localStorage.removeItem(`widget-position-${key}`)
    })
  }, [])

  const handleDismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }, [])

  // Fullscreen toggle for locomotive container
  const toggleLocomotiveFullscreen = useCallback(() => {
    if (!locomotiveContainerRef.current) return
    
    if (!locomotiveFullscreen) {
      if (locomotiveContainerRef.current.requestFullscreen) {
        locomotiveContainerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }, [locomotiveFullscreen])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setLocomotiveFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

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
              {/* Language Toggle */}
              <LanguageToggle />
              
              <div className="hidden sm:flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl bg-secondary/50 border border-border/30">
                <span className="text-[10px] lg:text-xs text-muted-foreground">{t.unit}:</span>
                <span className="text-xs lg:text-sm font-mono font-medium text-foreground">
                  LT-2847
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl bg-pastel-green/10 border border-pastel-green/20">
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-pastel-green animate-pulse" />
                <span className="text-[10px] lg:text-xs font-medium text-pastel-green">
                  {t.online}
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
              <ThemeToggleSimple />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 lg:pt-20 pb-20 lg:pb-24">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 py-4 lg:py-6">
            {/* Left/Center Section - Locomotive Visualization */}
            <div className="lg:col-span-8">
              {/* Locomotive with Draggable Widgets */}
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
                      <>
                        <Minimize2 className="w-3.5 h-3.5 mr-1.5" />
                        {t.exitFullscreen}
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                        {t.fullscreen}
                      </>
                    )}
                  </Button>
                </div>

                {/* Drag Area Container - maintains permanent space above train */}
                <div 
                  ref={dragAreaRef}
                  className={`relative mx-4 lg:mx-6 mb-4 lg:mb-6 ${
                    locomotiveFullscreen ? "h-[calc(100vh-120px)]" : "min-h-[450px] lg:min-h-[520px]"
                  }`}
                >
                  {/* Reserved top area for widgets - permanent space */}
                  <div className="absolute inset-x-0 top-0 h-[100px] border-b border-dashed border-border/20 pointer-events-none">
                    <div className="absolute top-2 left-2 text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                      {t.dragToMove}
                    </div>
                  </div>

                  {/* Locomotive positioned below reserved area */}
                  <div className={`absolute inset-x-0 ${locomotiveFullscreen ? "top-[120px] bottom-4" : "top-[100px] bottom-0"}`}>
                    <InteractiveLocomotive
                      componentHealth={componentHealth}
                      telemetryData={{
                        engineTemp: telemetryData.engineTemp,
                        brakesPressure: telemetryData.brakePressure,
                        voltage: telemetryData.voltage,
                        fuelLevel: telemetryData.fuelLevel,
                        wheelPressure: telemetryData.wheelPressure,
                        compressorPressure: telemetryData.compressorPressure,
                        coolingTemp: telemetryData.coolingTemp,
                      }}
                      onComponentSelect={setSelectedComponent}
                      selectedComponent={selectedComponent}
                    />
                  </div>

                  {/* Draggable Telemetry Widgets - Hidden on mobile */}
                  <div className="hidden lg:block absolute inset-0">
                    <DraggableWidget
                      id="speed"
                      initialPosition={widgetPositions.speed}
                      onPositionChange={handleWidgetPositionChange}
                      containerRef={dragAreaRef}
                    >
                      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl px-4 py-3 shadow-lg min-w-[130px]">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          {t.speed}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-foreground tabular-nums">
                            {telemetryData.speed}
                          </span>
                          <span className="text-xs text-muted-foreground">{t.kmh}</span>
                        </div>
                      </div>
                    </DraggableWidget>

                    <DraggableWidget
                      id="engineTemp"
                      initialPosition={widgetPositions.engineTemp}
                      onPositionChange={handleWidgetPositionChange}
                      containerRef={dragAreaRef}
                    >
                      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl px-4 py-3 shadow-lg min-w-[130px]">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          {t.engineTemp}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-foreground tabular-nums">
                            {telemetryData.engineTemp}
                          </span>
                          <span className="text-xs text-muted-foreground">{t.celsius}</span>
                        </div>
                      </div>
                    </DraggableWidget>

                    <DraggableWidget
                      id="voltage"
                      initialPosition={widgetPositions.voltage}
                      onPositionChange={handleWidgetPositionChange}
                      containerRef={dragAreaRef}
                    >
                      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl px-4 py-3 shadow-lg min-w-[130px]">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          {t.voltage}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-foreground tabular-nums">
                            {(telemetryData.voltage / 1000).toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">{t.kv}</span>
                        </div>
                      </div>
                    </DraggableWidget>

                    <DraggableWidget
                      id="brakes"
                      initialPosition={widgetPositions.brakes}
                      onPositionChange={handleWidgetPositionChange}
                      containerRef={dragAreaRef}
                    >
                      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl px-4 py-3 shadow-lg min-w-[130px]">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          {t.brakePressure}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-semibold text-foreground tabular-nums">
                            {telemetryData.brakePressure.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">{t.bar}</span>
                        </div>
                      </div>
                    </DraggableWidget>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
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

              {/* Route Schematic */}
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

            {/* Right Section - Metrics Panel */}
            <div className="lg:col-span-4">
              {/* Circular Progress Indicators - Not draggable */}
              <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 lg:p-6 shadow-lg mb-4 lg:mb-6">
                <h3 className="text-sm font-medium text-foreground mb-4">
                  {t.systemEfficiency}
                </h3>
                <div className="flex justify-around">
                  <CircularProgress
                    value={telemetryData.healthIndex}
                    label={t.health}
                    delay={200}
                  />
                  <CircularProgress
                    value={telemetryData.efficiency}
                    label={t.efficiency}
                    delay={300}
                  />
                </div>
              </div>

              {/* Reorderable Metric Cards */}
              <ReorderableMetricCards
                storageKey="locomotive-metric-cards-order"
                items={[
                  {
                    id: "speed",
                    content: (
                      <MetricCard
                        label={t.currentSpeed}
                        value={telemetryData.speed.toString()}
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
                        value={telemetryData.fuelLevel.toString()}
                        unit={t.percent}
                        progress={telemetryData.fuelLevel}
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
                        value={telemetryData.engineTemp.toString()}
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
                        value={(telemetryData.voltage / 1000).toFixed(1)}
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
                        value={telemetryData.brakePressure.toFixed(1)}
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
            onClick={e => e.stopPropagation()}
          >
            <EnhancedChart
              title={
                fullscreenChart === "speed" ? t.speedOverTime :
                fullscreenChart === "temperature" ? t.engineTemperature :
                fullscreenChart === "pressure" ? t.brakePressure :
                t.systemVoltageChart
              }
              data={
                fullscreenChart === "speed" ? chartData.speed :
                fullscreenChart === "temperature" ? chartData.temperature :
                fullscreenChart === "pressure" ? chartData.pressure :
                chartData.voltage
              }
              unit={
                fullscreenChart === "speed" ? t.kmh :
                fullscreenChart === "temperature" ? t.celsius :
                fullscreenChart === "pressure" ? t.bar :
                "V"
              }
              healthValue={
                fullscreenChart === "speed" ? 92 :
                fullscreenChart === "temperature" ? componentHealth.engine :
                fullscreenChart === "pressure" ? componentHealth.brakes :
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
