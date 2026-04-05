"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, AlertCircle, Info, Bell, X, Wrench } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

export type AlertSeverity = "critical" | "warning" | "info"

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  timestamp: Date
  component?: string
}

interface AlertsPanelProps {
  alerts: Alert[]
  onDismiss?: (id: string) => void
  onFixAll?: () => void
  delay?: number
}

export function AlertsPanel({ alerts, onDismiss, onFixAll, delay = 0 }: AlertsPanelProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const getSeverityConfig = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return {
          icon: AlertCircle,
          bgColor: "bg-red-500/20",
          borderColor: "border-red-500/50",
          iconColor: "text-red-500",
          dotColor: "bg-red-500",
          pulseColor: "animate-pulse",
        }
      case "warning":
        return {
          icon: AlertTriangle,
          bgColor: "bg-amber-500/20",
          borderColor: "border-amber-500/50",
          iconColor: "text-amber-500",
          dotColor: "bg-amber-500",
          pulseColor: "",
        }
      case "info":
      default:
        return {
          icon: Info,
          bgColor: "bg-primary/10",
          borderColor: "border-primary/30",
          iconColor: "text-primary",
          dotColor: "bg-primary",
          pulseColor: "",
        }
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
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
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Alerts</h3>
          {alerts.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/30 text-red-500 animate-pulse">
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length > 0 && onFixAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFixAll}
            className="h-7 px-3 text-xs gap-1.5 border-pastel-green/50 text-pastel-green hover:bg-pastel-green/10 hover:text-pastel-green"
          >
            <Wrench className="w-3 h-3" />
            Fix All
          </Button>
        )}
      </div>

      {/* Alerts List */}
      <ScrollArea className="h-[280px]">
        <div className="p-3">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-pastel-green/10 flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-pastel-green" />
              </div>
              <p className="text-sm font-medium text-foreground">No active alerts</p>
              <p className="text-xs text-muted-foreground mt-1">
                All systems operating normally
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const config = getSeverityConfig(alert.severity)
                const Icon = config.icon

                return (
                  <div
                    key={alert.id}
                    className={`relative p-3 rounded-xl ${config.bgColor} border-2 ${config.borderColor} group transition-all duration-200 hover:scale-[1.01] ${config.pulseColor}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Severity indicator */}
                      <div className={`mt-0.5 p-1.5 rounded-lg ${config.bgColor}`}>
                        <Icon className={`w-4 h-4 ${config.iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                          <p className="text-sm font-medium text-foreground truncate">
                            {alert.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {alert.component && (
                            <span className="text-xs px-2 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                              {alert.component}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatTime(alert.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Dismiss button */}
                      {onDismiss && (
                        <button
                          onClick={() => onDismiss(alert.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-secondary/50 transition-all"
                          aria-label="Dismiss alert"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
