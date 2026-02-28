import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

export interface CheckboxProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: string
    error?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, error, id, ...props }, ref) => {
        const inputId = id || React.useId()

        return (
            <label
                htmlFor={inputId}
                className={cn(
                    "inline-flex items-center gap-2 cursor-pointer select-none",
                    props.disabled && "cursor-not-allowed opacity-50",
                    className
                )}
            >
                <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        id={inputId}
                        ref={ref}
                        className="peer sr-only"
                        {...props}
                    />
                    <div
                        className={cn(
                            "h-4 w-4 rounded border-2 transition-all duration-200",
                            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20 peer-focus-visible:ring-offset-1",
                            "peer-checked:bg-primary peer-checked:border-primary",
                            error
                                ? "border-destructive"
                                : "border-slate-300 hover:border-slate-400 peer-checked:border-primary"
                        )}
                    />
                    <Check className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-150" />
                </div>
                {label && (
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                )}
            </label>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
