import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'amber' | 'blue' | 'green' | 'purple' | 'red' | 'emerald' | 'orange' | 'indigo';
  subtitle?: string;
}

const colorStyles = {
  amber: {
    gradient: 'linear-gradient(to bottom right, #f59e0b, #d97706)',
    shadow: '0 4px 6px -1px rgba(245,158,11,0.3)',
  },
  blue: {
    gradient: 'linear-gradient(to bottom right, #3b82f6, #2563eb)',
    shadow: '0 4px 6px -1px rgba(59,130,246,0.3)',
  },
  green: {
    gradient: 'linear-gradient(to bottom right, #22c55e, #16a34a)',
    shadow: '0 4px 6px -1px rgba(34,197,94,0.3)',
  },
  purple: {
    gradient: 'linear-gradient(to bottom right, #a855f7, #9333ea)',
    shadow: '0 4px 6px -1px rgba(168,85,247,0.3)',
  },
  red: {
    gradient: 'linear-gradient(to bottom right, #ef4444, #dc2626)',
    shadow: '0 4px 6px -1px rgba(239,68,68,0.3)',
  },
  emerald: {
    gradient: 'linear-gradient(to bottom right, #10b981, #059669)',
    shadow: '0 4px 6px -1px rgba(16,185,129,0.3)',
  },
  orange: {
    gradient: 'linear-gradient(to bottom right, #f97316, #ea580c)',
    shadow: '0 4px 6px -1px rgba(249,115,22,0.3)',
  },
  indigo: {
    gradient: 'linear-gradient(to bottom right, #6366f1, #4f46e5)',
    shadow: '0 4px 6px -1px rgba(99,102,241,0.3)',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  subtitle,
}) => {
  const colors = colorStyles[color];

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '0.75rem',
      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
      border: '1px solid rgba(226,232,240,0.6)',
      padding: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.375rem' }}>{title}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{value}</p>
          {subtitle && (
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginTop: '0.125rem' }}>{subtitle}</p>
          )}
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.125rem 0.375rem',
                  borderRadius: '0.375rem',
                  backgroundColor: trend.isPositive ? '#f0fdf4' : '#fef2f2',
                  color: trend.isPositive ? '#16a34a' : '#dc2626',
                }}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>vs last period</span>
            </div>
          )}
        </div>
        <div
          style={{
            width: '2.75rem',
            height: '2.75rem',
            background: colors.gradient,
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: colors.shadow,
          }}
        >
          <Icon style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
};
