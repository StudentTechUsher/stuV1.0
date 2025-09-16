"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface CourseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  courseCode: string
  courseTitle: string
  credits: number
  isDragging?: boolean
}

export function CourseCard({
  courseCode,
  courseTitle,
  credits,
  isDragging,
  className,
  ...props
}: CourseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: courseCode,
    data: {
      type: 'course',
      course: { code: courseCode, title: courseTitle, credits }
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center py-1.5 px-4 bg-white rounded-lg shadow-sm border border-zinc-100/50",
        "hover:bg-zinc-50/80 hover:shadow-md hover:-translate-y-[1px] hover:border-zinc-200/50",
        "transition-all duration-150 ease-in-out w-full cursor-move",
        (isDragging || isSortableDragging) && "opacity-50 bg-zinc-100/80 shadow-lg scale-[1.02] rotate-1",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0 flex items-center">
        <div className="flex-shrink-0">
          <span className="text-xs font-medium text-zinc-800">{courseCode}</span>
          <span className="text-zinc-300 mx-1.5">•</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs text-zinc-600 block truncate">{courseTitle}</span>
        </div>
      </div>
      <div className="w-12 text-right">
        <span className="text-xs font-medium text-zinc-500">{credits}</span>
      </div>
    </div>
  )
}