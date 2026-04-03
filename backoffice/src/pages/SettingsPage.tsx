import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import {
  Settings,
  Globe,
  Bell,
  BellOff,
  ShoppingCart,
  Wallet,
  Package,
  Cpu,
  Truck,
  Megaphone,
  Layout,
  Save,
  HelpCircle,
  DollarSign,
  CalendarDays,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../lib/i18n';
import { toastSuccess } from '../services/toast.service';

interface NotifState {
  all: boolean;
  orders: boolean;
  payments: boolean;
  stock: boolean;
  system: boolean;
  delivery: boolean;
  marketing: boolean;
}

interface ProfessionalState {
  compactMode: boolean;
  autoSave: boolean;
  showTutorials: boolean;
}

const SETTINGS_KEY = 'morocom_user_settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  return null;
}

function persistSettings(data: object) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch {
    /* noop */
  }
}

const LANGUAGE_OPTIONS: { label: string; value: Language; flag: string; nativeLabel: string }[] = [
  { label: 'Français', nativeLabel: 'Français', value: 'fr', flag: '🇫🇷' },
  { label: 'العربية', nativeLabel: 'العربية (المغرب)', value: 'ar', flag: '🇲🇦' },
];

const DATE_FORMAT_OPTIONS_FR = [
  { label: 'JJ/MM/AAAA', value: 'dd/MM/yyyy' },
  { label: 'MM/JJ/AAAA', value: 'MM/dd/yyyy' },
  { label: 'AAAA-MM-JJ', value: 'yyyy-MM-dd' },
];

