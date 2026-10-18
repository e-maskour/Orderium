import { useEffect, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { Check } from 'lucide-react';
import { formatDate } from '@orderium/ui';
import { useLanguage } from '../context/LanguageContext';
import { presetRange, type DatePreset, type DateRange } from '../utils/datePresets';

interface DateRangePanelProps {
  /** Preset options; a `custom` entry, if present, is ignored. */
  presets: { label: string; value: string }[];
  value: DatePreset;
  /** The custom range currently applied (used when `value` is `custom`). */
  range: DateRange;
  onPreset: (preset: DatePreset) => void;
  onRange: (range: { start: Date; end: Date }) => void;
  onClear: () => void;
  /** Close the hosting overlay. */
  onClose: () => void;
  /** Stacked single-month layout for narrow screens. */
  compact?: boolean;
}

/**
 * Body of the period filter overlay: preset list on one side, an inline
 * range calendar on the other, and a footer that commits the selection.
 * Picking a preset or dates only stages a draft (shown on the calendar);
 * nothing is applied until "Apply".
 */
export function DateRangePanel({
  presets,
  value,
  range,
  onPreset,
  onRange,
  onClear,
  onClose,
  compact = false,
}: DateRangePanelProps) {
  const { t, language } = useLanguage();
  const locale = language === 'ar' ? 'ar-MA' : 'fr-FR';

  const resolve = (preset: DatePreset) => (preset === 'custom' ? range : presetRange(preset));

  // Staged selection: the preset it came from (`custom` once dates are
  // picked by hand) and the range it covers.
  const [draftPreset, setDraftPreset] = useState<DatePreset>(value);
  const [draft, setDraft] = useState<DateRange>(() => resolve(value));
  // Month shown first in the calendar; follows the staged range
  const [viewDate, setViewDate] = useState<Date>(() => resolve(value).start ?? new Date());

  // Re-sync when the applied filter changes from outside (e.g. cleared)
  useEffect(() => {
    const r = resolve(value);
    setDraftPreset(value);
    setDraft(r);
    setViewDate(r.start ?? new Date());
  }, [value, range.start, range.end]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (date: Date | undefined, opts: Intl.DateTimeFormatOptions) =>
    date ? date.toLocaleDateString(locale, opts) : '';
  const short = { day: '2-digit', month: 'short' } as const;

  const hint = (preset: DatePreset) => {
    const r = presetRange(preset);
    if (!r.start || !r.end) return '';
    if (r.start.toDateString() === r.end.toDateString()) return fmt(r.start, short);
    if (preset === 'year' || preset === 'last_year') return String(r.start.getFullYear());
    return `${fmt(r.start, short)} – ${fmt(r.end, short)}`;
  };

  const stage = (preset: DatePreset) => {
    const r = presetRange(preset);
    setDraftPreset(preset);
    setDraft(r);
    setViewDate(r.start ?? new Date());
  };

  // "All" has no dates; every other choice needs both ends
  const canApply = draftPreset === 'all' || (!!draft.start && !!draft.end);

  const apply = () => {
    if (draftPreset !== 'custom') {
      onPreset(draftPreset);
    } else if (draft.start && draft.end) {
      const end = new Date(draft.end);
      end.setHours(23, 59, 59, 999);
      onRange({ start: draft.start, end });
    } else {
      return;
    }
    onClose();
  };

  return (
    <div className={`drp${compact ? ' drp--compact' : ''}`}>
      <div className="drp__body">
        <div className="drp__presets" role="listbox" aria-label={t('period')}>
          <p className="drp__heading">{t('period')}</p>
          {presets
            .filter((p) => p.value !== 'custom')
            .map((p) => {
              const active = draftPreset === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`drp__preset${active ? ' drp__preset--active' : ''}`}
                  onClick={() => stage(p.value as DatePreset)}
                >
                  <span className="drp__preset-label">{p.label}</span>
                  {!compact && (
                    <span className="drp__preset-hint">{hint(p.value as DatePreset)}</span>
                  )}
                  {active && <Check className="drp__preset-check" aria-hidden="true" />}
                </button>
              );
            })}
        </div>

        <div className="drp__calendar">
          <p className="drp__heading">{t('selectDates')}</p>
          <Calendar
            inline
            selectionMode="range"
            numberOfMonths={compact ? 1 : 2}
            viewDate={viewDate}
            onViewDateChange={(e) => setViewDate(e.value)}
            value={draft.start ? (draft.end ? [draft.start, draft.end] : [draft.start]) : null}
            dateTemplate={(d) => {
              const isEdge = [draft.start, draft.end].some(
                (x) =>
                  x &&
                  x.getFullYear() === d.year &&
                  x.getMonth() === d.month &&
                  x.getDate() === d.day,
              );
              return <span className={isEdge ? 'drp__edge' : undefined}>{d.day}</span>;
            }}
            onChange={(e) => {
              const v = (e.value as (Date | null)[] | null) ?? [];
              setDraftPreset('custom');
              setDraft({ start: v[0] ?? undefined, end: v[1] ?? undefined });
            }}
          />
        </div>
      </div>

      <div className="drp__footer">
        <div className="drp__summary">
          <span className="drp__field">
            <span className="drp__field-label">{t('start')}</span>
            <span className="drp__field-value">{formatDate(draft.start, '—')}</span>
          </span>
          <span className="drp__arrow" aria-hidden="true">
            →
          </span>
          <span className="drp__field">
            <span className="drp__field-label">{t('end')}</span>
            <span className="drp__field-value">{formatDate(draft.end, '—')}</span>
          </span>
        </div>
        <div className="drp__actions">
          <button
            type="button"
            className="drp__btn drp__btn--ghost"
            onClick={() => {
              onClear();
              onClose();
            }}
          >
            {t('clear')}
          </button>
          <button
            type="button"
            className="drp__btn drp__btn--primary"
            disabled={!canApply}
            onClick={apply}
          >
            {t('apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
