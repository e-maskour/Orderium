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
      <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.6)', padding: '1.25rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{t('recentActivity')}</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{t('latestUpdates')}</p>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <Clock style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{t('noRecentActivity') || 'No recent activity'}</p>
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

  const getIconStyle = (type: string): React.CSSProperties => {
    switch (type) {
      case 'order':
        return { backgroundColor: '#eff6ff', color: '#2563eb' };
      case 'customer':
        return { backgroundColor: '#faf5ff', color: '#9333ea' };
      case 'product':
        return { backgroundColor: '#fff7ed', color: '#ea580c' };
      case 'revenue':
        return { backgroundColor: '#f0fdf4', color: '#16a34a' };
      default:
        return { backgroundColor: '#f8fafc', color: '#475569' };
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid rgba(226,232,240,0.6)', padding: '1.25rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{t('recentActivity')}</h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{t('latestUpdates')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {activities.map((activity, index) => {
            const Icon = getIcon(activity.type);
            const iconStyle = getIconStyle(activity.type);

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #f1f5f9',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  ...iconStyle,
                }}>
                  <Icon style={{ width: '1rem', height: '1rem' }} strokeWidth={2} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                        {activity.title}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activity.description}
                      </p>
                    </div>
                    {activity.value !== undefined && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                        {formatCurrency(activity.value, language)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem' }}>
                    <Clock style={{ width: '0.75rem', height: '0.75rem', color: '#94a3b8' }} />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
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
