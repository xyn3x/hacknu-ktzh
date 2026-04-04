"use client"

import { useEffect, useState } from "react"
import { getHealthColor, getHealthStatus } from "@/lib/health-color"
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface HealthIndexWidgetProps {
  value: number
  trend?: "up" | "down" | "stable"
  trendValue?: number
  delay?: number
}

export function HealthIndexWidget({
  value,
  trend = "stable",
  trendValue,
  delay = 0,
}: HealthIndexWidgetProps) {
  const [mounted, setMounted] = useState(false)
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (mounted) {
      // Animate the value counting up
      let start = 0
      const end = value
      const duration = 1500
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Easing function for smooth animation
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayValue(Math.round(start + (end - start) * eased))

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [mounted, value])

  const healthColor = getHealthColor(displayValue)
  const healthStatus = getHealthStatus(displayValue)

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <div
      className={`bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-lg transition-all duration-700 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${healthColor}20` }}
          >
            <Activity className="w-5 h-5" style={{ color: healthColor }} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">System Health Index</h3>
            <p className="text-xs text-muted-foreground">Overall locomotive status</p>
          </div>
        </div>
        {trend && (
          <div 
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              trend === "up" 
                ? "bg-pastel-green/10 text-pastel-green" 
                : trend === "down" 
                ? "bg-pastel-red/10 text-pastel-red" 
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <TrendIcon className="w-3 h-3" />
            {trendValue && <span>{trend === "up" ? "+" : trend === "down" ? "-" : ""}{trendValue}%</span>}
          </div>
        )}
      </div>

      {/* Main Health Display */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span 
              className="text-5xl font-bold tabular-nums"
              style={{ color: healthColor }}
            >
              {displayValue}
            </span>
            <span className="text-2xl text-muted-foreground">%</span>
          </div>
          <p 
            className="text-sm font-medium mt-1"
            style={{ color: healthColor }}
          >
            {healthStatus}
          </p>
        </div>

        {/* Visual indicator */}
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {/* Background arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-muted/20"
              strokeDasharray="251.2"
              strokeDashoffset="62.8"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={healthColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (displayValue / 100) * 188.4}
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 8px ${healthColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="w-6 h-6" style={{ color: healthColor }} />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${displayValue}%`,
              backgroundColor: healthColor,
              boxShadow: `0 0 12px ${healthColor}`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
