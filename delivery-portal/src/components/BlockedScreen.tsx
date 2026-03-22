import { AlertTriangle, XCircle, PauseCircle, BanIcon } from 'lucide-react';

type BlockReason = 'trial_expired' | 'subscription_expired' | 'suspended' | 'disabled';

interface Props {
    reason: BlockReason;
}

const PRI = '#df7817';

const CONFIG: Record<BlockReason, { icon: React.ReactNode; title: string; description: string; accent: string }> = {
    trial_expired: {
        icon: <AlertTriangle size={48} color="#d97706" />,
        title: 'Trial Period Ended',
        description: 'The free trial has expired. Please contact the administrator to activate a subscription and regain access.',
        accent: '#d97706',
    },
    subscription_expired: {
        icon: <XCircle size={48} color="#ea580c" />,
        title: 'Subscription Expired',
        description: 'The subscription has expired. Please contact the administrator to renew and restore access.',
        accent: '#ea580c',
    },
    suspended: {
        icon: <PauseCircle size={48} color="#dc2626" />,
        title: 'Account Suspended',
        description: 'This account has been temporarily suspended. Please contact your administrator for more information.',
        accent: '#dc2626',
    },
    disabled: {
        icon: <BanIcon size={48} color="#6b7280" />,
        title: 'Account Disabled',
        description: 'This account has been disabled. Please contact your administrator to re-enable access.',
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
            background: `linear-gradient(135deg, #7c420d 0%, #3d1a06 100%)`,
            padding: '1rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '26rem',
                background: '#ffffff',
                borderRadius: '1.25rem',
                border: `1px solid ${accent}55`,
                padding: '2.5rem 2rem',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.32)',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                }}>
                    {icon}
                </div>
                <h1 style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#111827',
                    margin: '0 0 0.75rem',
                }}>
                    {title}
                </h1>
                <p style={{
                    fontSize: '0.9rem',
                    color: '#6b7280',
                    lineHeight: 1.6,
                    margin: '0 0 1.5rem',
                }}>
                    {description}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        display: 'inline-block',
                        padding: '0.55rem 1.5rem',
                        background: accent,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: '1.25rem',
                    }}
                >
                    Retry
                </button>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: `${PRI}18`,
                    borderRadius: '999px',
                    padding: '0.35rem 0.9rem',
                }}>
                    <span style={{ fontSize: '0.75rem', color: PRI, fontWeight: 600 }}>Delivery Portal</span>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '1.25rem', marginBottom: 0 }}>
                    If you believe this is a mistake, please reach out to your platform administrator.
                </p>
            </div>
        </div>
    );
}
