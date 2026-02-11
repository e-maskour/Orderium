import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

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

const colorClasses = {
  amber: {
    bg: 'from-amber-500 to-amber-600',
    shadow: 'shadow-amber-500/30',
    text: 'text-amber-600',
    lightBg: 'bg-amber-50',
  },
  blue: {
    bg: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/30',
    text: 'text-blue-600',
    lightBg: 'bg-blue-50',
  },
  green: {
    bg: 'from-green-500 to-green-600',
    shadow: 'shadow-green-500/30',
    text: 'text-green-600',
    lightBg: 'bg-green-50',
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    shadow: 'shadow-purple-500/30',
    text: 'text-purple-600',
    lightBg: 'bg-purple-50',
  },
  red: {
    bg: 'from-red-500 to-red-600',
    shadow: 'shadow-red-500/30',
    text: 'text-red-600',
    lightBg: 'bg-red-50',
  },
  emerald: {
    bg: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/30',
    text: 'text-emerald-600',
    lightBg: 'bg-emerald-50',
  },
  orange: {
    bg: 'from-orange-500 to-orange-600',
    shadow: 'shadow-orange-500/30',
    text: 'text-orange-600',
    lightBg: 'bg-orange-50',
  },
  indigo: {
    bg: 'from-indigo-500 to-indigo-600',
    shadow: 'shadow-indigo-500/30',
    text: 'text-indigo-600',
    lightBg: 'bg-indigo-50',
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
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded-md',
                  trend.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-slate-400 font-medium">vs last period</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-11 h-11 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300',
            colors.bg,
            colors.shadow
          )}
        >
          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
};
