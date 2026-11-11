import React from 'react';
import { formatAmount, formatQuantity } from '@orderium/ui';
import { useLanguage } from '../../../context/LanguageContext';
import { REPORT_KPIS, type KpiFormat } from '../../../modules/analytics/analytics.kpis';
import { codedValue } from '../../../modules/analytics/analytics.labels';

interface KpiCard {
  label: string;
  value: string | number;
  suffix?: string;
  format?: KpiFormat;
  color?: 'green' | 'red' | 'blue' | 'orange' | 'purple' | 'teal';
  /** PrimeIcons class (e.g. `pi-wallet`). Defaults by colour. */
  icon?: string;
}

type ReportKpiCardsProps =
  | { cards: KpiCard[]; reportKey?: never; values?: never }
  /** Renders the report's registered KPIs (analytics.kpis.ts) from the API values. */
  | { reportKey: string; values?: Record<string, number | string> | null; cards?: never };

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

/** Splits a formatted value from its unit so the unit can be set smaller. */
function formatParts(
  value: string | number | null | undefined,
  format?: KpiFormat,
  suffix?: string,
): { main: string; unit?: string } {
  const n = toNumber(value);
  if (format === 'text' || (n === null && value != null && value !== '')) {
    return { main: value == null || value === '' ? '—' : String(value) };
  }
  if (n === null) return { main: '—' };
  if (format === 'currency' || suffix === 'MAD') return { main: formatAmount(n), unit: 'MAD' };
  if (format === 'percent' || suffix === '%') return { main: formatQuantity(n, 1), unit: '%' };
  if (format === 'integer') return { main: formatQuantity(Math.round(n), 0), unit: suffix };
  return { main: formatQuantity(n, 2), unit: suffix };
}

const DEFAULT_ICON: Record<string, string> = {
  green: 'pi-arrow-up-right',
  red: 'pi-exclamation-circle',
  blue: 'pi-chart-bar',
  orange: 'pi-shopping-bag',
  purple: 'pi-file',
  teal: 'pi-users',
};

const ReportKpiCards: React.FC<ReportKpiCardsProps> = (props) => {
  const { t } = useLanguage();

  const cards: KpiCard[] = props.cards
    ? props.cards
    : (REPORT_KPIS[props.reportKey] ?? []).map((d) => ({
        label: t(d.labelKey),
        value: (codedValue(d.key, props.values?.[d.key], t)?.label ??
          props.values?.[d.key] ??
          '') as string | number,
        format: d.format,
        color: d.tone,
        icon: d.icon,
      }));

  if (cards.length === 0) return null;

  return (
    <div className="ax-kpis">
      {cards.map((card, i) => {
        const color = card.color ?? 'blue';
        const icon = card.icon ?? DEFAULT_ICON[color] ?? 'pi-chart-line';
        const { main, unit } = formatParts(card.value, card.format, card.suffix);
        return (
          <div
            key={i}
            className={`ax-kpi ax-kpi--${color}${card.format === 'text' ? ' ax-kpi--text' : ''}`}
          >
            <div className="ax-kpi__head">
              <span className="ax-kpi__label">{card.label}</span>
              <span className="ax-kpi__icon" aria-hidden="true">
                <i className={`pi ${icon} analytics-kpi__icon`} />
              </span>
            </div>
            <p className="ax-kpi__value" title={main}>
              <bdi>{main}</bdi>
              {unit && <span className="ax-kpi__unit">{unit}</span>}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default ReportKpiCards;
