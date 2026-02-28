import * as React from "react"
import { cn } from "../../lib/utils"

export interface FormFieldProps {
    label?: React.ReactNode
    htmlFor?: string
    error?: string
    hint?: string
    required?: boolean
    className?: string
    children: React.ReactNode
    /** Visually hide the label while keeping it accessible */
    srOnlyLabel?: boolean
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
    ({ label, htmlFor, error, hint, required, className, children, srOnlyLabel }, ref) => {
        const errorId = htmlFor ? `${htmlFor}-error` : undefined
        const hintId = htmlFor ? `${htmlFor}-hint` : undefined

        return (
            <div ref={ref} className={cn("group space-y-1.5", className)}>
                {label && (
                    <label
                        htmlFor={htmlFor}
                        className={cn(
                            "block text-xs font-semibold text-slate-700 transition-colors",
                            "group-focus-within:text-primary",
                            error && "text-destructive",
                            srOnlyLabel && "sr-only"
                        )}
                    >
                        {label}
                        {required && (
                            <span className="text-destructive ml-0.5" aria-hidden="true">
                                *
                            </span>
                        )}
                    </label>
                )}

                {children}

                {error && (
                    <p
                        id={errorId}
                        role="alert"
                        className="flex items-center gap-1 text-xs font-medium text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200"
                    >
                        <span className="inline-block h-1 w-1 rounded-full bg-destructive flex-shrink-0" />
                        {error}
                    </p>
                )}

                {hint && !error && (
                    <p
                        id={hintId}
                        className="text-xs text-muted-foreground"
                    >
                        {hint}
                    </p>
                )}
            </div>
        )
    }
)
FormField.displayName = "FormField"

export { FormField }
