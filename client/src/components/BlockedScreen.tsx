import { AlertTriangle, XCircle, PauseCircle, BanIcon } from 'lucide-react';

type BlockReason = 'trial_expired' | 'subscription_expired' | 'suspended' | 'disabled';

interface Props {
    reason: BlockReason;
}

const CONFIG: Record<BlockReason, { icon: React.ReactNode; title: string; description: string; accent: string }> = {
    trial_expired: {
        icon: <AlertTriangle size={48} color="#d97706" />,
        title: 'Trial Period Ended',
        description: 'Your free trial has expired. Please contact your administrator to activate a subscription and regain access.',
        accent: '#d97706',
    },
    subscription_expired: {
        icon: <XCircle size={48} color="#ea580c" />,
        title: 'Subscription Expired',
        description: 'Your subscription has expired. Please contact your administrator to renew and restore access.',
        accent: '#ea580c',
    },
    suspended: {
        icon: <PauseCircle size={48} color="#dc2626" />,
        title: 'Account Suspended',
        description: 'Your account has been temporarily suspended. Please contact your administrator for more information.',
        accent: '#dc2626',
    },
    disabled: {
        icon: <BanIcon size={48} color="#6b7280" />,
        title: 'Account Disabled',
        description: 'Your account has been disabled. Please contact your administrator to re-enable access.',
        accent: '#6b7280',
    },
};

export function BlockedScreen({ reason }: Props) {
    const { icon, title, description, accent } = CONFIG[reason];

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-ground, #f8fafc)',
            padding: '1rem',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '28rem',
                background: 'var(--surface-card, #ffffff)',
                borderRadius: '1rem',
                border: `1px solid ${accent}33`,
                padding: '2.5rem 2rem',
                textAlign: 'center',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    {icon}
                </div>
                <h1 style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--text-color, #111827)',
                    margin: '0 0 0.75rem',
                }}>
                    {title}
                </h1>
                <p style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-color-secondary, #6b7280)',
                    lineHeight: 1.6,
                    margin: '0 0 1.5rem',
                }}>
                    {description}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="cl-btn-primary"
                    style={{ marginBottom: '1.25rem', padding: '0.625rem 2rem' }}
                >
                    Retry
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary, #9ca3af)', margin: 0 }}>
                    If you believe this is a mistake, please reach out to your platform administrator.
                </p>
            </div>
        </div>
    );
}
