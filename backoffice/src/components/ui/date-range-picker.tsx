import * as React from "react"
import { Calendar as CalendarIcon, X, Check } from "lucide-react"
import { Calendar } from "./calendar"
import { Dialog, DialogContent, DialogTrigger } from "./dialog"
import { useLanguage } from "../../context/LanguageContext"

interface DateRange {
  start?: Date
  end?: Date
}

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange) => void
  placeholder?: string
}

export function DateRangePicker({ dateRange, onDateRangeChange, placeholder = "Select date range" }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [tempRange, setTempRange] = React.useState<DateRange>(dateRange || {})
  const { t } = useLanguage()

  // Update tempRange when dateRange prop changes
  React.useEffect(() => {
    if (dateRange) {
      setTempRange(dateRange)
    }
  }, [dateRange])

  const formatDateRange = (range: DateRange) => {
    if (!range.start && !range.end) return null
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      })
    }

    if (range.start && range.end) {
      return `${formatDate(range.start)} - ${formatDate(range.end)}`
    } else if (range.start) {
      return formatDate(range.start)
    }
    return null
  }

  const handleStartDateSelect = (date: Date | undefined) => {
    setTempRange({ ...tempRange, start: date })
  }

  const handleEndDateSelect = (date: Date | undefined) => {
    setTempRange({ ...tempRange, end: date })
  }

  const handleOk = () => {
    if (onDateRangeChange) {
      onDateRangeChange(tempRange)
    }
    setOpen(false)
  }

  const handleCancel = () => {
    setTempRange(dateRange || {})
    setOpen(false)
  }

  const setPredefinedRange = (type: string) => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    
    let start: Date, end: Date

    switch (type) {
      case 'today':
        start = startOfDay
        end = endOfDay
        break
      
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
        end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
        break
      
      case 'thisWeek':
        start = new Date(now)
        start.setDate(now.getDate() - now.getDay())
        start.setHours(0, 0, 0, 0)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      
      case 'lastWeek':
        const lastWeekEnd = new Date(now)
        lastWeekEnd.setDate(now.getDate() - now.getDay() - 1)
        lastWeekEnd.setHours(23, 59, 59, 999)
        start = new Date(lastWeekEnd)
        start.setDate(lastWeekEnd.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        end = lastWeekEnd
        break
      
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        break
      
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1)
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
        break
      
      default:
        return
    }

    setTempRange({ start, end })
  }

  const displayText = dateRange ? formatDateRange(dateRange) : null

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDateRangeChange) {
      onDateRangeChange({ start: undefined, end: undefined })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative w-full">
          <button
            type="button"
            className={`w-full h-full px-4 py-3 bg-opacity-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all flex items-center justify-start text-left hover:bg-slate-100 hover:border-slate-300 ${
              !displayText ? "text-slate-400" : "text-slate-700"
            }`}
          >
            <CalendarIcon className="mr-2 rtl:ml-2 rtl:mr-0 h-5 w-5 text-slate-400 flex-shrink-0" />
            <span className={displayText ? "text-slate-700" : "text-slate-400"}>
              {displayText || placeholder}
            </span>
          </button>
          {displayText && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-[90vw] lg:w-auto lg:max-w-5xl p-0 max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="bg-slate-700 text-white p-4 sticky top-0 z-10">
          <div className="text-sm text-slate-300 mb-1">{t('period')}</div>
          <div className="text-lg font-semibold">
            {tempRange.start && tempRange.end
              ? formatDateRange(tempRange)
              : formatDateRange(tempRange) || t('selectDates')}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Calendars Section */}
          <div className="flex flex-col sm:flex-row border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200">
              <div className="text-sm font-semibold text-slate-600 px-4 pt-3 pb-2">{t('start')}</div>
              <Calendar
                mode="single"
                selected={tempRange.start}
                onSelect={handleStartDateSelect}
                className="border-0"
              />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-600 px-4 pt-3 pb-2">{t('end')}</div>
              <Calendar
                mode="single"
                selected={tempRange.end}
                onSelect={handleEndDateSelect}
                className="border-0"
              />
            </div>
          </div>

          {/* Predefined Periods Section */}
          <div className="w-full lg:w-64 p-4 flex flex-col">
            <div className="text-sm font-semibold text-slate-600 mb-3">{t('predefinedPeriod')}</div>
            <div className="space-y-2 flex-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPredefinedRange('today')}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                >
                  {t('today')}
                </button>
                <button
                  type="button"
                  onClick={() => setPredefinedRange('yesterday')}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                >
                  {t('yesterday')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPredefinedRange('thisWeek')}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                >
                  {t('thisWeek')}
                </button>
                <button
                  type="button"
                  onClick={() => setPredefinedRange('lastWeek')}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                >
                  {t('lastWeek')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPredefinedRange('thisMonth')}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                >
                  {t('thisMonth')}
                </button>
                <button
                  type="button"
                  onClick={() => setPredefinedRange('lastMonth')}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                >
                  {t('lastMonth')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPredefinedRange('thisYear')}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                >
                  {t('thisYear')}
                </button>
                <button
                  type="button"
                  onClick={() => setPredefinedRange('lastYear')}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                >
                  {t('lastYear')}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleOk}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {t('ok')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
