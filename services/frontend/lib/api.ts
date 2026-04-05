/**
 * API client for the API Gateway.
 * Base URL is read from NEXT_PUBLIC_API_URL (defaults to /api so the
 * Next.js rewrites proxy handles it in development and Docker).
 */

export interface TelemetryFrame {
  timestamp: number
  speed: number
  temp: number
  pressure: number
  fuel: number
  voltage: number
  error: boolean
  health: number
  alerts: string[]
}

export interface ChartDataPoint {
  time: string
  value: number
  timestamp: number
}

// ── config ────────────────────────────────────────────────────────────────────

const API_BASE =
  (typeof window !== "undefined"
    ? (window as any).__NEXT_PUBLIC_API_URL
    : undefined) ??
  process.env.NEXT_PUBLIC_API_URL ??
  "/api"

function wsBase() {
  if (typeof window === "undefined") return ""
  const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:"
  // If NEXT_PUBLIC_API_URL is set to an absolute URL, derive ws from it
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (raw && raw.startsWith("http")) {
    return raw.replace(/^http/, "ws")
  }
  return `${wsProto}//${window.location.host}`
}

// ── REST helpers ──────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(API_BASE + path, window.location.href)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json()
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fetch the single most recent telemetry frame. */
export async function fetchLatest(): Promise<TelemetryFrame | null> {
  try {
    return await get<TelemetryFrame>("/telemetry/latest")
  } catch {
    return null
  }
}

export type HistoryRange = "5min" | "15min" | "30min" | "1h"

const RANGE_MS: Record<HistoryRange, number> = {
  "5min":  5  * 60 * 1000,
  "15min": 15 * 60 * 1000,
  "30min": 30 * 60 * 1000,
  "1h":    60 * 60 * 1000,
}

/**
 * Fetch historical telemetry frames.
 * For ranges ≥ 15 min it requests 1-minute downsampled buckets from the DB.
 */
export async function fetchHistory(
  range: HistoryRange,
  metric: keyof Pick<TelemetryFrame, "speed" | "temp" | "pressure" | "fuel" | "voltage">
): Promise<ChartDataPoint[]> {
  const fromMs = Date.now() - RANGE_MS[range]
  const downsample = range !== "5min"
  const frames = await get<TelemetryFrame[]>("/telemetry/history", {
    from: String(fromMs),
    limit: "500",
    downsample: String(downsample),
  })
  return frames.map((f) => ({
    time: new Date(f.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    value: Number((f[metric] as number).toFixed(2)),
    timestamp: f.timestamp,
  }))
}

// ── WebSocket live feed ───────────────────────────────────────────────────────

export type LiveHandler = (frame: TelemetryFrame) => void

/**
 * Opens a WebSocket to /api/ws and calls handler for every message.
 * Returns a cleanup function.
 */
export function subscribeLive(handler: LiveHandler): () => void {
  const base = wsBase()
  if (!base) return () => {}

  const wsPath = API_BASE.startsWith("/") ? API_BASE + "/ws" : "/api/ws"
  const url = base + wsPath

  let ws: WebSocket
  let closed = false
  let retryTimer: ReturnType<typeof setTimeout>

  function connect() {
    if (closed) return
    ws = new WebSocket(url)

    ws.onmessage = (ev) => {
      try {
        const frame: TelemetryFrame = JSON.parse(ev.data)
        handler(frame)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      if (!closed) {
        // Reconnect after 2 s
        retryTimer = setTimeout(connect, 2000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  connect()

  return () => {
    closed = true
    clearTimeout(retryTimer)
    ws?.close()
  }
}
