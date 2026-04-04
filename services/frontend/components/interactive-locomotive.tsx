"use client"

import { useEffect, useState } from "react"
import { getHealthColor } from "@/lib/health-color"
import { useLanguage } from "@/lib/i18n"
import { ComponentHotspot, type ComponentData } from "./component-hotspot"
import { Cog, Disc, Zap, Thermometer, Gauge, Wind, Droplets } from "lucide-react"

interface ComponentHealth {
  wheels: number
  engine: number
  brakes: number
  electrical: number
  hydraulics: number
  cooling: number
  compressor: number
}

interface TelemetryData {
  engineTemp: number
  brakesPressure: number
  voltage: number
  fuelLevel: number
  wheelPressure: number
  compressorPressure: number
  coolingTemp: number
}

interface InteractiveLocomotiveProps {
  componentHealth?: ComponentHealth
  telemetryData?: TelemetryData
  onComponentSelect?: (id: string) => void
  selectedComponent?: string | null
}

export function InteractiveLocomotive({ 
  componentHealth = {
    wheels: 92,
    engine: 65,
    brakes: 78,
    electrical: 95,
    hydraulics: 85,
    cooling: 72,
    compressor: 88,
  },
  telemetryData = {
    engineTemp: 87,
    brakesPressure: 6.2,
    voltage: 3200,
    fuelLevel: 78,
    wheelPressure: 8.4,
    compressorPressure: 7.8,
    coolingTemp: 42,
  },
  onComponentSelect,
  selectedComponent,
}: InteractiveLocomotiveProps) {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const colors = {
    wheels: getHealthColor(componentHealth.wheels),
    engine: getHealthColor(componentHealth.engine),
    brakes: getHealthColor(componentHealth.brakes),
    electrical: getHealthColor(componentHealth.electrical),
    hydraulics: getHealthColor(componentHealth.hydraulics),
    cooling: getHealthColor(componentHealth.cooling),
    compressor: getHealthColor(componentHealth.compressor),
  }

  // Component data for hotspots with translations
  const componentDataMap: Record<string, ComponentData> = {
    engine: {
      id: "engine",
      name: t.mainDieselEngine,
      value: telemetryData.engineTemp.toString(),
      unit: "°C",
      health: componentHealth.engine,
      description: t.engineDescription,
      icon: <Cog className="w-4 h-4" />,
    },
    brakes: {
      id: "brakes",
      name: t.brakeSystem,
      value: telemetryData.brakesPressure.toFixed(1),
      unit: t.bar,
      health: componentHealth.brakes,
      description: t.brakeDescription,
      icon: <Disc className="w-4 h-4" />,
    },
    electrical: {
      id: "electrical",
      name: t.electricalSystem,
      value: (telemetryData.voltage / 1000).toFixed(1),
      unit: t.kv,
      health: componentHealth.electrical,
      description: t.electricalDescription,
      icon: <Zap className="w-4 h-4" />,
    },
    wheels: {
      id: "wheels",
      name: t.wheelsBogies,
      value: telemetryData.wheelPressure.toFixed(1),
      unit: t.bar,
      health: componentHealth.wheels,
      description: t.wheelsDescription,
      icon: <Gauge className="w-4 h-4" />,
    },
    hydraulics: {
      id: "hydraulics",
      name: t.fuelEnergy,
      value: telemetryData.fuelLevel.toString(),
      unit: "%",
      health: componentHealth.hydraulics,
      description: t.fuelDescription,
      icon: <Droplets className="w-4 h-4" />,
    },
    cooling: {
      id: "cooling",
      name: t.coolingSystem,
      value: telemetryData.coolingTemp.toString(),
      unit: "°C",
      health: componentHealth.cooling,
      description: t.coolingDescription,
      icon: <Thermometer className="w-4 h-4" />,
    },
    compressor: {
      id: "compressor",
      name: t.compressor,
      value: telemetryData.compressorPressure.toFixed(1),
      unit: t.bar,
      health: componentHealth.compressor,
      description: t.compressorDescription,
      icon: <Wind className="w-4 h-4" />,
    },
  }

  return (
    <div className={`relative transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      {/* Ground glow */}
      <div 
        className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[90%] h-6 blur-xl rounded-full"
        style={{ backgroundColor: colors.wheels, opacity: 0.3 }}
      />

      <svg
        viewBox="0 0 900 380"
        className="w-full h-auto"
        style={{ filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.4))" }}
      >
        <defs>
          {/* Glass body shell */}
          <linearGradient id="glassBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(205,215,230,0.62)" />
            <stop offset="30%"  stopColor="rgba(180,192,210,0.42)" />
            <stop offset="70%"  stopColor="rgba(162,175,195,0.36)" />
            <stop offset="100%" stopColor="rgba(148,160,180,0.52)" />
          </linearGradient>

          {/* Top face highlight */}
          <linearGradient id="topFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(230,238,250,0.75)" />
            <stop offset="100%" stopColor="rgba(195,208,225,0.45)" />
          </linearGradient>

          {/* Cab front face */}
          <linearGradient id="cabFront" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(165,178,200,0.55)" />
            <stop offset="100%" stopColor="rgba(190,202,220,0.45)" />
          </linearGradient>

          {/* Rear face */}
          <linearGradient id="rearFace" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%"   stopColor="rgba(145,158,178,0.5)" />
            <stop offset="100%" stopColor="rgba(168,180,200,0.4)" />
          </linearGradient>

          {/* Chassis dark */}
          <linearGradient id="chassis" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(52,58,72,0.98)" />
            <stop offset="100%" stopColor="rgba(36,40,52,1)" />
          </linearGradient>

          {/* Rail */}
          <linearGradient id="rail" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(108,118,135,0.95)" />
            <stop offset="100%" stopColor="rgba(72,82,98,0.98)" />
          </linearGradient>

          {/* Wheel metal */}
          <radialGradient id="wheelMetal" cx="38%" cy="35%" r="62%">
            <stop offset="0%"   stopColor="rgba(218,225,236,0.95)" />
            <stop offset="45%"  stopColor="rgba(128,138,158,0.98)" />
            <stop offset="100%" stopColor="rgba(72,82,100,1)" />
          </radialGradient>

          {/* Wheel glow filter */}
          <filter id="wheelGlow" x="-55%" y="-55%" width="210%" height="210%">
            <feGaussianBlur stdDeviation="5.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* Component glow */}
          <filter id="compGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* Soft body shadow */}
          <filter id="bodyShadow" x="-5%" y="-5%" width="110%" height="130%">
            <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="rgba(0,0,0,0.28)"/>
          </filter>
        </defs>

        {/* ══════════════ RAILS ══════════════ */}
        <rect x="10"  y="338" width="880" height="7" rx="2" fill="url(#rail)"/>
        <rect x="10"  y="345" width="880" height="3" rx="1" fill="rgba(52,62,78,0.85)"/>
        {/* Ties */}
        {[40,125,210,295,380,465,550,635,720,808].map((x,i) => (
          <rect key={i} x={x} y="350" width="44" height="7" rx="1.5" fill="rgba(72,82,98,0.52)"/>
        ))}
        {/* Rail glow line */}
        <rect x="10" y="336" width="880" height="2.5" rx="1" fill={colors.wheels} fillOpacity="0.14"/>


        {/* ══════════════ CHASSIS / UNDERFRAME ══════════════ */}
        {/* Main chassis beam */}
        <rect x="78"  y="272" width="744" height="24" rx="4" fill="url(#chassis)"/>
        {/* Running boards / step */}
        <rect x="85"  y="290" width="730" height="9"  rx="2" fill="rgba(44,50,62,0.9)"/>
        {/* Skirt panels left + right */}
        <path d="M 92 299 L 85 338 L 815 338 L 808 299 Z" fill="rgba(40,45,57,0.88)"/>


        {/* ══════════════ FUEL / HYDRAULIC TANK (purple-lavender) ══════════════ */}
        <g filter="url(#compGlow)">
          {/* Main tank */}
          <rect
            x="185" y="280" width="530" height="46" rx="10"
            fill={colors.hydraulics} fillOpacity="0.48"
            stroke={colors.hydraulics} strokeWidth="1.8" strokeOpacity="0.78"
          />
          {/* Tank top highlight band */}
          <rect x="190" y="282" width="520" height="9" rx="5" fill={colors.hydraulics} fillOpacity="0.32"/>
          {/* End caps */}
          <ellipse cx="185" cy="303" rx="9" ry="23" fill={colors.hydraulics} fillOpacity="0.52" stroke={colors.hydraulics} strokeWidth="1" strokeOpacity="0.5"/>
          <ellipse cx="715" cy="303" rx="9" ry="23" fill={colors.hydraulics} fillOpacity="0.52" stroke={colors.hydraulics} strokeWidth="1" strokeOpacity="0.5"/>
          {/* Glow puddle */}
          <ellipse cx="450" cy="333" rx="200" ry="6" fill={colors.hydraulics} fillOpacity="0.2"/>
        </g>


        {/* ══════════════ MAIN GLASS BODY SHELL ══════════════ */}
        <g filter="url(#bodyShadow)">

          {/* ── Top flat roof face ── */}
          <path
            d="M 115 115 L 785 115 L 800 128 L 800 140 L 100 140 L 100 128 Z"
            fill="url(#topFace)"
            stroke="rgba(220,230,245,0.4)" strokeWidth="1"
          />

          {/* ── Main side body (the big glass rectangle) ── */}
          <rect
            x="100" y="128" width="700" height="148" rx="0"
            fill="url(#glassBody)"
            stroke="rgba(205,218,235,0.32)" strokeWidth="1.5"
          />

          {/* Body side 3-D bottom edge shadow */}
          <rect x="100" y="268" width="700" height="6" rx="0" fill="rgba(60,68,88,0.25)"/>

          {/* ── Cab front face (angled) ── */}
          <path
            d="M 100 128 L 100 276 L 75 276 L 75 165 Q 75 148 88 138 L 100 128 Z"
            fill="url(#cabFront)"
            stroke="rgba(200,215,232,0.28)" strokeWidth="1"
          />

          {/* ── Rear face ── */}
          <path
            d="M 800 128 L 800 276 L 822 276 L 822 162 Q 822 145 810 136 L 800 128 Z"
            fill="url(#rearFace)"
            stroke="rgba(200,215,232,0.25)" strokeWidth="1"
          />

          {/* Top face subtle edge highlight */}
          <line x1="100" y1="128" x2="800" y2="128" stroke="rgba(240,248,255,0.35)" strokeWidth="1.5"/>
          {/* Bottom edge line */}
          <line x1="100" y1="276" x2="800" y2="276" stroke="rgba(120,135,158,0.3)" strokeWidth="1"/>

        </g>


        {/* ══════════════ CAB SECTION (front left) ══════════════ */}
        {/* Cab divider wall */}
        <line x1="240" y1="128" x2="240" y2="276" stroke="rgba(170,185,208,0.22)" strokeWidth="2"/>

        {/* Main front windshield - large */}
        <rect x="105" y="145" width="110" height="75" rx="6"
          fill="rgba(62,78,112,0.52)" stroke="rgba(158,175,205,0.38)" strokeWidth="1.5"/>
        {/* Windshield glare */}
        <rect x="108" y="148" width="35" height="28" rx="4" fill="rgba(255,255,255,0.1)"/>

        {/* Side cab window */}
        <rect x="148" y="148" width="62" height="62" rx="5"
          fill="rgba(58,75,108,0.48)" stroke="rgba(155,172,202,0.32)" strokeWidth="1.2"/>
        <rect x="152" y="152" width="20" height="22" rx="3" fill="rgba(255,255,255,0.09)"/>

        {/* Cab door panel lines */}
        <path d="M 148 276 L 148 215 Q 148 210 153 208 L 236 208 L 236 276"
          fill="none" stroke="rgba(175,190,215,0.18)" strokeWidth="1"/>

        {/* Number board */}
        <rect x="108" y="228" width="70" height="22" rx="3.5"
          fill="rgba(26,30,42,0.92)" stroke="rgba(108,122,148,0.32)" strokeWidth="1"/>
        <text x="143" y="243.5" textAnchor="middle" fontSize="12" fontWeight="600"
          fill="rgba(202,215,235,0.9)" fontFamily="system-ui,-apple-system,sans-serif">
          LT-2847
        </text>

        {/* Headlights */}
        <ellipse cx="78" cy="198" rx="7" ry="10" fill="rgba(255,252,228,0.92)"/>
        <ellipse cx="78" cy="198" rx="4.5" ry="6.5" fill="rgba(255,255,248,0.98)"/>
        <ellipse cx="78" cy="198" rx="10" ry="13" fill="rgba(255,248,198,0.18)"/>
        {/* Upper marker light */}
        <rect x="84" y="152" width="22" height="14" rx="3"
          fill="rgba(255,252,228,0.32)" stroke="rgba(180,192,215,0.28)" strokeWidth="1"/>


        {/* ══════════════ ENGINE BLOCK (salmon/pink) - center visible ══════════════ */}
        <g filter="url(#compGlow)">
          {/* Ambient fill behind engine */}
          <rect x="310" y="132" width="320" height="128" rx="5" fill={colors.engine} fillOpacity="0.1"/>

          {/* Engine outer housing */}
          <rect
            x="325" y="136" width="295" height="120" rx="8"
            fill={colors.engine} fillOpacity="0.26"
            stroke={colors.engine} strokeWidth="2" strokeOpacity="0.62"
          />

          {/* Engine core block */}
          <rect
            x="342" y="148" width="158" height="92" rx="6"
            fill={colors.engine} fillOpacity="0.4"
            stroke={colors.engine} strokeWidth="1.5" strokeOpacity="0.52"
          />

          {/* Cylinders - 4 inline */}
          {[358,393,428,463].map((x,i) => (
            <g key={i}>
              <rect x={x} y="154" width="22" height="76" rx="4"
                fill={colors.engine} fillOpacity="0.5"
                stroke={colors.engine} strokeWidth="1" strokeOpacity="0.42"/>
              <rect x={x+3} y="158" width="16" height="24" rx="2.5"
                fill={colors.engine} fillOpacity="0.65"/>
              <rect x={x+6} y="161" width="10" height="9" rx="1.5"
                fill={colors.engine} fillOpacity="0.82"/>
            </g>
          ))}

          {/* Turbocharger / alternator disc - right side of engine */}
          <ellipse cx="568" cy="192" rx="46" ry="38"
            fill={colors.engine} fillOpacity="0.35"
            stroke={colors.engine} strokeWidth="1.8" strokeOpacity="0.58"/>
          <ellipse cx="568" cy="192" rx="27" ry="22"
            fill={colors.engine} fillOpacity="0.55"/>
          <ellipse cx="568" cy="192" rx="11" ry="10"
            fill={colors.engine} fillOpacity="0.82"/>
          {/* Turbo fan */}
          {[0,45,90,135].map(a => (
            <line key={a}
              x1={568+Math.cos(a*Math.PI/180)*11} y1={192+Math.sin(a*Math.PI/180)*11}
              x2={568+Math.cos(a*Math.PI/180)*24} y2={192+Math.sin(a*Math.PI/180)*24}
              stroke={colors.engine} strokeWidth="3.2" strokeOpacity="0.7" strokeLinecap="round"/>
          ))}

          {/* Exhaust stacks going up through roof */}
          <path d="M 535 148 Q 548 135 552 122 L 554 115"
            fill="none" stroke={colors.engine} strokeWidth="10" strokeOpacity="0.36" strokeLinecap="round"/>
          <path d="M 400 148 L 400 132 Q 400 122 408 118 L 428 118"
            fill="none" stroke={colors.engine} strokeWidth="8" strokeOpacity="0.3" strokeLinecap="round"/>

          {/* Heat shimmer bar at base */}
          <rect x="342" y="235" width="158" height="6" rx="3" fill={colors.engine} fillOpacity="0.52"/>
        </g>


        {/* ══════════════ COOLING / RADIATOR (right section) ══════════════ */}
        <g filter="url(#compGlow)">
          <rect
            x="645" y="142" width="98" height="112" rx="6"
            fill={colors.cooling} fillOpacity="0.26"
            stroke={colors.cooling} strokeWidth="1.5" strokeOpacity="0.55"
          />
          {/* Fins */}
          {[655,669,683,697,711,723,735].map((x,i) => (
            <rect key={i} x={x} y="150" width="7" height="96" rx="1.5"
              fill={colors.cooling} fillOpacity="0.46"/>
          ))}
          {/* Top cap */}
          <rect x="647" y="142" width="94" height="11" rx="4" fill={colors.cooling} fillOpacity="0.48"/>
        </g>


        {/* ══════════════ ELECTRICAL (front cab area) ══════════════ */}
        <g filter="url(#compGlow)">
          <rect
            x="252" y="148" width="45" height="88" rx="5"
            fill={colors.electrical} fillOpacity="0.28"
            stroke={colors.electrical} strokeWidth="1.8" strokeOpacity="0.72"
          />
          {/* Circuit traces */}
          <path d="M 262 162 L 275 162 L 275 176 L 288 176" fill="none" stroke={colors.electrical} strokeWidth="2" strokeOpacity="0.52"/>
          <path d="M 262 192 L 280 192 L 280 208" fill="none" stroke={colors.electrical} strokeWidth="2" strokeOpacity="0.52"/>
          <circle cx="268" cy="162" r="3.5" fill={colors.electrical} fillOpacity="0.52"/>
          <circle cx="282" cy="176" r="3.5" fill={colors.electrical} fillOpacity="0.52"/>
          <circle cx="280" cy="208" r="4"   fill={colors.electrical} fillOpacity="0.6"/>
          {/* Wiring to engine */}
          <path d="M 297 172 Q 310 172 318 180 L 326 188"
            fill="none" stroke={colors.electrical} strokeWidth="2" strokeOpacity="0.38"/>
        </g>


        {/* ══════════════ BRAKE SYSTEM ══════════════ */}
        <g filter="url(#compGlow)">
          <rect
            x="755" y="175" width="35" height="82" rx="5"
            fill={colors.brakes} fillOpacity="0.26"
            stroke={colors.brakes} strokeWidth="1.5" strokeOpacity="0.55"
          />
          <circle cx="772" cy="200" r="11" fill={colors.brakes} fillOpacity="0.44" stroke={colors.brakes} strokeWidth="1.2" strokeOpacity="0.4"/>
          <circle cx="772" cy="200" r="4.5" fill={colors.brakes} fillOpacity="0.68"/>
          <circle cx="772" cy="235" r="11" fill={colors.brakes} fillOpacity="0.44" stroke={colors.brakes} strokeWidth="1.2" strokeOpacity="0.4"/>
          <circle cx="772" cy="235" r="4.5" fill={colors.brakes} fillOpacity="0.68"/>
        </g>

        {/* ══════════════ COMPRESSOR ══════════════ */}
        <g filter="url(#compGlow)">
          <rect
            x="120" y="255" width="50" height="30" rx="4"
            fill={colors.compressor} fillOpacity="0.3"
            stroke={colors.compressor} strokeWidth="1.5" strokeOpacity="0.6"
          />
          <circle cx="135" cy="270" r="8" fill={colors.compressor} fillOpacity="0.5"/>
          <circle cx="155" cy="270" r="8" fill={colors.compressor} fillOpacity="0.5"/>
        </g>


        {/* ══════════════ ROOF DETAILS ══════════════ */}
        {/* Dynamic brake grilles */}
        <rect x="370" y="110" width="140" height="9" rx="3" fill="rgba(92,102,122,0.65)"/>
        <rect x="520" y="110" width="95"  height="9" rx="3" fill="rgba(92,102,122,0.55)"/>
        {/* Exhaust stack tops */}
        <rect x="402" y="88" width="20" height="25" rx="4" fill="rgba(70,80,98,0.82)"/>
        <rect x="440" y="93" width="15" height="19" rx="3" fill="rgba(70,80,98,0.72)"/>
        <ellipse cx="412" cy="89" rx="11" ry="3.2" fill="rgba(58,68,86,0.9)"/>
        <ellipse cx="448" cy="94" rx="8.5" ry="2.8" fill="rgba(58,68,86,0.85)"/>
        {/* Horn */}
        <rect x="170" y="108" width="6"  height="12" rx="2" fill="rgba(78,88,108,0.75)"/>
        <rect x="162" y="106" width="22" height="4"  rx="2" fill="rgba(78,88,108,0.72)"/>
        {/* Sand dome */}
        <ellipse cx="305" cy="120" rx="22" ry="7" fill="rgba(155,165,185,0.5)" stroke="rgba(195,208,228,0.25)" strokeWidth="1"/>

        {/* Accent stripe along body */}
        <rect x="100" y="258" width="700" height="4"   rx="1.5" fill="rgba(178,195,218,0.2)"/>
        <rect x="100" y="254" width="700" height="1.5" rx="0.5" fill="rgba(218,232,252,0.22)"/>

        {/* Rear tail light */}
        <circle cx="818" cy="185" r="5"   fill="rgba(255,72,72,0.52)" stroke="rgba(255,115,115,0.4)" strokeWidth="1"/>
        <circle cx="818" cy="185" r="2.5" fill="rgba(255,72,72,0.82)"/>

        {/* Rear coupler */}
        <rect x="820" y="242" width="20" height="26" rx="4" fill="rgba(60,68,86,0.9)" stroke="rgba(108,120,142,0.3)" strokeWidth="1"/>
        <rect x="824" y="252" width="12" height="8"  rx="2" fill="rgba(82,92,115,0.72)"/>

        {/* Front coupler */}
        <rect x="60" y="246" width="22" height="24" rx="3" fill="rgba(56,63,80,0.92)"/>
        <rect x="52" y="253" width="10" height="12" rx="2" fill="rgba(68,76,95,0.85)"/>


        {/* ══════════════ WHEELS — 6 evenly spaced ══════════════ */}
        {[148, 272, 396, 520, 644, 752].map((cx, i) => (
          <g key={i} filter="url(#wheelGlow)">
            {/* Bogie frame bar */}
            {i === 0 && <rect x="130" y="287" width="162" height="7" rx="3" fill="rgba(46,52,66,0.92)"/>}
            {i === 2 && <rect x="378" y="287" width="162" height="7" rx="3" fill="rgba(46,52,66,0.92)"/>}
            {i === 4 && <rect x="626" y="287" width="144" height="7" rx="3" fill="rgba(46,52,66,0.92)"/>}

            {/* Outer glow ring */}
            <circle cx={cx} cy="314" r="41" fill="none"
              stroke={colors.wheels} strokeWidth="5" strokeOpacity="0.52"/>
            {/* Middle glow ring */}
            <circle cx={cx} cy="314" r="34" fill="none"
              stroke={colors.wheels} strokeWidth="2.5" strokeOpacity="0.36"/>
            {/* Wheel body */}
            <circle cx={cx} cy="314" r="28" fill="url(#wheelMetal)"/>
            {/* Tread */}
            <circle cx={cx} cy="314" r="28" fill="none"
              stroke="rgba(172,182,200,0.42)" strokeWidth="3.2"/>
            {/* Inner ring */}
            <circle cx={cx} cy="314" r="20" fill="none"
              stroke="rgba(152,162,182,0.42)" strokeWidth="1.8"/>
            {/* Hub */}
            <circle cx={cx} cy="314" r="10"
              fill="rgba(82,92,115,0.95)"
              stroke={colors.wheels} strokeWidth="2.2" strokeOpacity="0.6"/>
            {/* Center pip */}
            <circle cx={cx} cy="314" r="4" fill={colors.wheels} fillOpacity="0.86"/>
            {/* Spokes */}
            {[0,45,90,135].map(a => (
              <line key={a}
                x1={cx + Math.cos(a*Math.PI/180)*11} y1={314+Math.sin(a*Math.PI/180)*11}
                x2={cx + Math.cos(a*Math.PI/180)*25} y2={314+Math.sin(a*Math.PI/180)*25}
                stroke="rgba(142,152,172,0.62)" strokeWidth="3.5" strokeLinecap="round"/>
            ))}
            {/* Ground glow puddle */}
            <ellipse cx={cx} cy="348" rx="28" ry="5" fill={colors.wheels} fillOpacity="0.22"/>
          </g>
        ))}

      </svg>

      {/* Interactive Hotspots */}
      <ComponentHotspot
        data={componentDataMap.engine}
        position={{ x: "52%", y: "45%" }}
        size="lg"
        onSelect={onComponentSelect}
        isSelected={selectedComponent === "engine"}
      />
      <ComponentHotspot
        data={componentDataMap.brakes}
        position={{ x: "87%", y: "55%" }}
        size="md"
        onSelect={onComponentSelect}
        isSelected={selectedComponent === "brakes"}
      />
      <ComponentHotspot
        data={componentDataMap.electrical}
        position={{ x: "32%", y: "48%" }}
        size="md"
        onSelect={onComponentSelect}
        isSelected={selectedComponent === "electrical"}
      />
      <ComponentHotspot
        data={componentDataMap.wheels}
        position={{ x: "45%", y: "82%" }}
        size="md"
        onSelect={onComponentSelect}
        isSelected={selectedComponent === "wheels"}
      />
      <ComponentHotspot
        data={componentDataMap.hydraulics}
        position={{ x: "50%", y: "75%" }}
        size="md"
        onSelect={onComponentSelect}
        isSelected={selectedComponent === "hydraulics"}
      />
      <ComponentHotspot
        data={componentDataMap.cooling}
        position={{ x: "78%", y: "48%" }}
        size="md"
        onSelect={onComponentSelect}
        isSelected={selectedComponent === "cooling"}
      />
      <ComponentHotspot
        data={componentDataMap.compressor}
        position={{ x: "17%", y: "68%" }}
        size="sm"
        onSelect={onComponentSelect}
        isSelected={selectedComponent === "compressor"}
      />

      <div className="absolute -bottom-6 left-0 right-0 h-8 bg-gradient-to-b from-foreground/5 to-transparent"/>
    </div>
  )
}
