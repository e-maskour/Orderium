import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav } from '@/components/BottomNav';
import { useCart } from '@/context/CartContext';
import { Link } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon, ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react';

export default function Settings() {
    const { logout } = useAuth();
    const { dir, t } = useLanguage();
    const navigate = useNavigate();
    const { isCartOpen, closeCart } = useCart();

    const BackIcon: LucideIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

    return (
        <div
            dir={dir}
            style={{
                minHeight: '100vh',
                background: '#f3f4f6',
                fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                paddingBottom: '5rem',
            }}
        >
            {/* Gradient header */}
            <div style={{
                background: 'linear-gradient(135deg, #15803d 0%, #059669 100%)',
                padding: '1rem 1.25rem 3.5rem',
                paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', textDecoration: 'none', color: 'white', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
                        <BackIcon size={18} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <SettingsIcon size={26} strokeWidth={2.5} style={{ color: '#fff', flexShrink: 0 }} />
                        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
                            {t('settings')}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Content — overlaps header */}
            <div style={{ padding: '0 1rem', marginTop: '-2.25rem', maxWidth: '40rem', marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {/* Language + Logout card */}
                <div
                    style={{
                        background: '#fff',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                    }}
                >
                    {/* Language row */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.125rem',
                            borderBottom: '1px solid #f3f4f6',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: '#f0f7ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <span style={{ fontSize: '1.1rem' }}>🌐</span>
                            </div>
                            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
                                {t('language')}
                            </span>
                        </div>
                        <LanguageToggle />
                    </div>

                    {/* Logout row */}
                    <button
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1rem 1.125rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                            textAlign: 'left' as const,
                        }}
                    >
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: '#fef2f2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <LogOut size={18} color="#dc2626" />
                        </div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626' }}>
                            {t('logout')}
                        </span>
                    </button>
                </div>

                <p
                    style={{
                        textAlign: 'center',
                        color: '#d1d5db',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        marginTop: '0.5rem',
                    }}
                >
                    Morocom · v1.0
                </p>
            </div>

            <CartDrawer isOpen={isCartOpen} onClose={closeCart} isPanelMode={false} />
            <BottomNav />
        </div>
    );
}
