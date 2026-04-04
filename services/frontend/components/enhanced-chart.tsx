"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts"
import { getHealthColor } from "@/lib/health-color"
import { useLanguage } from "@/lib/i18n"
import { ZoomIn, RotateCcw, Maximize2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export type TimeRange = "live" | "5min" | "15min" | "30min"

interface ChartDataPoint {
  time: string
  value: number
  timestamp?: number
}

interface EnhancedChartProps {
  title: string
  data: ChartDataPoint[]
  unit: string
  healthValue?: number
  delay?: number
  showGrid?: boolean
  showAverage?: boolean
  onTimeRangeChange?: (range: TimeRange) => void
  timeRange?: TimeRange
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  fullscreenHeight?: string
}

export function EnhancedChart({
  title,
  data,
  unit,
  healthValue,
  delay = 0,
  showGrid = true,
  showAverage = true,
  onTimeRangeChange,
  timeRange: externalTimeRange,
  isFullscreen = false,
  onToggleFullscreen,
  fullscreenHeight,
}: EnhancedChartProps) {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRange>("5min")
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null)
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null)
  const [zoomDomain, setZoomDomain] = useState<{ left: number; right: number } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [hoveredData, setHoveredData] = useState<ChartDataPoint | null>(null)

  const timeRange = externalTimeRange ?? internalTimeRange

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  // Calculate health value from data if not provided
  const calculatedHealth = useMemo(() => {
    if (healthValue !== undefined) return healthValue
    const latestValue = data[data.length - 1]?.value || 0
    return Math.min(100, latestValue)
  }, [healthValue, data])

  const chartColor = getHealthColor(calculatedHealth)

  // Calculate average, min, max
  const stats = useMemo(() => {
    if (data.length === 0) return { avg: 0, min: 0, max: 0 }
    const values = data.map(d => d.value)
    return {
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    }
  }, [data])

  // Calculate domain with auto-scaling
  const { minValue, maxValue } = useMemo(() => {
    if (data.length === 0) return { minValue: 0, maxValue: 100 }
    const values = data.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = (max - min) * 0.15 || 10
    return {
      minValue: Math.floor(min - padding),
      maxValue: Math.ceil(max + padding),
    }
  }, [data])

  const handleTimeRangeChange = (range: TimeRange) => {
    setInternalTimeRange(range)
    onTimeRangeChange?.(range)
    setZoomDomain(null)
  }

  const handleMouseDown = useCallback((e: { activeLabel?: string }) => {
    if (e?.activeLabel) {
      setRefAreaLeft(e.activeLabel)
      setIsSelecting(true)
    }
  }, [])

  const handleMouseMove = useCallback((e: { activeLabel?: string; activePayload?: Array<{ payload: ChartDataPoint }> }) => {
    if (isSelecting && e?.activeLabel) {
      setRefAreaRight(e.activeLabel)
    }
    if (e?.activePayload?.[0]) {
      setHoveredData(e.activePayload[0].payload)
    }
  }, [isSelecting])

  const handleMouseUp = useCallback(() => {
    if (refAreaLeft && refAreaRight) {
      const leftIndex = data.findIndex(d => d.time === refAreaLeft)
      const rightIndex = data.findIndex(d => d.time === refAreaRight)
      
      if (leftIndex !== -1 && rightIndex !== -1) {
        const [left, right] = leftIndex < rightIndex 
          ? [leftIndex, rightIndex] 
          : [rightIndex, leftIndex]
        
        if (right - left > 1) {
          setZoomDomain({ left, right })
        }
      }
    }
    setRefAreaLeft(null)
    setRefAreaRight(null)
    setIsSelecting(false)
  }, [refAreaLeft, refAreaRight, data])

  const handleMouseLeave = useCallback(() => {
    setHoveredData(null)
    if (isSelecting) {
      handleMouseUp()
    }
  }, [isSelecting, handleMouseUp])

  const handleReset = () => {
    setZoomDomain(null)
  }

  const zoomedData = useMemo(() => {
    if (!zoomDomain) return data
    return data.slice(zoomDomain.left, zoomDomain.right + 1)
  }, [data, zoomDomain])

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: "live", label: t.live },
    { value: "5min", label: t.min5 },
    { value: "15min", label: t.min15 },
    { value: "30min", label: t.min30 },
  ]

  const chartHeight = isFullscreen 
    ? fullscreenHeight || "calc(100% - 100px)" 
    : "160px"

  return (
    <div
      className={`bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg transition-all duration-700 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${isFullscreen ? "h-full flex flex-col" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-5 pt-5 pb-3 ${isFullscreen ? "pb-4" : ""}`}>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className={`font-medium text-foreground ${isFullscreen ? "text-xl" : "text-sm"}`}>
              {title}
            </h3>
            {isFullscreen && onToggleFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={onToggleFullscreen}
                title={t.exitFullscreen}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className={`flex items-center gap-3 mt-1 ${isFullscreen ? "text-base" : ""}`}>
            <span 
              className={`font-semibold tabular-nums ${isFullscreen ? "text-2xl" : "text-lg"}`}
              style={{ color: chartColor }}
            >
              {hoveredData?.value ?? data[data.length - 1]?.value ?? "-"} {unit}
            </span>
            {showAverage && (
              <span className="text-xs text-muted-foreground">
                {t.avg}: {stats.avg.toFixed(1)} {unit}
              </span>
            )}
            {isFullscreen && (
              <>
                <span className="text-xs text-muted-foreground">
                  min: {stats.min.toFixed(1)} {unit}
                </span>
                <span className="text-xs text-muted-foreground">
                  max: {stats.max.toFixed(1)} {unit}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Time range buttons */}
          <div className="flex gap-0.5 p-0.5 bg-secondary/50 rounded-lg">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => handleTimeRangeChange(range.value)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all duration-200 ${
                  timeRange === range.value
                    ? "bg-foreground/10 text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          {/* Zoom controls */}
          <div className="flex gap-1 border-l border-border/50 pl-2">
            {zoomDomain && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={handleReset}
                title={t.resetZoom}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
            {onToggleFullscreen && !isFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={onToggleFullscreen}
                title={t.fullscreen}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div 
        className={`px-2 pb-4 ${isFullscreen ? "flex-1" : ""}`}
        style={{ height: isFullscreen ? undefined : chartHeight }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={zoomedData}
            margin={{ top: 10, right: 20, bottom: 5, left: isFullscreen ? 20 : 10 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                strokeOpacity={0.3}
                vertical={false}
              />
            )}
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isFullscreen ? 12 : 10, fill: "var(--muted-foreground)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minValue, maxValue]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isFullscreen ? 12 : 10, fill: "var(--muted-foreground)" }}
              width={isFullscreen ? 50 : 35}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              cursor={{ stroke: chartColor, strokeWidth: 1, strokeOpacity: 0.5 }}
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontSize: isFullscreen ? "14px" : "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                padding: "12px 16px",
              }}
              labelStyle={{ color: "var(--foreground)", fontWeight: 500, marginBottom: 4 }}
              formatter={(value: number) => [
                <span key="value" style={{ color: chartColor, fontWeight: 600, fontSize: isFullscreen ? "16px" : "14px" }}>
                  {value} {unit}
                </span>,
                "",
              ]}
            />
            
            {/* Average line */}
            {showAverage && (
              <ReferenceLine
                y={stats.avg}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
            )}
            
            {/* Zoom selection area */}
            {refAreaLeft && refAreaRight && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                strokeOpacity={0.3}
                fill={chartColor}
                fillOpacity={0.2}
                stroke={chartColor}
              />
            )}

            {/* Area fill */}
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill={`url(#gradient-${title.replace(/\s/g, '')})`}
              fillOpacity={1}
            />
            
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={isFullscreen ? 3 : 2}
              dot={false}
              activeDot={{
                r: isFullscreen ? 7 : 5,
                fill: chartColor,
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
              style={{
                filter: `drop-shadow(0 0 ${isFullscreen ? "10px" : "6px"} ${chartColor})`,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Zoom indicator */}
      {zoomDomain && (
        <div className={`px-5 pb-3 ${isFullscreen ? "pb-4" : ""}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ZoomIn className="w-3 h-3" />
            <span>{t.zoomedView}</span>
          </div>
        </div>
      )}

      {/* Drag to zoom hint when not zoomed */}
      {!zoomDomain && isFullscreen && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ZoomIn className="w-3 h-3" />
            <span>{t.dragToZoom}</span>
          </div>
        </div>
      )}
    </div>
  )
}
