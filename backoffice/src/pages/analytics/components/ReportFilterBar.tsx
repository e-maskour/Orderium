import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import type { DatePreset, ReportFilter } from '../../../modules/analytics/analytics.interface';

interface Preset {
  label: string;
  value: DatePreset;
}

const PRESETS: Preset[] = [
  { label: "Aujourd'hui", value: 'today' },
  { label: 'Cette semaine', value: 'this_week' },
  { label: 'Ce mois', value: 'this_month' },
  { label: 'Mois dernier', value: 'last_month' },
  { label: 'Ce trimestre', value: 'this_quarter' },
  { label: 'Cette année', value: 'this_year' },
  { label: 'Personnalisé', value: 'custom' },
];

interface ReportFilterBarProps {
  filter: ReportFilter;
  onChange: (f: ReportFilter) => void;
  extra?: React.ReactNode;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ReportFilterBar: React.FC<ReportFilterBarProps> = ({ filter, onChange, extra }) => {
  const [customRange, setCustomRange] = useState<Date[] | null>(null);

  const handlePreset = (preset: DatePreset) => {
    onChange({ ...filter, preset, startDate: undefined, endDate: undefined });
  };

  const handleCustomRange = (dates: Date[] | null) => {
    setCustomRange(dates);
    if (dates && dates.length === 2 && dates[0] && dates[1]) {
      onChange({
        ...filter,
        preset: 'custom',
        startDate: toDateStr(dates[0]),
        endDate: toDateStr(dates[1]),
      });
    }
  };

  return (
    <div className="flex flex-column gap-2">
      {/* Label row */}
      <div className="flex align-items-center gap-2 mb-1">
        <i className="pi pi-filter text-500" style={{ fontSize: '0.8125rem' }} />
        <span
          className="text-500 text-xs font-semibold uppercase"
          style={{ letterSpacing: '0.06em' }}
        >
          Période
        </span>
      </div>

      {/* Preset buttons + optional custom picker */}
      <div className="flex flex-wrap align-items-center gap-2">
        {PRESETS.map((p) => {
          const isActive = filter.preset === p.value;
          return (
            <button
              key={p.value}
              onClick={() => handlePreset(p.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '2rem',
                padding: '0 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                border: isActive
                  ? '1.5px solid var(--primary-color)'
                  : '1px solid var(--erp-border)',
                background: isActive ? 'var(--primary-50)' : '#ffffff',
                color: isActive ? 'var(--primary-700)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              {p.label}
            </button>
          );
        })}

        {filter.preset === 'custom' && (
          <Calendar
            value={customRange as Date[]}
            onChange={(e) => handleCustomRange(e.value as Date[])}
            selectionMode="range"
            readOnlyInput
            hideOnRangeSelection
            showIcon
            placeholder="Choisir une période"
            dateFormat="dd/mm/yy"
            inputStyle={{ height: '2rem', fontSize: '0.8125rem' }}
          />
        )}

        {extra && <div className="flex align-items-center gap-2">{extra}</div>}
      </div>
    </div>
  );
};

export default ReportFilterBar;
