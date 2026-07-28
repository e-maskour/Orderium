import React from 'react';

interface KpiCard {
  label: string;
  value: string | number;
  suffix?: string;
  color?: 'green' | 'red' | 'blue' | 'orange' | 'purple' | 'teal';
  icon?: string;
}

interface ReportKpiCardsProps {
  cards: KpiCard[];
}

function formatValue(value: string | number, suffix?: string): string {
  if (typeof value === 'number') {
    if (suffix === 'MAD') {
      return (
        value.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
        ' MAD'
      );
    }
    return value.toLocaleString('fr-MA');
  }
  return String(value) + (suffix ? ` ${suffix}` : '');
}

const COLOR_STYLES: Record<string, { text: string; icon: string; bg: string; border: string }> = {
  green: {
    text: 'var(--green-700)',
    icon: 'pi-arrow-up-right',
    bg: 'var(--green-50)',
    border: 'var(--green-200)',
  },
  red: {
    text: 'var(--red-600)',
    icon: 'pi-arrow-down-right',
    bg: 'var(--red-50)',
    border: 'var(--red-200)',
  },
  blue: {
    text: 'var(--blue-700)',
    icon: 'pi-chart-bar',
    bg: 'var(--blue-50)',
    border: 'var(--blue-200)',
  },
  orange: {
    text: 'var(--orange-600)',
    icon: 'pi-shopping-bag',
    bg: 'var(--orange-50)',
    border: 'var(--orange-200)',
  },
  purple: {
    text: 'var(--purple-700)',
    icon: 'pi-file',
    bg: 'var(--purple-50)',
    border: 'var(--purple-200)',
  },
  teal: { text: '#0d9488', icon: 'pi-users', bg: '#f0fdfa', border: '#99f6e4' },
};

const DEFAULT_ICONS: string[] = [
  'pi-chart-line',
  'pi-shopping-bag',
  'pi-percentage',
  'pi-wallet',
  'pi-box',
];

const ReportKpiCards: React.FC<ReportKpiCardsProps> = ({ cards }) => {
  return (
    <div className="grid m-0" style={{ gap: '0.75rem' }}>
      {cards.map((card, i) => {
        const style = COLOR_STYLES[card.color ?? 'blue'] ?? COLOR_STYLES.blue;
        const iconClass = card.icon ?? DEFAULT_ICONS[i % DEFAULT_ICONS.length];
        return (
          <div key={i} className="col-12 md:col-6 lg:col-3" style={{ padding: '0.375rem' }}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: 'var(--erp-radius)',
                border: `1px solid var(--erp-border)`,
                boxShadow: 'var(--erp-shadow-sm)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative blob */}
              <div
                style={{
                  position: 'absolute',
                  top: '-1rem',
                  right: '-1rem',
                  width: '4rem',
                  height: '4rem',
                  borderRadius: '9999px',
                  background: `radial-gradient(circle, ${style.bg} 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />

              {/* Icon box + label row */}
              <div className="flex align-items-center justify-content-between">
                <span className="text-600 text-sm font-medium">{card.label}</span>
                <div
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    borderRadius: '0.625rem',
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i
                    className={`pi ${iconClass}`}
                    style={{ fontSize: '0.875rem', color: style.text }}
                  />
                </div>
              </div>

              {/* Value */}
              <p
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: style.text,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                {formatValue(card.value, card.suffix)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReportKpiCards;
