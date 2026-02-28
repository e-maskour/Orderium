import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const nativeSelectVariants = cva(
    "flex w-full appearance-none rounded-lg border bg-white text-sm transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 pe-10",
    {
        variants: {
            variant: {
                default:
                    "border-slate-200 hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20",
                error:
                    "border-destructive/50 bg-destructive/5 hover:border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20",
            },
            selectSize: {
                sm: "h-8 px-2.5 py-1.5 text-xs",
                default: "h-10 px-3 py-2 text-sm",
                lg: "h-12 px-4 py-3 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            selectSize: "default",
        },
    }
)

export interface NativeSelectProps
    extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof nativeSelectVariants> {
    error?: boolean
    fullWidth?: boolean
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
    ({ className, variant, selectSize, error, fullWidth, children, ...props }, ref) => {
        const resolvedVariant = error ? "error" : variant

        return (
            <div className={cn("relative", fullWidth ? "w-full" : "w-auto")}>
                <select
                    className={cn(
                        nativeSelectVariants({ variant: resolvedVariant, selectSize }),
                        className
                    )}
                    ref={ref}
                    aria-invalid={error ? true : undefined}
                    {...props}
                >
                    {children}
                </select>
                <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
            </div>
        )
    }
)
NativeSelect.displayName = "NativeSelect"

export { NativeSelect, nativeSelectVariants }
