import React, { useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { CalendarDays } from 'lucide-react';
import { formatDate } from '@orderium/ui';
import type { DatePreset, ReportFilter } from '../../../modules/analytics/analytics.interface';
import { useLanguage } from '../../../context/LanguageContext';
import {
  parseLocalDate as parseLocal,
  resolveRange,
  toDateStr,
} from '../../../modules/analytics/analytics.dates';

interface ReportFilterBarProps {
  filter: ReportFilter;
  onChange: (f: ReportFilter) => void;
  extra?: React.ReactNode;
}

const ReportFilterBar: React.FC<ReportFilterBarProps> = ({ filter, onChange, extra }) => {
  const { t } = useLanguage();
  const [customRange, setCustomRange] = useState<Date[] | null>(
    filter.startDate && filter.endDate
      ? [parseLocal(filter.startDate), parseLocal(filter.endDate)]
      : null,
  );

  const PRESETS: { label: string; value: DatePreset }[] = [
    { label: t('analyticsPresetToday'), value: 'today' },
    { label: t('analyticsPresetThisWeek'), value: 'this_week' },
    { label: t('analyticsPresetThisMonth'), value: 'this_month' },
    { label: t('analyticsPresetLastMonth'), value: 'last_month' },
    { label: t('analyticsPresetThisQuarter'), value: 'this_quarter' },
    { label: t('analyticsPresetThisYear'), value: 'this_year' },
    { label: t('analyticsPresetCustom'), value: 'custom' },
  ];

  // Choosing "Custom" only reveals the picker; nothing is queried until a full
  // range is picked, so the current result stays on screen meanwhile.
  const [customMode, setCustomMode] = useState(filter.preset === 'custom');
  const activePreset: DatePreset = customMode ? 'custom' : (filter.preset ?? 'this_month');

  const handlePreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      setCustomMode(true);
      return;
    }
    setCustomMode(false);
    if (preset === filter.preset) return;
    onChange({ ...filter, preset, startDate: undefined, endDate: undefined, page: 1 });
  };

  const handleCustomRange = (dates: Date[] | null) => {
    setCustomRange(dates);
    if (dates && dates.length === 2 && dates[0] && dates[1]) {
      onChange({
        ...filter,
        preset: 'custom',
        startDate: toDateStr(dates[0]),
        endDate: toDateStr(dates[1]),
        page: 1,
      });
    }
  };

  const range = customMode && filter.preset !== 'custom' ? null : resolveRange(filter);
  const rangeLabel = range
    ? range[0].getTime() === range[1].getTime()
      ? formatDate(range[0])
      : `${formatDate(range[0])} – ${formatDate(range[1])}`
    : null;

  return (
    <div className="ax-filters">
      <div className="ax-filters__group">
        <span className="ax-filters__label">{t('analyticsFilterPeriod')}</span>
        <div className="ax-seg" role="radiogroup" aria-label={t('analyticsFilterPeriod')}>
          {PRESETS.map((p) => {
            const active = activePreset === p.value;
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={active}
                className={`ax-seg__btn${active ? ' ax-seg__btn--active' : ''}`}
                onClick={() => handlePreset(p.value)}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {customMode && (
          <Calendar
            value={customRange as Date[]}
            onChange={(e) => handleCustomRange(e.value as Date[])}
            selectionMode="range"
            readOnlyInput
            hideOnRangeSelection
            showIcon
            placeholder={t('analyticsFilterChoosePeriod')}
            dateFormat="dd/mm/yy"
            className="ax-filters__calendar"
          />
        )}

        {extra && <div className="ax-filters__extra">{extra}</div>}
      </div>

      {rangeLabel && (
        <span className="ax-filters__range">
          <CalendarDays aria-hidden="true" />
          <bdi>{rangeLabel}</bdi>
        </span>
      )}
    </div>
  );
};

export default ReportFilterBar;
