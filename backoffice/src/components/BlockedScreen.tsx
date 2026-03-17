import { AlertTriangle, XCircle, PauseCircle, Ban, Mail, ArrowLeft, ShieldOff, Clock } from 'lucide-react';

export type BlockReason = 'trial_expired' | 'subscription_expired' | 'suspended' | 'disabled';

interface Props {
    reason: BlockReason;
}

/* ── Brand tokens (mirrors Login.tsx) ───────────────────────────────────── */
const BRAND = '#235ae4';
const BRAND_DARK = '#1a47b8';
const BRAND_DEEP = '#0f2d7a';

/* ── Per-status configuration ───────────────────────────────────────────── */
interface StatusConfig {
    Icon: React.ElementType;
    badge: string;   // pill text
    title: string;
    detail: string;
    accentLight: string;  // icon bg tint
    accentIcon: string;   // icon colour
    accentBorder: string; // card border
}

const CONFIG: Record<BlockReason, StatusConfig> = {
    suspended: {
        Icon: PauseCircle,
        badge: 'Account Suspended',
        title: 'Your account has been suspended',
        detail: 'Access to this workspace has been temporarily suspended by your platform administrator. All your data is safe and preserved.',
        accentLight: '#fef2f2',
        accentIcon: '#dc2626',
        accentBorder: '#fecaca',
    },
    disabled: {
        Icon: Ban,
        badge: 'Account Disabled',
        title: 'Your account has been disabled',
        detail: 'This workspace has been disabled by your platform administrator. Please reach out to have it re-enabled.',
        accentLight: '#f8fafc',
        accentIcon: '#475569',
        accentBorder: '#cbd5e1',
    },
    subscription_expired: {
        Icon: XCircle,
        badge: 'Subscription Expired',
        title: 'Your subscription has expired',
        detail: 'Your plan has expired and access has been paused. Please renew your subscription to restore full access for your team.',
        accentLight: '#fff7ed',
        accentIcon: '#dc2626',
        accentBorder: '#fca5a5',
    },
    trial_expired: {
        Icon: Clock,
        badge: 'Trial Ended',
        title: 'Your free trial has ended',
        detail: 'Your trial period has concluded. Upgrade to a paid plan to continue using Orderium without interruption.',
        accentLight: '#eff6ff',
        accentIcon: '#235ae4',
        accentBorder: 'rgba(35,90,228,0.2)',
    },
};

export function BlockedScreen({ reason }: Props) {
    const { Icon, badge, title, detail, accentLight, accentIcon, accentBorder } = CONFIG[reason];

    return (
        <>
            <style>{`
                @keyframes blk-fade-in  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
                @keyframes blk-blob     { 0%,100% { transform:scale(1) translate(0,0); } 40% { transform:scale(1.1) translate(20px,-16px); } 70% { transform:scale(0.92) translate(-14px,12px); } }
                @keyframes blk-icon-in  { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
                .blk-card { animation: blk-fade-in 0.5s ease both; }
                .blk-icon { animation: blk-icon-in 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s both; }
                .blk-btn:hover { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 8px 24px rgba(35,90,228,0.4) !important; }
                .blk-btn { transition: filter 0.17s, transform 0.17s, box-shadow 0.17s; }
                .blk-back:hover { color:#235ae4 !important; }
                .blk-back { transition: color 0.17s; }
            `}</style>

            {/* ── Full-screen backdrop ── */}
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${BRAND_DEEP} 0%, #0a1535 100%)`,
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>

                {/* Decorative blobs */}
                <div style={{ position: 'absolute', top: '-6rem', right: '-6rem', width: '22rem', height: '22rem', borderRadius: '50%', background: 'rgba(35,90,228,0.14)', filter: 'blur(48px)', animation: 'blk-blob 14s ease-in-out infinite', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-8rem', left: '-4rem', width: '28rem', height: '28rem', borderRadius: '50%', background: 'rgba(26,71,184,0.10)', filter: 'blur(56px)', animation: 'blk-blob 18s ease-in-out 3s infinite reverse', pointerEvents: 'none' }} />

                {/* ── Card ── */}
                <div className="blk-card" style={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    maxWidth: '30rem',
                    background: '#ffffff',
                    borderRadius: '1.5rem',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
                    overflow: 'hidden',
                }}>

                    {/* Top accent bar */}
                    <div style={{ height: '4px', background: `linear-gradient(90deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }} />

                    <div style={{ padding: '2.5rem 2.5rem 2rem' }}>

                        {/* Brand + nav row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <div style={{
                                    width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
                                    background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 4px 12px rgba(35,90,228,0.35)`,
                                    flexShrink: 0,
                                }}>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>O</span>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', letterSpacing: '-0.01em' }}>Orderium</span>
                            </div>

                            <a
                                href="/login"
                                className="blk-back"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', fontWeight: 500, color: '#64748b', textDecoration: 'none' }}
                            >
                                <ArrowLeft size={14} />
                                Back to login
                            </a>
                        </div>

                        {/* Status icon bubble */}
                        <div className="blk-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '5rem', height: '5rem', borderRadius: '50%',
                                background: accentLight,
                                border: `2px solid ${accentBorder}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 4px 20px ${accentIcon}22`,
                            }}>
                                <Icon size={28} color={accentIcon} strokeWidth={1.75} />
                            </div>
                        </div>

                        {/* Badge pill */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                background: accentLight,
                                border: `1px solid ${accentBorder}`,
                                color: accentIcon,
                                borderRadius: '999px',
                                padding: '0.25rem 0.875rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase',
                            }}>
                                <ShieldOff size={11} />
                                {badge}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 style={{
                            textAlign: 'center',
                            fontSize: '1.3125rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            margin: '0 0 0.75rem',
                            lineHeight: 1.3,
                            letterSpacing: '-0.015em',
                        }}>
                            {title}
                        </h1>

                        {/* Description */}
                        <p style={{
                            textAlign: 'center',
                            fontSize: '0.9rem',
                            color: '#64748b',
                            margin: '0 0 2rem',
                            lineHeight: 1.65,
                        }}>
                            {detail}
                        </p>

                        {/* Divider */}
                        <div style={{ height: '1px', background: '#f1f5f9', margin: '0 0 1.75rem' }} />

                        {/* Contact admin CTA */}
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.875rem',
                            padding: '1.125rem 1.25rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.875rem',
                            marginBottom: '1.5rem',
                        }}>
                            <div style={{
                                width: '2rem', height: '2rem', borderRadius: '0.5rem',
                                background: `rgba(35,90,228,0.1)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, marginTop: '0.1rem',
                            }}>
                                <Mail size={14} color={BRAND} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                                    Contact your administrator
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                                    If you believe this is a mistake or need immediate access, reach out to your platform administrator directly.
                                </div>
                            </div>
                        </div>

                        {/* Retry button */}
                        <button
                            className="blk-btn"
                            onClick={() => window.location.reload()}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: `0 4px 14px rgba(35,90,228,0.3)`,
                                letterSpacing: '-0.01em',
                            }}
                        >
                            Retry
                        </button>
                    </div>

                    {/* Footer */}
                    <div style={{
                        borderTop: '1px solid #f1f5f9',
                        padding: '0.875rem 2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                    }}>
                        <AlertTriangle size={12} color='#94a3b8' />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            If you believe this is an error, please contact <strong style={{ color: '#64748b' }}>support@orderium.io</strong>
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}

