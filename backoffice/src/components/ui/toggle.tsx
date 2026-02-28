import * as React from "react"

import { cn } from "../../lib/utils"

export interface ToggleProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
    label?: string
    className?: string
    id?: string
    size?: "sm" | "default"
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ checked, onCheckedChange, disabled, label, className, id, size = "default" }, ref) => {
        const btnId = id || React.useId()

        const sizes = {
            sm: { track: "h-5 w-9", thumb: "h-3.5 w-3.5", translate: "translate-x-4" },
            default: { track: "h-7 w-14", thumb: "h-5 w-5", translate: "translate-x-7" },
        }

        const s = sizes[size]

        return (
            <div className={cn("inline-flex items-center gap-3", className)}>
                <button
                    ref={ref}
                    id={btnId}
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    disabled={disabled}
                    onClick={() => onCheckedChange(!checked)}
                    className={cn(
                        "relative inline-flex items-center rounded-full transition-all duration-300 shadow-inner",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        s.track,
                        checked
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                            : "bg-slate-300"
                    )}
                >
                    <span
                        className={cn(
                            "inline-block transform rounded-full bg-white shadow-md transition-all duration-300",
                            s.thumb,
                            checked ? s.translate : "translate-x-1"
                        )}
                    />
                </button>
                {label && (
                    <label htmlFor={btnId} className="flex items-center gap-1.5 cursor-pointer select-none">
                        <div
                            className={cn(
                                "h-1.5 w-1.5 rounded-full transition-colors",
                                checked ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            )}
                        />
                        <span
                            className={cn(
                                "text-xs font-semibold transition-colors",
                                checked ? "text-emerald-600" : "text-slate-600"
                            )}
                        >
                            {label}
                        </span>
                    </label>
                )}
            </div>
        )
    }
)
Toggle.displayName = "Toggle"

export { Toggle }
