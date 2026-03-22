import { useState } from 'react';
import { CheckCircle, Copy, ExternalLink, MessageCircle, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuccessScreenProps {
    companyName: string;
    companyLogo?: string;
}

// Derive sibling portal URLs from the current hostname so tenant subdomains
// (e.g. demo.localhost) are preserved automatically.
function portalUrl(port: number): string {
    if (import.meta.env.PROD) {
        // In production, each portal has its own env var
        return '';
    }
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${port}`;
}

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || window.location.origin;
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || portalUrl(3002);
const DELIVERY_URL = import.meta.env.VITE_DELIVERY_URL || portalUrl(3003);

interface PortalCard {
    label: string;
    url: string;
    icon: string;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            onClick={handleCopy}
            title="Copy URL"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.375rem 0.625rem',
                borderRadius: '0.375rem',
                background: copied ? '#dcfce7' : '#f1f5f9',
                border: copied ? '1px solid #86efac' : '1px solid #e2e8f0',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: copied ? '#16a34a' : '#64748b',
                transition: 'all 0.15s',
            }}
        >
            <Copy size={12} />
            {copied ? 'Copied!' : 'Copy'}
        </button>
    );
}

function PortalLinkCard({ label, url, icon }: PortalCard) {
    const hasUrl = Boolean(url);

    return (
        <div
            style={{
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: '1rem',
                background: hasUrl ? '#fff' : '#f8fafc',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.125rem' }}>{icon}</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {hasUrl && (
                        <>
                            <CopyButton text={url} />
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.375rem 0.625rem',
                                    borderRadius: '0.375rem',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#64748b',
                                    textDecoration: 'none',
                                }}
                            >
                                <ExternalLink size={12} />
                                Open
                            </a>
                        </>
                    )}
                </div>
            </div>
            <div
                style={{
                    fontSize: '0.8125rem',
                    color: hasUrl ? '#235ae4' : '#94a3b8',
                    wordBreak: 'break-all',
                    fontFamily: 'ui-monospace, monospace',
                }}
            >
                {hasUrl ? url : 'Configure VITE_CLIENT_URL / VITE_DELIVERY_URL in .env'}
            </div>
        </div>
    );
}

export default function SuccessScreen({ companyName, companyLogo }: SuccessScreenProps) {
    const navigate = useNavigate();

    const portals: PortalCard[] = [
        { label: 'Admin Panel', url: ADMIN_URL, icon: '🏢' },
        { label: 'Client Portal', url: CLIENT_URL, icon: '👤' },
        { label: 'Delivery Portal', url: DELIVERY_URL, icon: '🚚' },
    ];

    const whatsappMessage = encodeURIComponent(
        `🎉 ${companyName} is now live on Orderium!\n\nAccess your portals:\n• Admin: ${ADMIN_URL}\n${CLIENT_URL ? `• Client: ${CLIENT_URL}\n` : ''}${DELIVERY_URL ? `• Delivery: ${DELIVERY_URL}` : ''}`,
    );

    return (
        <div style={{ textAlign: 'center' }}>
            {/* Animated checkmark */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div
                    style={{
                        width: '5rem',
                        height: '5rem',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
                        animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                >
                    <CheckCircle size={36} style={{ color: '#fff' }} />
                </div>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
                You're all set!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                Welcome to Orderium, <strong>{companyName}</strong>. Your admin account is ready.
            </p>

            {/* Company badge */}
            {companyLogo && (
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem 1rem',
                        borderRadius: '0.75rem',
                        background: '#f0f4ff',
                        border: '1px solid #c7d7fd',
                        marginBottom: '1.5rem',
                    }}
                >
                    <img
                        src={companyLogo}
                        alt="Company logo"
                        style={{ height: '2rem', maxWidth: '6rem', objectFit: 'contain', borderRadius: '0.25rem' }}
                    />
                    <span style={{ fontWeight: 600, color: '#235ae4' }}>{companyName}</span>
                </div>
            )}

            {/* Portal links */}
            <div
                style={{
                    textAlign: 'left',
                    marginBottom: '1.5rem',
                }}
            >
                <div
                    style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '0.75rem',
                    }}
                >
                    Share these links with your team
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {portals.map((p) => (
                        <PortalLinkCard key={p.label} {...p} />
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                    onClick={() => {
                        navigate('/dashboard');
                    }}
                    style={{
                        width: '100%',
                        padding: '0.875rem',
                        borderRadius: '0.75rem',
                        background: 'linear-gradient(135deg, #235ae4 0%, #1a47b8 100%)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '1rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(35,90,228,0.4)',
                    }}
                >
                    <LayoutDashboard size={18} />
                    Go to Dashboard
                </button>

                {(CLIENT_URL || DELIVERY_URL || ADMIN_URL) && (
                    <a
                        href={`https://wa.me/?text=${whatsappMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            borderRadius: '0.75rem',
                            background: '#dcfce7',
                            color: '#166534',
                            fontWeight: 600,
                            fontSize: '0.9375rem',
                            border: '1px solid #bbf7d0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            textDecoration: 'none',
                        }}
                    >
                        <MessageCircle size={18} />
                        Share via WhatsApp
                    </a>
                )}
            </div>

            <style>{`
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    );
}
