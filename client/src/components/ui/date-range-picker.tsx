import * as React from "react"
import { Calendar as CalendarIcon, X, Check } from "lucide-react"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
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

  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setTempRange({ ...tempRange, start: date })
      }
    } else {
      setTempRange({ ...tempRange, start: undefined })
    }
  }

  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setTempRange({ ...tempRange, end: date })
      }
    } else {
      setTempRange({ ...tempRange, end: undefined })
    }
  }

  const formatInputDate = (date: Date | undefined) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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
      
      case 'yesterday': {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
        end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
        break
      }
      
      case 'thisWeek':
        start = new Date(now)
        start.setDate(now.getDate() - now.getDay())
        start.setHours(0, 0, 0, 0)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      
      case 'lastWeek': {
        const lastWeekEnd = new Date(now)
        lastWeekEnd.setDate(now.getDate() - now.getDay() - 1)
        lastWeekEnd.setHours(23, 59, 59, 999)
        start = new Date(lastWeekEnd)
        start.setDate(lastWeekEnd.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        end = lastWeekEnd
        break
      }
      
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full sm:w-auto sm:min-w-[240px] h-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all flex items-center justify-start text-left hover:bg-slate-100 hover:border-slate-300 ${
            !displayText ? "text-slate-400" : "text-slate-700"
          }`}
        >
          <CalendarIcon className="mr-2 rtl:ml-2 rtl:mr-0 h-5 w-5 text-slate-400 flex-shrink-0" />
          <span className={displayText ? "text-slate-700" : "text-slate-400"}>
            {displayText || placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-screen sm:w-auto max-w-[100vw] sm:max-w-none p-0 border-slate-200 shadow-xl" align="start" sideOffset={5}>
        <div className="bg-slate-700 text-white p-3 sm:p-4 rounded-t-lg">
          <div className="text-sm text-slate-300 mb-1">{t('period')}</div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col lg:flex-row">
            {/* Calendars Section */}
            <div className="hidden sm:flex flex-col sm:flex-row lg:border-b-0 lg:border-r border-slate-200">
              <div className="border-b sm:border-b-0 sm:border-r border-slate-200">
                <div className="text-sm font-semibold text-slate-600 px-4 pt-3 pb-2">{t('start')}</div>
                <div className="px-4 pb-2">
                  <input
                    type="date"
                    value={formatInputDate(tempRange.start)}
                    onChange={handleStartInputChange}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <Calendar
                  mode="single"
                  selected={tempRange.start}
                  onSelect={handleStartDateSelect}
                  className="border-0"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-600 px-4 pt-3 pb-2">{t('end')}</div>
                <div className="px-4 pb-2">
                  <input
                    type="date"
                    value={formatInputDate(tempRange.end)}
                    onChange={handleEndInputChange}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <Calendar
                  mode="single"
                  selected={tempRange.end}
                  onSelect={handleEndDateSelect}
                  className="border-0"
                />
              </div>
            </div>

            {/* Predefined Periods Section */}
            <div className="w-full lg:w-64 p-3 sm:p-4 flex flex-col">
              {/* Custom Date Inputs for Mobile */}
              <div className="sm:hidden space-y-3 mb-4 pb-4 border-b border-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('start')}</label>
                  <input
                    type="date"
                    value={formatInputDate(tempRange.start)}
                    onChange={handleStartInputChange}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('end')}</label>
                  <input
                    type="date"
                    value={formatInputDate(tempRange.end)}
                    onChange={handleEndInputChange}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
              
              <div className="text-sm font-semibold text-slate-600 mb-3">{t('predefinedPeriod')}</div>
              <div className="space-y-2 flex-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPredefinedRange('today')}
                    className="px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700 whitespace-nowrap"
                  >
                    {t('today')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPredefinedRange('yesterday')}
                    className="px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700 whitespace-nowrap"
                  >
                    {t('yesterday')}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPredefinedRange('thisWeek')}
                    className="px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700 whitespace-nowrap"
                  >
                    {t('thisWeek')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPredefinedRange('lastWeek')}
                    className="px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700 whitespace-nowrap"
                  >
                    {t('lastWeek')}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPredefinedRange('thisMonth')}
                    className="px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700 whitespace-nowrap"
                  >
                    {t('thisMonth')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPredefinedRange('lastMonth')}
                    className="px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700 whitespace-nowrap"
                  >
                    {t('lastMonth')}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPredefinedRange('thisYear')}
                    className="px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700 whitespace-nowrap"
                  >
                    {t('thisYear')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPredefinedRange('lastYear')}
                    className="px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-slate-700 whitespace-nowrap"
                  >
                    {t('lastYear')}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 sm:pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleOk}
                  className="px-3 sm:px-4 py-2.5 sm:py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <Check className="w-4 h-4 sm:w-4 sm:h-4" />
                  {t('ok')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 sm:px-4 py-2.5 sm:py-2 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <X className="w-4 h-4 sm:w-4 sm:h-4" />
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
