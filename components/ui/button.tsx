import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,box-shadow,transform] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-[#12F987] text-black shadow-sm hover:bg-[#0ED978] hover:shadow-md active:scale-[0.98] dark:bg-[#12F987] dark:text-zinc-900 dark:hover:bg-[#0ED978]",
        secondary:
          "border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:bg-zinc-100 hover:border-zinc-400 hover:shadow-md active:scale-[0.98] dark:border-zinc-500 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 dark:hover:border-zinc-400",
        accent:
          "bg-[#F0FFF9] text-zinc-900 shadow-sm hover:bg-[#E0F9EF] hover:shadow-md active:scale-[0.98] dark:bg-[#12F987] dark:text-zinc-900 dark:hover:bg-[#0ED978]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
