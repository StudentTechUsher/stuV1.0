import * as React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { 
  SortableContext, 
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { usePlanStore } from "@/lib/store"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SemesterCardProps extends React.HTMLAttributes<HTMLDivElement> {
  term: string
  children: React.ReactNode
}

export function SemesterCard({
  term,
  children,
  className,
  ...props
}: SemesterCardProps) {
  const { getSemesterCredits, isSemesterOverLimit } = usePlanStore()
  const totalCredits = getSemesterCredits(term)
  const isOverLimit = isSemesterOverLimit(term)

  // Set up droppable area
  const { setNodeRef, isOver, active } = useDroppable({
    id: term,
    data: {
      type: 'semester',
      accepts: ['course'],
      term
    }
  })

  // Get course IDs for the sortable context
  const courseIds = React.Children.toArray(children).map(
    (child) => (child as any).props.courseCode
  )

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "flex flex-col p-5 bg-[#E6FFF2]/50 backdrop-blur-sm w-full transition-all duration-200",
        "rounded-xl border border-green-500/100 shadow-sm",
        isOver && "bg-[#D1FFE6]/60 ring-2 ring-green-400/30 ring-inset shadow-md scale-[1.01]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-zinc-800">{term}</h3>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-medium",
            isOverLimit ? "text-red-500" : "text-zinc-600"
          )}>
            {totalCredits} TOTAL
          </span>
          {isOverLimit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exceeds maximum credit limit</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <div className="flex items-center mb-2 px-4">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-zinc-400">Class</span>
        </div>
        <div className="w-12 text-right">
          <span className="text-xs font-medium text-zinc-400">Credits</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <SortableContext 
          items={courseIds} 
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300/50 scrollbar-track-transparent px-0.5 py-1">
            {children}
          </div>
        </SortableContext>
      </div>
    </Card>
  )
}