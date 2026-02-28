import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const textareaVariants = cva(
    "flex w-full rounded-lg border bg-white text-sm transition-all duration-200 placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
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
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
    /** Icon to show in the top-left corner */
    leadingIcon?: React.ReactNode
    /** Error state shorthand */
    error?: boolean
    /** Allow user to resize the textarea */
    resizable?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, variant, leadingIcon, error, resizable, ...props }, ref) => {
        const resolvedVariant = error ? "error" : variant
        const hasLeading = !!leadingIcon

        return (
            <div className="relative w-full">
                {hasLeading && (
                    <div className="pointer-events-none absolute start-3 top-2.5">
                        <span className="text-slate-400 [.group:focus-within_&]:text-primary transition-colors">
                            {leadingIcon}
                        </span>
                    </div>
                )}
                <textarea
                    className={cn(
                        textareaVariants({ variant: resolvedVariant }),
                        "min-h-[80px] px-3 py-2",
                        hasLeading && "ps-10",
                        resizable && "resize-y",
                        className
                    )}
                    ref={ref}
                    aria-invalid={error || resolvedVariant === "error" ? true : undefined}
                    {...props}
                />
            </div>
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
