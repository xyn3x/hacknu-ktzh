"use client"

import { useState, useRef, useEffect } from "react"
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react"
import { fetchHistory } from "@/lib/api"
import { useLanguage } from "@/lib/i18n"

// ── types ─────────────────────────────────────────────────────────────────────

interface ReportRow {
  time: string
  speed: number
  temp: number
  pressure: number
  fuel: number
  voltage: number
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function loadReportData(): Promise<ReportRow[]> {
  const [speed, temp, pressure, fuel, voltage] = await Promise.all([
    fetchHistory("15min", "speed"),
    fetchHistory("15min", "temp"),
    fetchHistory("15min", "pressure"),
    fetchHistory("15min", "fuel"),
    fetchHistory("15min", "voltage"),
  ])

  // Align by timestamp index (all arrays same length from same query)
  const len = Math.min(speed.length, temp.length, pressure.length, fuel.length, voltage.length)
  const rows: ReportRow[] = []
  for (let i = 0; i < len; i++) {
    rows.push({
      time: speed[i].time,
      speed: Math.round(speed[i].value),
      temp: Math.round(temp[i].value),
      pressure: Math.round(pressure[i].value * 10) / 10,
      fuel: Math.round(fuel[i].value),
      voltage: Math.round(voltage[i].value),
    })
  }
  return rows
}

function avg(rows: ReportRow[], key: keyof Omit<ReportRow, "time">) {
  if (!rows.length) return 0
  return Math.round(rows.reduce((s, r) => s + (r[key] as number), 0) / rows.length)
}
function maxVal(rows: ReportRow[], key: keyof Omit<ReportRow, "time">) {
  if (!rows.length) return 0
  return Math.round(Math.max(...rows.map((r) => r[key] as number)))
}
function minVal(rows: ReportRow[], key: keyof Omit<ReportRow, "time">) {
  if (!rows.length) return 0
  return Math.round(Math.min(...rows.map((r) => r[key] as number)))
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(rows: ReportRow[], lang: "ru" | "kz") {
  const headers =
    lang === "ru"
      ? ["Время", "Скорость (км/ч)", "Температура (°C)", "Давление (бар)", "Топливо (л)", "Напряжение (В)"]
      : ["Уақыт", "Жылдамдық (км/сағ)", "Температура (°C)", "Қысым (бар)", "Отын (л)", "Кернеу (В)"]

  const lines = [headers.join(";")]
  for (const r of rows) {
    lines.push(`${r.time};${r.speed};${r.temp};${r.pressure};${r.fuel};${r.voltage}`)
  }

  const bom = "\uFEFF"
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `locotwin_report_${new Date().toISOString().slice(0, 16).replace("T", "_")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF export (via print-ready HTML in new window) ───────────────────────────

function exportPDF(rows: ReportRow[], lang: "ru" | "kz") {
  const isRu = lang === "ru"
  const now = new Date().toLocaleString(isRu ? "ru-RU" : "kk-KZ")

  const headers = isRu
    ? ["Время", "Скорость<br/>км/ч", "Темп-ра<br/>°C", "Давление<br/>бар", "Топливо<br/>л", "Напряж.<br/>В"]
    : ["Уақыт", "Жылдам.<br/>км/сағ", "Темп.<br/>°C", "Қысым<br/>бар", "Отын<br/>л", "Кернеу<br/>В"]

  const title = isRu ? "Телеметрический отчёт" : "Телеметриялық есеп"
  const unitLabel = isRu ? "Локомотив" : "Локомотив"
  const periodLabel = isRu ? "Период" : "Кезең"
  const period15 = isRu ? "Последние 15 минут" : "Соңғы 15 минут"
  const summaryTitle = isRu ? "Сводка" : "Қорытынды"
  const avgLabel = isRu ? "Среднее" : "Орташа"
  const minLabel = isRu ? "Мин" : "Мин"
  const maxLabel = isRu ? "Макс" : "Макс"
  const generatedLabel = isRu ? "Сгенерировано" : "Жасалды"
  const dataTitle = isRu ? "Данные телеметрии" : "Телеметрия деректері"

  // Sample every Nth row to keep PDF compact (max ~50 rows)
  const step = Math.max(1, Math.ceil(rows.length / 50))
  const sampled = rows.filter((_, i) => i % step === 0)

  const tableRows = sampled
    .map(
      (r) =>
        `<tr>
          <td>${r.time}</td>
          <td>${r.speed}</td>
          <td>${r.temp}</td>
          <td>${r.pressure}</td>
          <td>${r.fuel}</td>
          <td>${r.voltage}</td>
        </tr>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title} – LT-2847</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Arial, sans-serif; font-size: 10px; color: #111; background: #fff; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
    .header-left h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
    .header-left p { font-size: 10px; color: #666; margin-top: 2px; }
    .meta { font-size: 9px; color: #555; text-align: right; line-height: 1.8; }
    .meta strong { color: #111; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
    .stat-box { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; }
    .stat-box .label { font-size: 8px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
    .stat-box .metric { font-size: 11px; font-weight: 600; margin-top: 3px; }
    .stat-box .sub { font-size: 8px; color: #777; margin-top: 1px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #333; margin-bottom: 8px; border-left: 3px solid #111; padding-left: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    thead th { background: #111; color: #fff; padding: 5px 6px; text-align: center; font-weight: 600; line-height: 1.3; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    tbody td { padding: 4px 6px; text-align: center; border-bottom: 1px solid #eee; }
    tbody td:first-child { text-align: left; font-family: monospace; color: #555; }
    .footer { margin-top: 16px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 8px; color: #aaa; display: flex; justify-content: space-between; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>LocoTwin — ${title}</h1>
      <p>${unitLabel}: LT-2847 &nbsp;|&nbsp; ${periodLabel}: ${period15}</p>
    </div>
    <div class="meta">
      <div>${generatedLabel}: <strong>${now}</strong></div>
      <div>${isRu ? "Точек данных" : "Деректер нүктесі"}: <strong>${rows.length}</strong></div>
    </div>
  </div>

  <div style="margin-bottom:12px">
    <div class="section-title">${summaryTitle}</div>
    <div class="summary">
      <div class="stat-box">
        <div class="label">${isRu ? "Скорость" : "Жылдамдық"}</div>
        <div class="metric">${avg(rows, "speed")} <span style="font-weight:400;color:#888">км/${isRu ? "ч" : "сағ"}</span></div>
        <div class="sub">${minLabel} ${minVal(rows, "speed")} / ${maxLabel} ${maxVal(rows, "speed")}</div>
      </div>
      <div class="stat-box">
        <div class="label">${isRu ? "Температура" : "Температура"}</div>
        <div class="metric">${avg(rows, "temp")} <span style="font-weight:400;color:#888">°C</span></div>
        <div class="sub">${minLabel} ${minVal(rows, "temp")} / ${maxLabel} ${maxVal(rows, "temp")}</div>
      </div>
      <div class="stat-box">
        <div class="label">${isRu ? "Давление" : "Қысым"}</div>
        <div class="metric">${avg(rows, "pressure")} <span style="font-weight:400;color:#888">${isRu ? "бар" : "бар"}</span></div>
        <div class="sub">${minLabel} ${minVal(rows, "pressure")} / ${maxLabel} ${maxVal(rows, "pressure")}</div>
      </div>
      <div class="stat-box">
        <div class="label">${isRu ? "Топливо" : "Отын"}</div>
        <div class="metric">${avg(rows, "fuel")} <span style="font-weight:400;color:#888">л</span></div>
        <div class="sub">${minLabel} ${minVal(rows, "fuel")} / ${maxLabel} ${maxVal(rows, "fuel")}</div>
      </div>
      <div class="stat-box">
        <div class="label">${isRu ? "Напряжение" : "Кернеу"}</div>
        <div class="metric">${avg(rows, "voltage")} <span style="font-weight:400;color:#888">В</span></div>
        <div class="sub">${minLabel} ${minVal(rows, "voltage")} / ${maxLabel} ${maxVal(rows, "voltage")}</div>
      </div>
    </div>
  </div>

  <div class="section-title">${dataTitle}</div>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer">
    <span>LocoTwin Dashboard — LT-2847</span>
    <span>${generatedLabel}: ${now}</span>
  </div>

  <script>
    window.onload = function() { window.print(); }
  <\/script>
</body>
</html>`

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, "_blank")
  if (win) {
    win.onafterprint = () => URL.revokeObjectURL(url)
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportExportButton() {
  const { t, language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<"pdf" | "csv" | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  async function handle(type: "pdf" | "csv") {
    setLoading(type)
    setOpen(false)
    try {
      const rows = await loadReportData()
      if (type === "csv") exportCSV(rows, language)
      else exportPDF(rows, language)
    } catch (e) {
      console.error("Report export failed", e)
    } finally {
      setLoading(null)
    }
  }

  const isRu = language === "ru"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading !== null}
        title={isRu ? "Выгрузить отчёт" : "Есепті жүктеу"}
        className="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-lg hover:bg-foreground/8 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin text-muted-foreground" />
        ) : (
          <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-popover border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden py-1">
          <button
            onClick={() => handle("pdf")}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary/60 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {isRu ? "Скачать PDF" : "PDF жүктеу"}
          </button>
          <button
            onClick={() => handle("csv")}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-secondary/60 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {isRu ? "Скачать CSV" : "CSV жүктеу"}
          </button>
        </div>
      )}
    </div>
  )
}
