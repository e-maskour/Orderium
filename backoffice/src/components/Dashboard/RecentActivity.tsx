import { Clock, TrendingUp, Package, Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../lib/formatters';
import type { IRecentActivity as Activity } from '../../modules/statistics/statistics.interface';

interface RecentActivityProps {
  activities?: Activity[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  const { t, language } = useLanguage();

  // Helper function to format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} ${t('secondsAgo') || 'seconds ago'}`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${t('minutesAgo') || 'min ago'}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${t('hoursAgo') || 'hours ago'}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${t('daysAgo') || 'days ago'}`;
    }
  };

  // If no activities, show empty state
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800">{t('recentActivity')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t('latestUpdates')}</p>
        </div>
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t('noRecentActivity') || 'No recent activity'}</p>
        </div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return Package;
      case 'customer':
        return Users;
      case 'product':
        return Package;
      case 'revenue':
        return TrendingUp;
      default:
        return Clock;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-50 text-blue-600';
      case 'customer':
        return 'bg-purple-50 text-purple-600';
      case 'product':
        return 'bg-orange-50 text-orange-600';
      case 'revenue':
        return 'bg-green-50 text-green-600';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800">{t('recentActivity')}</h3>
        <p className="text-sm text-slate-500 mt-1">{t('latestUpdates')}</p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activities.map((activity, index) => {
            const Icon = getIcon(activity.type);
            const iconColor = getIconColor(activity.type);

            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors group cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-lg ${iconColor} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {activity.description}
                      </p>
                    </div>
                    {activity.value !== undefined && (
                      <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
                        {formatCurrency(activity.value, language)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400 font-medium">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
