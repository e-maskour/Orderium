import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
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
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const ignoreBlur = React.useRef(false)

  React.useEffect(() => {
    if (value !== undefined) {
      setInputValue(value)
    }
  }, [value])

  // Filter options based on input value
  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [options, inputValue])

  const handleSelect = (selectedValue: string) => {
    const selectedOption = options.find((opt) => opt.value === selectedValue)
    const newValue = selectedValue === value ? "" : selectedValue
    setInputValue(selectedOption?.label || selectedValue)
    onValueChange?.(newValue)
    setOpen(false)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

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

  const handleInputFocus = () => {
    setTimeout(() => {
      setOpen(true)
    }, 100)
  }

  const handleInputBlur = () => {
    if (!ignoreBlur.current) {
      setTimeout(() => {
        setOpen(false)
      }, 150)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    ignoreBlur.current = true
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full px-3 py-2.5 pe-10 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all bg-white disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
          />
          <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-slate-600 transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent 
        className="p-0" 
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
      >
        <Command shouldFilter={false} className="rounded-lg border-0">
          <CommandList>
            {filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default Autocomplete
