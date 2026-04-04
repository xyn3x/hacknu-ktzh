"use client"

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react"

interface ReorderableItem {
  id: string
  content: ReactNode
}

interface ReorderableMetricCardsProps {
  items: ReorderableItem[]
  onReorder?: (items: ReorderableItem[]) => void
  storageKey?: string
}

export function ReorderableMetricCards({ 
  items: initialItems, 
  onReorder,
  storageKey = "metric-cards-order"
}: ReorderableMetricCardsProps) {
  const [items, setItems] = useState<ReorderableItem[]>(initialItems)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number>(0)
  const initialOrderRef = useRef<string[]>(initialItems.map(i => i.id))

  // Load saved order from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const savedOrder: string[] = JSON.parse(saved)
        const reordered = savedOrder
          .map(id => initialItems.find(item => item.id === id))
          .filter((item): item is ReorderableItem => item !== undefined)
        
        // Add any new items that weren't in saved order
        const newItems = initialItems.filter(item => !savedOrder.includes(item.id))
        
        if (reordered.length > 0) {
          setItems([...reordered, ...newItems])
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey, initialItems])

  // Save order to localStorage when items change
  useEffect(() => {
    const currentOrder = items.map(i => i.id)
    if (JSON.stringify(currentOrder) !== JSON.stringify(initialOrderRef.current)) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentOrder))
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [items, storageKey])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
    setDraggedIndex(index)
    dragStartY.current = e.clientY
    
    // Add drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.opacity = "0.8"
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }, [draggedIndex])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newItems = [...items]
      const [draggedItem] = newItems.splice(draggedIndex, 1)
      newItems.splice(dropIndex, 0, draggedItem)
      setItems(newItems)
      onReorder?.(newItems)
    }
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, items, onReorder])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  return (
    <div ref={containerRef} className="space-y-4 lg:space-y-6">
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`
            transition-all duration-200 relative
            ${draggedIndex === index ? "opacity-50 scale-[0.98]" : "opacity-100"}
            ${dragOverIndex === index ? "transform translate-y-2" : ""}
          `}
        >
          {/* Drop indicator line */}
          {dragOverIndex === index && draggedIndex !== null && draggedIndex > index && (
            <div className="absolute -top-2 left-0 right-0 h-0.5 bg-foreground/30 rounded-full" />
          )}
          
          {/* Draggable card wrapper */}
          <div 
            className={`
              group relative cursor-grab active:cursor-grabbing
              ${draggedIndex === index ? "cursor-grabbing" : ""}
            `}
          >
            {/* Drag handle indicator - shows on hover */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              </div>
            </div>
            
            {item.content}
          </div>
          
          {/* Drop indicator line - bottom */}
          {dragOverIndex === index && draggedIndex !== null && draggedIndex < index && (
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-foreground/30 rounded-full" />
          )}
        </div>
      ))}
    </div>
  )
}
