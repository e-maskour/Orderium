import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { X } from 'lucide-react';
import { formatDate } from '@orderium/ui';
import { useLanguage } from '../context/LanguageContext';
import { DateRangePanel } from './DateRangePanel';
import type { DatePreset, DateRange } from '../utils/datePresets';

interface PeriodFilterProps {
  value: DatePreset;
  /** The custom range currently applied (used when `value` is `custom`). */
  range: DateRange;
  /** `range` is `{}` for presets and for "all". */
  onChange: (preset: DatePreset, range: DateRange) => void;
}

/**
 * The list-page "Période" filter: a dropdown-styled trigger showing the
 * applied period, opening the centered DateRangePanel dialog. One look and
 * behaviour for every table's filter bar (sits inside `.orders-filter-bar`).
 */
export function PeriodFilter({ value, range, onChange }: PeriodFilterProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const presets = [
    { label: t('all'), value: 'all' },
    { label: t('today'), value: 'today' },
    { label: t('yesterday'), value: 'yesterday' },
    { label: t('thisWeek'), value: 'week' },
    { label: t('thisMonth'), value: 'month' },
    { label: t('lastMonth'), value: 'last_month' },
    { label: t('thisYear'), value: 'year' },
    { label: t('lastYear'), value: 'last_year' },
    { label: t('selectDates'), value: 'custom' },
  ];

  const active = value !== 'all';
  const label = !active
    ? t('period')
    : value === 'custom' && (range.start || range.end)
      ? [range.start ? formatDate(range.start) : '…', range.end ? formatDate(range.end) : '…'].join(
          ' – ',
        )
      : (presets.find((o) => o.value === value)?.label ?? t('period'));

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
          {t('period')}
        </span>
        <div
          className={`p-dropdown p-component${active ? ' p-focus' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setOpen(true);
          }}
          style={{
            height: '3rem',
            cursor: 'pointer',
            userSelect: 'none',
            background: active ? '#eff6ff' : undefined,
            borderColor: active ? '#235ae4' : undefined,
            color: active ? '#235ae4' : undefined,
            width: '100%',
            minWidth: '9.5rem',
          }}
        >
          <span
            className="p-dropdown-label p-inputtext"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: active ? '#235ae4' : undefined,
            }}
          >
            {label}
          </span>
          <div className="p-dropdown-trigger">
            {active ? (
              <span
                role="button"
                aria-label="clear date"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('all', {});
                }}
                style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}
              >
                <X style={{ width: '0.75rem', height: '0.75rem' }} />
              </span>
            ) : (
              <span className="p-dropdown-trigger-icon p-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ width: '1rem', height: '1rem' }}
                >
                  <path
                    d="M7.01744 10.398C6.91269 10.3985 6.8089 10.378 6.71215 10.3379C6.61541 10.2977 6.52766 10.2386 6.45405 10.1641L1.13907 4.84913C1.03306 4.69404 0.985221 4.5065 1.00399 4.31958C1.02276 4.13266 1.10693 3.95838 1.24166 3.82747C1.37639 3.69655 1.55301 3.61742 1.74039 3.60402C1.92777 3.59062 2.11386 3.64382 2.26584 3.75424L7.01744 8.47394L11.769 3.75424C11.9189 3.65709 12.097 3.61306 12.2748 3.62921C12.4527 3.64535 12.6199 3.72073 12.7498 3.84328C12.8797 3.96582 12.9647 4.12842 12.9912 4.30502C13.0177 4.48162 12.9841 4.662 12.8958 4.81724L7.58083 10.1322C7.50996 10.2125 7.42344 10.2775 7.32656 10.3232C7.22968 10.3689 7.12449 10.3944 7.01744 10.398Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      <Dialog
        visible={open}
        onHide={() => setOpen(false)}
        className="drp-dialog"
        showHeader={false}
        dismissableMask
        draggable={false}
        resizable={false}
        blockScroll
        // Auto-focusing the first preset would draw a ring that reads as "selected"
        focusOnShow={false}
        aria-label={t('period')}
      >
        <DateRangePanel
          presets={presets}
          value={value}
          range={range}
          compact={isMobile}
          onPreset={(preset) => onChange(preset, {})}
          onRange={(r) => onChange('custom', r)}
          onClear={() => onChange('all', {})}
          onClose={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}

export default PeriodFilter;
