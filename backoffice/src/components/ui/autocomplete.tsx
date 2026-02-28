import * as React from "react"
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "./command"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "./popover"

export interface AutocompleteOption {
  value: string
  label: string
}

interface AutocompleteProps {
  options: AutocompleteOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  allowCustomValue?: boolean
  loading?: boolean
  error?: boolean
}

export function Autocomplete({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  emptyMessage = "No results found.",
  className,
  disabled = false,
  allowCustomValue = true,
  loading = false,
  error = false,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (value !== undefined) {
      const selectedOption = options.find((opt) => opt.value === value)
      setInputValue(selectedOption?.label || value)
    }
  }, [value, options])

  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [options, inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    if (allowCustomValue) {
      onValueChange?.(newValue)
    }
    if (!open) {
      setOpen(true)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setInputValue("")
    onValueChange?.("")
    setOpen(false)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const handleInputClick = () => {
    setOpen(true)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
  }

  const handleItemSelect = (selectedValue: string) => {
    const selectedOption = options.find((opt) => opt.value === selectedValue)
    const newValue = selectedValue === value ? "" : selectedValue
    setInputValue(selectedOption?.label || selectedValue)
    onValueChange?.(newValue)
    setOpen(false)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onClick={handleInputClick}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={error || undefined}
            className={cn(
              "w-full px-3 py-2 pe-10 text-sm border rounded-lg outline-none transition-all duration-200 bg-white",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-destructive/50 bg-destructive/5 hover:border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                : "border-slate-200 hover:border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary",
              className
            )}
          />
          <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {inputValue && !disabled && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-slate-600 transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {!loading && (
              <ChevronsUpDown className="h-4 w-4 text-slate-400 pointer-events-none" />
            )}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="p-0 bg-white"
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="rounded-lg border-0 bg-white">
          <CommandList>
            {filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleItemSelect(option.value)}
                    className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-slate-100 active:bg-slate-200 bg-white transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default Autocomplete