const DATE_FORMAT_OPTIONS_AR = [
  { label: 'يي/شش/سسسس', value: 'dd/MM/yyyy' },
  { label: 'شش/يي/سسسس', value: 'MM/dd/yyyy' },
  { label: 'سسسس-شش-يي', value: 'yyyy-MM-dd' },
];

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const isRTL = language === 'ar';
  const fontFamily = isRTL ? 'var(--font-arabic)' : 'var(--font-latin)';

  const stored = loadSettings();

  const [selectedLang, setSelectedLang] = useState<Language>(language);
  const [dateFormat, setDateFormat] = useState<string>(stored?.dateFormat || 'dd/MM/yyyy');

  const [notif, setNotif] = useState<NotifState>({
    all: stored?.notif?.all ?? true,
    orders: stored?.notif?.orders ?? true,
    payments: stored?.notif?.payments ?? true,
    stock: stored?.notif?.stock ?? true,
    system: stored?.notif?.system ?? true,
    delivery: stored?.notif?.delivery ?? true,
    marketing: stored?.notif?.marketing ?? false,
  });

  const [professional, setProfessional] = useState<ProfessionalState>({
    compactMode: stored?.professional?.compactMode ?? false,
    autoSave: stored?.professional?.autoSave ?? true,
    showTutorials: stored?.professional?.showTutorials ?? true,
  });

  useEffect(() => {
    setSelectedLang(language);
  }, [language]);

  const setAllNotif = (val: boolean) => {
    setNotif({
      all: val,
      orders: val,
      payments: val,
      stock: val,
      system: val,
      delivery: val,
      marketing: val,
    });
  };

  const toggleNotif = (key: keyof Omit<NotifState, 'all'>, val: boolean) => {
    const next = { ...notif, [key]: val };
    const allOn =
      next.orders && next.payments && next.stock && next.system && next.delivery && next.marketing;
    setNotif({ ...next, all: allOn });
  };

  const handleSave = () => {
    if (selectedLang !== language) setLanguage(selectedLang);
    persistSettings({ notif, professional, dateFormat });
    toastSuccess(t('settingsSaved'));
  };

  const dateOptions = isRTL ? DATE_FORMAT_OPTIONS_AR : DATE_FORMAT_OPTIONS_FR;

  const card = (children: React.ReactNode) => (
    <div
      style={{
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid rgba(35,90,228,0.1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        padding: '1.5rem',
      }}
    >
      {children}
    </div>
  );

  const sectionTitle = (icon: React.ReactNode, label: string, accent: string) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.25rem',
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }}
    >
      <div
        style={{
          width: '1.75rem',
          height: '1.75rem',
          borderRadius: '0.4375rem',
          background: `${accent}1a`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', fontFamily }}>
        {label}
      </span>
    </div>
  );

  const switchRow = (
    icon: React.ReactNode,
    label: string,
    desc: string | undefined,
    value: boolean,
    onChange: (v: boolean) => void,
    accent: string,
  ) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderRadius: '0.625rem',
        background: value ? `${accent}0d` : '#f9fafb',
        border: `1px solid ${value ? `${accent}22` : '#f3f4f6'}`,
        transition: 'all 0.15s ease',
        flexDirection: isRTL ? 'row-reverse' : 'row',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flex: 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '0.5625rem',
            flexShrink: 0,
            background: value ? `${accent}1a` : '#ebebeb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0, textAlign: isRTL ? 'right' : 'left' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: '#1e293b',
              fontFamily,
            }}
          >
            {label}
          </p>
          {desc && (
            <p
              style={{
                margin: 0,
                fontSize: '0.8125rem',
                color: '#94a3b8',
                fontFamily,
                marginTop: '0.125rem',
              }}
            >
              {desc}
            </p>
          )}
        </div>
      </div>
      <InputSwitch checked={value} onChange={(e) => onChange(e.value ?? false)} />
    </div>
  );

  return (
    <AdminLayout>
      <div style={{ direction: isRTL ? 'rtl' : 'ltr', fontFamily }}>
        <PageHeader
          icon={Settings}
          title={t('userSettings')}
          subtitle={t('languageAndRegion')}
          actions={
            <Button
              label={t('save')}
              onClick={handleSave}
              style={{
                background: 'linear-gradient(135deg,#235ae4,#1a47b8)',
                border: 'none',
                fontFamily,
                fontWeight: 600,
                minWidth: '10rem',
              }}
            />
          }
        />

        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* ── Language & Region ── */}
          {card(
            <>
              {sectionTitle(
                <Globe
                  style={{ width: '1rem', height: '1rem', color: '#6366f1' }}
                  strokeWidth={2}
                />,
                t('languageAndRegion'),
                '#6366f1',
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Language cards */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '0.625rem',
                      textAlign: isRTL ? 'right' : 'left',
                      fontFamily,
                    }}
                  >
                    {t('selectLanguage')}
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    }}
                  >
                    {LANGUAGE_OPTIONS.map((opt) => {
                      const active = selectedLang === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setSelectedLang(opt.value)}
                          style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            border: active ? '2px solid #6366f1' : '2px solid #e5e7eb',
                            background: active ? '#eef2ff' : '#fafafa',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.625rem',
                            transition: 'all 0.15s ease',
                            outline: 'none',
                          }}
                        >
                          <span style={{ fontSize: '1.625rem', lineHeight: 1 }}>{opt.flag}</span>
                          <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: '0.9375rem',
                                fontWeight: active ? 700 : 500,
                                color: active ? '#4f46e5' : '#374151',
                                fontFamily:
                                  opt.value === 'ar' ? 'var(--font-arabic)' : 'var(--font-latin)',
                              }}
                            >
                              {opt.label}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                fontFamily:
                                  opt.value === 'ar' ? 'var(--font-arabic)' : 'var(--font-latin)',
                              }}
                            >
                              {opt.nativeLabel}
                            </p>
                          </div>
                          {active && (
                            <div
                              style={{
                                marginLeft: isRTL ? 0 : 'auto',
                                marginRight: isRTL ? 'auto' : 0,
                                width: '1.25rem',
                                height: '1.25rem',
                                borderRadius: '50%',
                                background: '#6366f1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path
                                  d="M2 5L4.5 7.5L8 3"
                                  stroke="white"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date format */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '0.5rem',
                      textAlign: isRTL ? 'right' : 'left',
                      fontFamily,
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        justifyContent: isRTL ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <CalendarDays
                        style={{ width: '0.9375rem', height: '0.9375rem', color: '#6b7280' }}
                        strokeWidth={2}
                      />
                      {t('dateFormat')}
                    </span>
                  </label>
                  <Dropdown
                    value={dateFormat}
                    options={dateOptions}
                    onChange={(e) => setDateFormat(e.value)}
                    style={{ width: '100%', fontFamily }}
                    pt={{
                      input: {
                        dir: isRTL ? 'rtl' : 'ltr',
                        style: { fontFamily, textAlign: isRTL ? 'right' : 'left' },
                      },
                    }}
                  />
                </div>
              </div>
            </>,
          )}

          {/* ── Notifications ── */}
          {card(
            <>
              {sectionTitle(
                <Bell
                  style={{ width: '1rem', height: '1rem', color: '#f59e0b' }}
                  strokeWidth={2}
                />,
                t('notificationPreferences'),
                '#f59e0b',
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {/* Master toggle */}
                {switchRow(
                  notif.all ? (
                    <Bell
                      style={{ width: '1.1rem', height: '1.1rem', color: '#f59e0b' }}
                      strokeWidth={2}
                    />
                  ) : (
                    <BellOff
                      style={{ width: '1.1rem', height: '1.1rem', color: '#9ca3af' }}
                      strokeWidth={2}
                    />
                  ),
                  t('notifAll'),
                  undefined,
                  notif.all,
                  setAllNotif,
                  '#f59e0b',
                )}

                <div
                  style={{
                    paddingLeft: isRTL ? 0 : '1rem',
                    paddingRight: isRTL ? '1rem' : 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    opacity: notif.all ? 1 : 0.5,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {[
                    {
                      key: 'orders' as const,
                      icon: (
                        <ShoppingCart
                          style={{ width: '1.1rem', height: '1.1rem', color: '#10b981' }}
                          strokeWidth={2}
                        />
                      ),
                      label: t('notifOrders'),
                      accent: '#10b981',
                    },
                    {
                      key: 'payments' as const,
                      icon: (
                        <Wallet
                          style={{ width: '1.1rem', height: '1.1rem', color: '#3b82f6' }}
                          strokeWidth={2}
                        />
                      ),
                      label: t('notifPayments'),
                      accent: '#3b82f6',
                    },
                    {
                      key: 'stock' as const,
                      icon: (
                        <Package
                          style={{ width: '1.1rem', height: '1.1rem', color: '#8b5cf6' }}
                          strokeWidth={2}
                        />
                      ),
                      label: t('notifStock'),
                      accent: '#8b5cf6',
                    },
                    {
                      key: 'system' as const,
                      icon: (
                        <Cpu
                          style={{ width: '1.1rem', height: '1.1rem', color: '#64748b' }}
                          strokeWidth={2}
                        />
                      ),
                      label: t('notifSystem'),
                      accent: '#64748b',
                    },
                    {
                      key: 'delivery' as const,
                      icon: (
                        <Truck
                          style={{ width: '1.1rem', height: '1.1rem', color: '#0ea5e9' }}
                          strokeWidth={2}
                        />
                      ),
                      label: t('notifDelivery'),
                      accent: '#0ea5e9',
                    },
                    {
                      key: 'marketing' as const,
                      icon: (
                        <Megaphone
                          style={{ width: '1.1rem', height: '1.1rem', color: '#f97316' }}
                          strokeWidth={2}
                        />
                      ),
                      label: t('notifMarketing'),
                      accent: '#f97316',
                    },
                  ].map(({ key, icon, label, accent }) =>
                    switchRow(
                      icon,
                      label,
                      undefined,
                      notif[key],
                      (v) => toggleNotif(key, v),
                      accent,
                    ),
                  )}
                </div>
              </div>
            </>,
          )}

          {/* ── Professional Settings ── */}
          {card(
            <>
              {sectionTitle(
                <Settings
                  style={{ width: '1rem', height: '1rem', color: '#235ae4' }}
                  strokeWidth={2}
                />,
                t('professionalSettings'),
                '#235ae4',
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {switchRow(
                  <Layout
                    style={{ width: '1.1rem', height: '1.1rem', color: '#235ae4' }}
                    strokeWidth={2}
                  />,
                  t('compactMode'),
                  t('compactModeDesc'),
                  professional.compactMode,
                  (v) => setProfessional((p) => ({ ...p, compactMode: v })),
                  '#235ae4',
                )}
                {switchRow(
                  <Save
                    style={{ width: '1.1rem', height: '1.1rem', color: '#10b981' }}
                    strokeWidth={2}
                  />,
                  t('autoSave'),
                  t('autoSaveDesc'),
                  professional.autoSave,
                  (v) => setProfessional((p) => ({ ...p, autoSave: v })),
                  '#10b981',
                )}
                {switchRow(
                  <HelpCircle
                    style={{ width: '1.1rem', height: '1.1rem', color: '#8b5cf6' }}
                    strokeWidth={2}
                  />,
                  t('showTutorials'),
                  t('showTutorialsDesc'),
                  professional.showTutorials,
                  (v) => setProfessional((p) => ({ ...p, showTutorials: v })),
                  '#8b5cf6',
                )}

                {/* Default currency (display info) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.625rem',
                    background: '#f9fafb',
                    border: '1px solid #f3f4f6',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  }}
                >
                  <div
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '0.5625rem',
                      background: '#ebebeb',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <DollarSign
                      style={{ width: '1.1rem', height: '1.1rem', color: '#9ca3af' }}
                      strokeWidth={2}
                    />
                  </div>
                  <p
                    style={{
                      margin: 0,
                      flex: 1,
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      fontFamily,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {t('defaultCurrency')}
                  </p>
                  <span
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: '#374151',
                      fontFamily,
                      background: '#e5e7eb',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.4375rem',
                    }}
                  >
                    MAD — DH
                  </span>
                </div>
              </div>
            </>,
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
