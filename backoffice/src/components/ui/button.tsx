import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, type LucideIcon } from "lucide-react"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20 hover:bg-destructive/90 hover:shadow-md",
        outline:
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 hover:shadow-md",
        warning:
          "bg-amber-500 text-white shadow-sm shadow-amber-500/20 hover:bg-amber-600 hover:shadow-md",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Shows a spinner and disables the button */
  loading?: boolean
  /** Text shown while loading (defaults to children) */
  loadingText?: string
  /** Icon rendered before children */
  leadingIcon?: React.ReactNode | LucideIcon
  /** Icon rendered after children */
  trailingIcon?: React.ReactNode | LucideIcon
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      leadingIcon,
      trailingIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    const renderIcon = (icon?: React.ReactNode | LucideIcon): React.ReactNode => {
      if (!icon) return null
      if (React.isValidElement(icon)) return icon
      const Icon = icon as LucideIcon
      return <Icon className="h-4 w-4" />
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          <>
            {renderIcon(leadingIcon)}
            {children}
            {renderIcon(trailingIcon)}
          </>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
