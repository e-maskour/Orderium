import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import { formatQuantity } from '@orderium/ui';
import { useLanguage } from '../../../context/LanguageContext';
import type { SourceState } from './useOverviewData';
import { fmt, fmtParts, num, type Fmt } from './format';

// ─── Delta vs previous period ────────────────────────────────

export const Delta: React.FC<{
  current: unknown;
  previous: unknown;
  /** Whether a rise is good news (revenue) or neutral/bad (purchases). */
  higherIsBetter?: boolean;
}> = ({ current, previous, higherIsBetter = true }) => {
  const { t } = useLanguage();
  if (previous === undefined || previous === null) return null;
  const c = num(current);
  const p = num(previous);
  if (c === 0 && p === 0) {
    return (
      <span className="ax-delta ax-delta--flat">
        <Minus aria-hidden="true" />0 %
      </span>
    );
  }
  if (p === 0) {
    return <span className="ax-delta ax-delta--up-good">{t('analyticsNew')}</span>;
  }
  const pct = ((c - p) / Math.abs(p)) * 100;
  const up = pct > 0.05;
  const down = pct < -0.05;
  const good = (up && higherIsBetter) || (down && !higherIsBetter);
  const tone = !up && !down ? 'flat' : good ? 'up-good' : 'down-bad';
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className={`ax-delta ax-delta--${tone}`} title={t('analyticsVsPrevious')}>
      <Icon aria-hidden="true" className="ax-delta__icon" />
      <bdi>
        {up ? '+' : ''}
        {formatQuantity(pct, 1)} %
      </bdi>
    </span>
  );
};

// ─── KPI tile ────────────────────────────────────────────────

export const KpiTile: React.FC<{
  label: string;
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red';
  state: SourceState;
  value: unknown;
  format: Fmt;
  previous?: SourceState;
  previousValue?: unknown;
  higherIsBetter?: boolean;
  hint?: React.ReactNode;
  to: string;
}> = ({
  label,
  icon: Icon,
  tone,
  state,
  value,
  format,
  previous,
  previousValue,
  higherIsBetter,
  hint,
  to,
}) => {
  const { t } = useLanguage();
  if (state.denied) return null;
  const { main, unit } = fmtParts(value, format);
  const showDelta = previous && !previous.loading && !previous.error && previous.data;
  return (
    <Link to={to} className={`ax-ov-kpi ax-kpi--${tone}`} aria-busy={state.loading}>
      <div className="ax-ov-kpi__head">
        <span className="ax-ov-kpi__label">{label}</span>
        <span className="ax-kpi__icon" aria-hidden="true">
          <Icon />
        </span>
      </div>
      {state.loading ? (
        <span className="ax-skel" style={{ width: '70%', height: '1.75rem' }} />
      ) : state.error ? (
        <span className="ax-ov-kpi__error">{t('analyticsWidgetError')}</span>
      ) : (
        <p className="ax-kpi__value">
          <bdi>{main}</bdi>
          {unit && <span className="ax-kpi__unit">{unit}</span>}
        </p>
      )}
      <div className="ax-ov-kpi__foot">
        {showDelta && !state.loading && !state.error && (
          <Delta current={value} previous={previousValue} higherIsBetter={higherIsBetter} />
        )}
        {hint && <span className="ax-ov-kpi__hint">{hint}</span>}
      </div>
    </Link>
  );
};

// ─── Panel ───────────────────────────────────────────────────

export const Panel: React.FC<{
  title: string;
  icon: LucideIcon;
  to?: string;
  /** Grid columns spanned out of 12 on wide screens. */
  span: 3 | 4 | 5 | 6 | 7 | 8 | 12;
  state?: SourceState | SourceState[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon: Icon, to, span, state, actions, children }) => {
  const { t } = useLanguage();
  const states = state ? (Array.isArray(state) ? state : [state]) : [];
  if (states.length > 0 && states.every((s) => s.denied)) return null;
  const loading = states.some((s) => s.loading && !s.data);
  const failed = states.length > 0 && states.every((s) => s.error && !s.denied);

  return (
    <section className={`ax-card ax-ov-panel ax-ov-span-${span}`} aria-busy={loading}>
      <header className="ax-ov-panel__head">
        <h2 className="ax-ov-panel__title">
          <Icon aria-hidden="true" />
          {title}
        </h2>
        <div className="ax-ov-panel__actions">
          {actions}
          {to && (
            <Link to={to} className="ax-ov-link">
              {t('analyticsViewReport')}
              <ArrowRight aria-hidden="true" className="ax-ov-link__arrow" />
            </Link>
          )}
        </div>
      </header>
      <div className="ax-ov-panel__body">
        {loading ? (
          <div className="ax-ov-panel__skel" aria-hidden="true">
            {[90, 75, 60, 45].map((w) => (
              <span key={w} className="ax-skel" style={{ width: `${w}%`, height: '1rem' }} />
            ))}
          </div>
        ) : failed ? (
          <div className="ax-empty">
            <AlertTriangle aria-hidden="true" />
            <p>{t('analyticsWidgetError')}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
};

// ─── Ranked list with inline bars ────────────────────────────

export interface RankItem {
  key: string | number;
  label: string;
  value: number;
  meta?: string;
}

export const RankList: React.FC<{ items: RankItem[]; format?: Fmt; empty: string }> = ({
  items,
  format = 'currency',
  empty,
}) => {
  if (items.length === 0) {
    return (
      <div className="ax-empty ax-empty--sm">
        <p>{empty}</p>
      </div>
    );
  }
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <ol className="ax-rank">
      {items.map((item, i) => (
        <li key={item.key} className="ax-rank__row">
          <span className="ax-rank__pos">{i + 1}</span>
          <div className="ax-rank__main">
            <div className="ax-rank__line">
              <span className="ax-rank__label" title={item.label}>
                {item.label}
              </span>
              <span className="ax-rank__value">
                <bdi>{fmt(item.value, format)}</bdi>
              </span>
            </div>
            <div className="ax-rank__bar" aria-hidden="true">
              <span style={{ width: `${(Math.abs(item.value) / max) * 100}%` }} />
            </div>
            {item.meta && <span className="ax-rank__meta">{item.meta}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
};

// ─── Stat row (label / value pairs) ──────────────────────────

export const StatRow: React.FC<{
  label: string;
  value: unknown;
  format: Fmt;
  tone?: 'default' | 'danger' | 'warning' | 'success';
}> = ({ label, value, format, tone = 'default' }) => (
  <div className={`ax-stat ax-stat--${tone}`}>
    <span className="ax-stat__label">{label}</span>
    <span className="ax-stat__value">
      <bdi>{fmt(value, format)}</bdi>
    </span>
  </div>
);
