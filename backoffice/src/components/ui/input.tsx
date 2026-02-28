import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, type LucideIcon } from "lucide-react"

import { cn } from "../../lib/utils"

const inputVariants = cva(
  "flex w-full rounded-lg border bg-white text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-slate-200 hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20",
        error:
          "border-destructive/50 bg-destructive/5 hover:border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20",
        success:
          "border-emerald-300 bg-emerald-50/30 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
      },
      inputSize: {
        sm: "h-8 px-2.5 py-1.5 text-xs",
        default: "h-10 px-3 py-2 text-sm",
        lg: "h-12 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
  VariantProps<typeof inputVariants> {
  /** Icon shown on the leading (start) side of the input */
  leadingIcon?: React.ReactNode | LucideIcon
  /** Icon or element shown on the trailing (end) side */
  trailingIcon?: React.ReactNode | LucideIcon
  /** Show a loading spinner on the trailing side */
  loading?: boolean
  /** Full-width wrapper */
  fullWidth?: boolean
  /** Error state shorthand (sets variant to error) */
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant,
      inputSize,
      leadingIcon,
      trailingIcon,
      loading,
      error,
      fullWidth = true,
      ...props
    },
    ref
  ) => {
    const resolvedVariant = error ? "error" : variant
    const hasLeading = !!leadingIcon
    const hasTrailing = !!trailingIcon || loading

    const renderIcon = (icon?: React.ReactNode | LucideIcon): React.ReactNode => {
      if (!icon) return null
      if (React.isValidElement(icon)) return icon
      const Icon = icon as LucideIcon
      return <Icon className="h-4 w-4" />
    }

    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        {hasLeading && (
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
            <span className="text-slate-400 [.group:focus-within_&]:text-primary transition-colors">
              {renderIcon(leadingIcon)}
            </span>
          </div>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ variant: resolvedVariant, inputSize }),
            hasLeading && "ps-10",
            hasTrailing && "pe-10",
            className
          )}
          ref={ref}
          aria-invalid={error || resolvedVariant === "error" ? true : undefined}
          {...props}
        />
        {hasTrailing && (
          <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-slate-400">{renderIcon(trailingIcon)}</span>
            )}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
