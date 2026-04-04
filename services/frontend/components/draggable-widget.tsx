"use client"

import { useState, useRef, useEffect, type ReactNode } from "react"
import { GripVertical } from "lucide-react"

interface Position {
  x: number
  y: number
}

interface DraggableWidgetProps {
  id: string
  children: ReactNode
  initialPosition: Position
  onPositionChange?: (id: string, position: Position) => void
  containerRef?: React.RefObject<HTMLDivElement | null>
  className?: string
}

const GRID_SIZE = 10 // Soft snap grid size

export function DraggableWidget({
  id,
  children,
  initialPosition,
  onPositionChange,
  containerRef,
  className = "",
}: DraggableWidgetProps) {
  const [position, setPosition] = useState<Position>(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)

  // Update position when initialPosition changes (e.g., on reset)
  useEffect(() => {
    setPosition(initialPosition)
  }, [initialPosition])

  // Load position from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`widget-position-${id}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPosition(parsed)
      } catch {
        // Ignore parse errors
      }
    }
  }, [id])

  // Save position to localStorage when it changes
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(`widget-position-${id}`, JSON.stringify(position))
    }
  }, [id, position, isDragging])

  const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    
    if (widgetRef.current && e.touches.length === 1) {
      const touch = e.touches[0]
      const rect = widgetRef.current.getBoundingClientRect()
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && widgetRef.current) {
        const container = containerRef?.current || widgetRef.current.parentElement
        if (container) {
          const containerRect = container.getBoundingClientRect()
          const widgetRect = widgetRef.current.getBoundingClientRect()
          
          let newX = e.clientX - containerRect.left - dragOffset.x
          let newY = e.clientY - containerRect.top - dragOffset.y
          
          // Constrain within container bounds
          const maxX = containerRect.width - widgetRect.width
          const maxY = containerRect.height - widgetRect.height
          
          newX = Math.max(0, Math.min(newX, maxX))
          newY = Math.max(0, Math.min(newY, maxY))
          
          // Apply soft snap to grid
          newX = snapToGrid(newX)
          newY = snapToGrid(newY)
          
          setPosition({ x: newX, y: newY })
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && widgetRef.current && e.touches.length === 1) {
        const touch = e.touches[0]
        const container = containerRef?.current || widgetRef.current.parentElement
        if (container) {
          const containerRect = container.getBoundingClientRect()
          const widgetRect = widgetRef.current.getBoundingClientRect()
          
          let newX = touch.clientX - containerRect.left - dragOffset.x
          let newY = touch.clientY - containerRect.top - dragOffset.y
          
          // Constrain within container bounds
          const maxX = containerRect.width - widgetRect.width
          const maxY = containerRect.height - widgetRect.height
          
          newX = Math.max(0, Math.min(newX, maxX))
          newY = Math.max(0, Math.min(newY, maxY))
          
          // Apply soft snap to grid
          newX = snapToGrid(newX)
          newY = snapToGrid(newY)
          
          setPosition({ x: newX, y: newY })
        }
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        onPositionChange?.(id, position)
      }
    }

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false)
        onPositionChange?.(id, position)
      }
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("touchend", handleTouchEnd)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isDragging, dragOffset, id, onPositionChange, position, containerRef])

  return (
    <div
      ref={widgetRef}
      className={`absolute select-none ${
        isDragging 
          ? "z-50 shadow-2xl shadow-foreground/10 scale-[1.03] ring-2 ring-primary/30" 
          : "z-10 hover:z-20"
      } transition-all duration-150 ${isDragging ? "duration-0" : ""} ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "default",
        willChange: isDragging ? "transform" : "auto",
      }}
    >
      <div className="relative group">
        {/* Drag handle */}
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`absolute -top-2 -right-2 z-20 p-1.5 rounded-lg bg-secondary/90 backdrop-blur-sm border border-border/60 
            opacity-0 group-hover:opacity-100 transition-all duration-200 
            hover:bg-secondary hover:border-primary/40 hover:scale-110
            active:scale-95
            ${isDragging ? "opacity-100 bg-primary/20 border-primary/50 scale-110" : ""}`}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          aria-label="Drag to reposition"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
        
        {/* Drag hint tooltip - show on first hover */}
        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] text-muted-foreground 
          bg-secondary/90 backdrop-blur-sm rounded border border-border/40 whitespace-nowrap
          opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
          ${isDragging ? "hidden" : ""}`}>
          Drag to move
        </div>
        
        {children}
      </div>
    </div>
  )
}
