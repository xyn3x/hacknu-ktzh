"use client"

import { useEffect, useState, useMemo } from "react"
import { MapPin, AlertTriangle, ArrowRight, Clock, Navigation } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Station {
  id: string
  name: string
  position: number // 0-100 percentage
  type: "origin" | "destination" | "intermediate" | "current"
  arrivalTime?: string
  status?: "passed" | "current" | "upcoming"
}

interface SpeedZone {
  start: number
  end: number
  speedLimit: number
  type: "restriction" | "normal" | "warning"
}

interface WarningZone {
  position: number
  type: "construction" | "signal" | "crossing"
  message: string
}

interface RouteSchematicProps {
  stations: Station[]
  speedZones?: SpeedZone[]
  warningZones?: WarningZone[]
  currentPosition?: number // 0-100
  direction?: "forward" | "backward"
  delay?: number
}

export function RouteSchematic({
  stations,
  speedZones = [],
  warningZones = [],
  currentPosition = 35,
  direction = "forward",
  delay = 0,
}: RouteSchematicProps) {
  const [mounted, setMounted] = useState(false)
  const [animatedPosition, setAnimatedPosition] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => setAnimatedPosition(currentPosition), 200)
      return () => clearTimeout(timer)
    }
  }, [mounted, currentPosition])

  const sortedStations = useMemo(() => {
    return [...stations].sort((a, b) => a.position - b.position)
  }, [stations])

  const getStationStatus = (station: Station): "passed" | "current" | "upcoming" => {
    if (station.status) return station.status
    if (station.position < animatedPosition - 2) return "passed"
    if (station.position > animatedPosition + 2) return "upcoming"
    return "current"
  }

  const getSpeedZoneColor = (zone: SpeedZone) => {
    switch (zone.type) {
      case "restriction":
        return "bg-pastel-yellow/40"
      case "warning":
        return "bg-pastel-red/30"
      default:
        return "bg-pastel-green/20"
    }
  }

  return (
    <div
      className={`bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg transition-all duration-700 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Route Progress</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowRight className={`w-3.5 h-3.5 ${direction === "backward" ? "rotate-180" : ""}`} />
            <span>{direction === "forward" ? "Eastbound" : "Westbound"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>ETA: 14:35</span>
          </div>
        </div>
      </div>

      {/* Schematic */}
      <div className="px-5 py-6">
        <TooltipProvider>
          {/* Main track visualization */}
          <div className="relative">
            {/* Speed zone backgrounds */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 flex">
              {speedZones.map((zone, i) => (
                <div
                  key={i}
                  className={`absolute h-full rounded ${getSpeedZoneColor(zone)}`}
                  style={{
                    left: `${zone.start}%`,
                    width: `${zone.end - zone.start}%`,
                  }}
                />
              ))}
            </div>

            {/* Track base */}
            <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden">
              {/* Passed section */}
              <div
                className="absolute inset-y-0 left-0 bg-pastel-green/50 rounded-l-full transition-all duration-1000 ease-out"
                style={{ width: `${animatedPosition}%` }}
              />
              
              {/* Track markers */}
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pos) => (
                <div
                  key={pos}
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-border/50"
                  style={{ left: `${pos}%` }}
                />
              ))}
            </div>

            {/* Train position indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-1000 ease-out"
              style={{ left: `${animatedPosition}%` }}
            >
              <div className="relative">
                {/* Pulse */}
                <div className="absolute inset-0 w-8 h-8 -m-2 rounded-full bg-pastel-green animate-ping opacity-30" />
                {/* Train icon */}
                <div className="w-4 h-4 rounded-full bg-pastel-green border-2 border-background shadow-lg flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-background" />
                </div>
                {/* Direction arrow */}
                <ArrowRight 
                  className={`absolute -top-5 left-1/2 -translate-x-1/2 w-3 h-3 text-pastel-green ${
                    direction === "backward" ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {/* Stations */}
            <div className="absolute inset-x-0 -top-3">
              {sortedStations.map((station) => {
                const status = getStationStatus(station)
                
                return (
                  <Tooltip key={station.id}>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute -translate-x-1/2 cursor-pointer group"
                        style={{ left: `${station.position}%` }}
                      >
                        {/* Station marker */}
                        <div
                          className={`relative w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                            status === "passed"
                              ? "bg-pastel-green/20 border-pastel-green/50"
                              : status === "current"
                              ? "bg-pastel-green border-pastel-green shadow-lg shadow-pastel-green/30"
                              : "bg-secondary border-border hover:border-foreground/50"
                          }`}
                        >
                          {station.type === "origin" || station.type === "destination" ? (
                            <MapPin
                              className={`absolute inset-0 m-auto w-2.5 h-2.5 ${
                                status === "passed" ? "text-pastel-green" : "text-foreground/70"
                              }`}
                            />
                          ) : (
                            <div
                              className={`absolute inset-0 m-auto w-1.5 h-1.5 rounded-full ${
                                status === "passed"
                                  ? "bg-pastel-green"
                                  : status === "current"
                                  ? "bg-background"
                                  : "bg-muted-foreground"
                              }`}
                            />
                          )}
                        </div>
                        
                        {/* Station label */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-medium ${
                              status === "current"
                                ? "text-pastel-green"
                                : status === "passed"
                                ? "text-muted-foreground"
                                : "text-foreground/70"
                            }`}
                          >
                            {station.name}
                          </span>
                          {station.arrivalTime && (
                            <span className="block text-[9px] text-muted-foreground text-center">
                              {station.arrivalTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{station.name}</p>
                      {station.arrivalTime && (
                        <p className="text-muted-foreground">{status === "passed" ? "Departed" : "Arrival"}: {station.arrivalTime}</p>
                      )}
                      <p className="text-muted-foreground capitalize">{status}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            {/* Warning zones */}
            {warningZones.map((warning, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-pointer"
                    style={{ left: `${warning.position}%` }}
                  >
                    <div className="w-5 h-5 rounded-full bg-pastel-yellow/20 border border-pastel-yellow/50 flex items-center justify-center animate-pulse">
                      <AlertTriangle className="w-2.5 h-2.5 text-pastel-yellow" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium capitalize">{warning.type}</p>
                  <p className="text-muted-foreground">{warning.message}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-10 pt-4 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-pastel-green" />
            <span>Passed</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-pastel-yellow" />
            <span>Speed Restriction</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="w-3 h-3 text-pastel-yellow" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>Station</span>
          </div>
        </div>
      </div>
    </div>
  )
}
