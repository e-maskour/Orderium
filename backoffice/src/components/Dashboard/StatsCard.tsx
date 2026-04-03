import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  color?: 'amber' | 'blue' | 'green' | 'purple' | 'red' | 'emerald' | 'orange' | 'indigo';
  subtitle?: string;
  onClick?: () => void;
  progress?: number; // 0-100
}

const colorConfig: Record<
  string,
  { gradient: string; shadow: string; light: string; text: string }
> = {
  blue: {
    gradient: 'linear-gradient(135deg,#235ae4,#1a47b8)',
    shadow: 'rgba(35,90,228,0.28)',
    light: '#eef1fd',
    text: '#235ae4',
  },
  amber: {
    gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
    shadow: 'rgba(217,119,6,0.26)',
    light: '#fffbeb',
    text: '#d97706',
  },
  green: {
    gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
    shadow: 'rgba(22,163,74,0.26)',
    light: '#f0fdf4',
    text: '#16a34a',
  },
  purple: {
    gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    shadow: 'rgba(124,58,237,0.26)',
    light: '#f5f3ff',
    text: '#7c3aed',
  },
  red: {
    gradient: 'linear-gradient(135deg,#f43f5e,#e11d48)',
    shadow: 'rgba(225,29,72,0.26)',
    light: '#fff1f2',
    text: '#e11d48',
  },
  emerald: {
    gradient: 'linear-gradient(135deg,#10b981,#059669)',
    shadow: 'rgba(5,150,105,0.26)',
    light: '#ecfdf5',
    text: '#059669',
  },
  orange: {
    gradient: 'linear-gradient(135deg,#fb923c,#ea580c)',
    shadow: 'rgba(234,88,12,0.26)',
    light: '#fff7ed',
    text: '#ea580c',
  },
  indigo: {
    gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    shadow: 'rgba(79,70,229,0.26)',
    light: '#eef2ff',
    text: '#4f46e5',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  subtitle,
  onClick,
  progress,
}) => {
  const { t } = useLanguage();
  const c = colorConfig[color] || colorConfig.blue;
  const valStr = String(value);
  const valueFontSize = valStr.length > 12 ? '1.125rem' : valStr.length > 8 ? '1.5rem' : '1.875rem';

  return (
    <div
      className={`db-stats-card${onClick ? ' db-stats-card--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Left accent stripe */}
      <div className="db-stats-card-accent" style={{ background: c.gradient }} />

      {/* Subtle watermark circle */}
      <div
        style={{
          position: 'absolute',
          right: '-1rem',
          bottom: '-1rem',
          width: '6rem',
          height: '6rem',
          borderRadius: '50%',
          background: c.light,
          opacity: 0.55,
          pointerEvents: 'none',
        }}
      />

      {/* Row 1: label + icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginBottom: '0.625rem',
          position: 'relative',
        }}
      >
        <p
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: '#64748b',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            lineHeight: 1.4,
          }}
        >
          {title}
        </p>
        <div
          style={{
            width: '2.625rem',
            height: '2.625rem',
            borderRadius: '0.75rem',
            background: c.gradient,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px ${c.shadow}`,
          }}
        >
          <Icon style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} strokeWidth={2} />
        </div>
      </div>

      {/* Row 2: big value */}
      <p
        style={{
          fontSize: valueFontSize,
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 0.125rem',
          lineHeight: 1.1,
          letterSpacing: '-0.025em',
          position: 'relative',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p
          style={{
            fontSize: '0.6875rem',
            color: '#94a3b8',
            fontWeight: 500,
            margin: '0.25rem 0 0',
            position: 'relative',
          }}
        >
          {subtitle}
        </p>
      )}

      {/* Trend badge */}
      {trend && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
            position: 'relative',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '0.1875rem 0.5rem',
              borderRadius: '2rem',
              background: trend.isPositive ? '#f0fdf4' : '#fff1f2',
              color: trend.isPositive ? '#16a34a' : '#e11d48',
              border: `1px solid ${trend.isPositive ? '#bbf7d0' : '#fecdd3'}`,
            }}
          >
            {trend.isPositive ? (
              <TrendingUp style={{ width: '0.625rem', height: '0.625rem' }} strokeWidth={3} />
            ) : (
              <TrendingDown style={{ width: '0.625rem', height: '0.625rem' }} strokeWidth={3} />
            )}
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
          <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>
            {t('vsPeriod')}
          </span>
        </div>
      )}

      {/* Mini progress bar */}
      {progress !== undefined && (
        <div
          style={{
            marginTop: '0.875rem',
            height: '3px',
            background: '#e8ecf2',
            borderRadius: '9999px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${Math.min(progress, 100)}%`,
              height: '100%',
              background: c.gradient,
              borderRadius: '9999px',
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
      )}
    </div>
  );
};
