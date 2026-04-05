/**
 * Returns a high-contrast color based on a health value (0-100)
 * 100 = vibrant green
 * 65 = yellow-green blend
 * 50 = bright yellow/amber
 * 35 = orange-red blend
 * 0 = bold red
 *
 * Uses oklch color space for smooth perceptual interpolation
 * Colors are more saturated for better visibility of errors/warnings
 */
export function getHealthColor(value: number): string {
  // Clamp value between 0 and 100
  const v = Math.max(0, Math.min(100, value))

  // Define color stops in oklch (lightness, chroma, hue)
  // Vibrant green: oklch(0.72 0.22 145) - high saturation
  // Bright yellow: oklch(0.80 0.20 85) - high saturation
  // Bold red: oklch(0.58 0.24 25) - high saturation, darker for contrast

  let l: number, c: number, h: number

  if (v >= 50) {
    // Interpolate between green (100) and yellow (50)
    const t = (v - 50) / 50 // 0 at 50%, 1 at 100%
    l = 0.80 + (0.72 - 0.80) * t // yellow to green lightness
    c = 0.20 + (0.22 - 0.20) * t // increase chroma for green
    h = 85 + (145 - 85) * t // yellow to green hue
  } else {
    // Interpolate between yellow (50) and red (0)
    const t = v / 50 // 0 at 0%, 1 at 50%
    l = 0.58 + (0.80 - 0.58) * t // red to yellow lightness
    c = 0.24 + (0.20 - 0.24) * t // red is more saturated
    h = 25 + (85 - 25) * t // red to yellow hue
  }

  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`
}

/**
 * Returns a CSS class-compatible color value with opacity
 */
export function getHealthColorWithOpacity(value: number, opacity: number = 1): string {
  const color = getHealthColor(value)
  if (opacity === 1) return color
  return color.replace(')', ` / ${opacity})`)
}

/**
 * Returns health status text based on value
 */
export function getHealthStatus(value: number): string {
  if (value >= 85) return "Excellent"
  if (value >= 70) return "Good"
  if (value >= 50) return "Fair"
  if (value >= 35) return "Warning"
  return "Critical"
}
