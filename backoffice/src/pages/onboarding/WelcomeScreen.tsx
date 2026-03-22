import { Building2, Clock } from 'lucide-react';

interface WelcomeScreenProps {
    onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
    return (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            {/* Logo */}
            <div style={{ marginBottom: '2rem' }}>
                <div
                    style={{
                        width: '5rem',
                        height: '5rem',
                        borderRadius: '1.25rem',
                        background: 'linear-gradient(135deg, #235ae4 0%, #1a47b8 100%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(35,90,228,0.35)',
                        marginBottom: '1.5rem',
                    }}
                >
                    <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff' }}>O</span>
                </div>
                <h1
                    style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        margin: '0 0 0.5rem',
                    }}
                >
                    Welcome to Orderium
                </h1>
                <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
                    Let's set up your business in just 2 steps
                </p>
            </div>

            {/* Steps preview */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    margin: '2rem 0',
                    textAlign: 'left',
                }}
            >
                {[
                    { step: 1, title: 'Company Profile', desc: 'Tell us about your business' },
                    { step: 2, title: 'Admin Account', desc: 'Create your administrator login' },
                ].map(({ step, title, desc }) => (
                    <div
                        key={step}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                        }}
                    >
                        <div
                            style={{
                                width: '2.25rem',
                                height: '2.25rem',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                flexShrink: 0,
                            }}
                        >
                            {step}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9375rem' }}>
                                {title}
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Time estimate */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    color: '#94a3b8',
                    fontSize: '0.8125rem',
                    marginBottom: '2rem',
                }}
            >
                <Clock size={14} />
                <span>Takes about 2 minutes</span>
            </div>

            {/* CTA */}
            <button
                onClick={onStart}
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
                    boxShadow: '0 4px 14px rgba(35,90,228,0.4)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        '0 6px 20px rgba(35,90,228,0.5)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        '0 4px 14px rgba(35,90,228,0.4)';
                }}
            >
                Get Started →
            </button>
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                <Building2 size={13} />
                <span>Free to set up, no credit card required</span>
            </div>
        </div>
    );
}
