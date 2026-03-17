import { NavLink } from 'react-router-dom';
import { ClipboardList, Truck, CheckCircle2, User, type LucideIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/i18n';

const PRI = '#df7817';

interface Tab {
    path: string;
    icon: LucideIcon;
    labelKey: TranslationKey;
}

const TABS: Tab[] = [
    { path: '/orders', icon: ClipboardList, labelKey: 'ordersTab' },
    { path: '/active', icon: Truck, labelKey: 'inProgressTab' },
    { path: '/delivered', icon: CheckCircle2, labelKey: 'deliveredTab' },
    { path: '/profile', icon: User, labelKey: 'profileTab' },
];

export function BottomNav() {
    const { t } = useLanguage();

    return (
        <nav
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                background: '#ffffff',
                boxShadow: '0 -1px 0 rgba(0,0,0,0.07), 0 -3px 16px rgba(0,0,0,0.08)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                display: 'flex',
                alignItems: 'stretch',
                borderTop: '1px solid rgba(0,0,0,0.06)',
            }}
        >
            {TABS.map(({ path, icon: Icon, labelKey }) => (
                <NavLink
                    key={path}
                    to={path}
                    style={({ isActive }) => ({
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingTop: '9px',
                        paddingBottom: '9px',
                        gap: '3px',
                        textDecoration: 'none',
                        color: isActive ? PRI : '#9ca3af',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '11px',
                        letterSpacing: '0.01em',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        transition: 'color 0.14s',
                        WebkitTapHighlightColor: 'transparent',
                        minHeight: '60px',
                    })}
                >
                    {({ isActive }) => (
                        <>
                            <div
                                style={{
                                    width: '46px',
                                    height: '28px',
                                    borderRadius: '14px',
                                    background: isActive ? 'rgba(223,120,23,0.1)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.14s',
                                }}
                            >
                                <Icon
                                    size={22}
                                    color={isActive ? PRI : '#9ca3af'}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </div>
                            <span>{t(labelKey)}</span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}
