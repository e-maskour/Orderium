import * as React from "react"

import { cn } from "../../lib/utils"

export interface SegmentedControlOption<T extends string = string> {
    value: T
    label: string
    icon?: React.ReactNode
}

export interface SegmentedControlProps<T extends string = string> {
    options: SegmentedControlOption<T>[]
    value: T
    onValueChange: (value: T) => void
    disabled?: boolean
    className?: string
    size?: "sm" | "default"
}

function SegmentedControlInner<T extends string = string>(
    { options, value, onValueChange, disabled, className, size = "default" }: SegmentedControlProps<T>,
    ref: React.ForwardedRef<HTMLDivElement>
) {
    const sizeClasses = {
        sm: "text-xs px-2.5 py-1.5",
        default: "text-xs px-3 py-2",
    }

    return (
        <div
            ref={ref}
            role="radiogroup"
            className={cn("inline-flex items-center gap-2", className)}
        >
            {options.map((option) => {
                const isSelected = value === option.value
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={disabled}
                        onClick={() => onValueChange(option.value)}
                        className={cn(
                            "flex-1 rounded-lg font-semibold transition-all duration-200",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            sizeClasses[size],
                            isSelected
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300"
                        )}
                    >
                        <div className="flex items-center justify-center gap-1.5">
                            {option.icon}
                            <span>{option.label}</span>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}

const SegmentedControl = React.forwardRef(SegmentedControlInner) as <T extends string = string>(
    props: SegmentedControlProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement

export { SegmentedControl }
