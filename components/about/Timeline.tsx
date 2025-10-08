/**
 * Timeline Component
 *
 * Displays a vertical timeline with period and description.
 * Uses tokenized CSS variables for consistent theming.
 */

interface TimelineItem {
  period: string
  description: string
}

interface TimelineProps {
  items: TimelineItem[]
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--border)]" aria-hidden="true" />

      <div className="space-y-8">
        {items.map((item, index) => (
          <div key={index} className="relative flex gap-6">
            {/* Timeline dot */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] border-4 border-[var(--background)] shadow-md flex items-center justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-[var(--background)]" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <h4 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                {item.period}
              </h4>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
