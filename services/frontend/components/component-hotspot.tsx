"use client"

import { useState } from "react"
import { getHealthColor } from "@/lib/health-color"
import { useLanguage } from "@/lib/i18n"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComponentData {
  id: string
  name: string
  value: string
  unit: string
  health: number
  description: string
  icon?: React.ReactNode
}

interface ComponentHotspotProps {
  data: ComponentData
  position: { x: string; y: string }
  size?: "sm" | "md" | "lg"
  onSelect?: (id: string) => void
  isSelected?: boolean
}

export function ComponentHotspot({
  data,
  position,
  size = "md",
  onSelect,
  isSelected = false,
}: ComponentHotspotProps) {
  const { t } = useLanguage()
  const [isHovered, setIsHovered] = useState(false)
  const healthColor = getHealthColor(data.health)
  
  // Get translated health status
  const getHealthStatus = (value: number): string => {
    if (value >= 85) return t.excellent
    if (value >= 70) return t.good
    if (value >= 50) return t.fair
    if (value >= 35) return t.poor
    return t.critical
  }
  const healthStatus = getHealthStatus(data.health)

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  const pulseSize = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }

  return (
    <div
      className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: position.x, top: position.y }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`relative flex items-center justify-center cursor-pointer group transition-transform duration-200 ${
              isSelected ? "scale-125" : "hover:scale-110"
            }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect?.(data.id)}
            aria-label={`${data.name}: ${data.value} ${data.unit}`}
          >
            {/* Pulse ring */}
            <div
              className={`absolute ${pulseSize[size]} rounded-full animate-ping`}
              style={{ 
                backgroundColor: healthColor, 
                opacity: isHovered || isSelected ? 0.4 : 0.2 
              }}
            />
            
            {/* Outer glow ring */}
            <div
              className={`absolute ${pulseSize[size]} rounded-full transition-opacity duration-200`}
              style={{
                backgroundColor: healthColor,
                opacity: isHovered || isSelected ? 0.25 : 0.1,
                filter: "blur(4px)",
              }}
            />

            {/* Main dot */}
            <div
              className={`relative ${sizeClasses[size]} rounded-full border-2 transition-all duration-200`}
              style={{
                backgroundColor: healthColor,
                borderColor: `${healthColor}`,
                boxShadow: `0 0 12px ${healthColor}, 0 0 24px ${healthColor}40`,
              }}
            />
          </button>
        </PopoverTrigger>
        
        <PopoverContent
          className="w-72 p-0 bg-glass backdrop-blur-xl border border-glass-border shadow-xl"
          sideOffset={8}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {data.icon && (
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${healthColor}20` }}
                  >
                    <span style={{ color: healthColor }}>{data.icon}</span>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{data.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: healthColor }}
                    />
                    <span 
                      className="text-xs font-medium"
                      style={{ color: healthColor }}
                    >
                      {healthStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {data.value}
              </span>
              <span className="text-sm text-muted-foreground">{data.unit}</span>
            </div>

            {/* Health Progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Health Score</span>
                <span style={{ color: healthColor }}>{data.health}%</span>
              </div>
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${data.health}%`,
                    backgroundColor: healthColor,
                    boxShadow: `0 0 8px ${healthColor}`,
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
