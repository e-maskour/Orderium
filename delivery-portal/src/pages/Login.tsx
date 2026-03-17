import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Truck, Phone, Lock, MapPin, Package, Clock, ArrowRight } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { LanguageToggle } from '@/components/LanguageToggle';

const PRI = '#df7817';
const PRI_DARK = '#b86314';
const PRI_DEEP = '#7c420d';

export default function Login() {
  const [credentials, setCredentials] = useState({ phoneNumber: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { t, dir } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(credentials);
      navigate('/orders');
    } catch (err) {
      setError(t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes dlv-fade-in { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dlv-blob    { 0%,100% { transform:scale(1) translate(0,0); } 33% { transform:scale(1.08) translate(16px,-12px); } 66% { transform:scale(0.94) translate(-12px,8px); } }
        @keyframes dlv-breathe { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
        @keyframes dlv-spin    { to { transform:rotate(360deg); } }
        @keyframes dlv-ring-pulse { 0% { box-shadow:0 0 36px rgba(255,255,255,0.14),0 4px 16px rgba(0,0,0,0.25),0 0 0 0 rgba(255,255,255,0.22); } 70% { box-shadow:0 0 36px rgba(255,255,255,0.14),0 4px 16px rgba(0,0,0,0.25),0 0 0 14px rgba(255,255,255,0); } 100% { box-shadow:0 0 36px rgba(255,255,255,0.14),0 4px 16px rgba(0,0,0,0.25),0 0 0 0 rgba(255,255,255,0); } }
        @keyframes dlv-icon-slide { 0%,100% { transform:translateX(0); filter:drop-shadow(0 2px 6px rgba(255,255,255,0.15)); } 50% { transform:translateX(8px); filter:drop-shadow(6px 2px 14px rgba(255,255,255,0.28)); } }
        .dlv-left  { animation: dlv-fade-in 0.55s ease both; }
        .dlv-right { animation: dlv-fade-in 0.55s ease 0.12s both; }
        .dlv-feature:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,0.18) !important; }
        .dlv-feature { transition: transform 0.2s, box-shadow 0.2s; }
        .dlv-btn:hover:not(:disabled) { filter:brightness(1.07); box-shadow:0 8px 24px rgba(223,120,23,0.45) !important; transform:translateY(-1px); }
        .dlv-btn { transition: filter 0.18s, box-shadow 0.18s, transform 0.18s; }
        .dlv-input-wrap { position:relative; }
        .dlv-input-wrap .dlv-ico { position:absolute; left:0.875rem; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; z-index:1; }
        .dlv-input-wrap .p-inputtext { padding-left:2.75rem !important; border-radius:0.75rem !important; }
        @media(max-width:767px){ .dlv-left{ display:none !important; } .dlv-right{ border-radius:1.25rem !important; } }
      `}</style>

      <div dir={dir} style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${PRI_DEEP} 0%, #3d1a06 100%)`,
        padding: '1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          display: 'flex', width: '100%', maxWidth: '960px', minHeight: '580px',
          borderRadius: '1.5rem', overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.45)',
        }}>

          {/* ── LEFT BRAND PANEL ── */}
          <div className="dlv-left" style={{
            flex: '1 1 45%',
            background: `linear-gradient(145deg, ${PRI} 0%, ${PRI_DARK} 55%, ${PRI_DEEP} 100%)`,
            padding: '3rem 2.5rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-70px', right: '-70px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', animation: 'dlv-blob 9s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', animation: 'dlv-blob 12s ease-in-out infinite reverse' }} />
            <div style={{ position: 'absolute', top: '38%', left: '62%', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'dlv-blob 14s ease-in-out infinite' }} />

            {/* Logo row */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                <div style={{
                  width: '4.25rem', height: '4.25rem', borderRadius: '1.125rem',
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'dlv-ring-pulse 2.5s ease-out infinite',
                  flexShrink: 0,
                }}>
                  <Truck style={{ width: '2.125rem', height: '2.125rem', color: '#fff', animation: 'dlv-icon-slide 3s ease-in-out infinite' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.625rem', color: '#fff', lineHeight: 1.1 }}>Orderium</div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.82)', marginTop: '0.2rem' }}>
                    {t('deliveryPortal')}
                  </div>
                </div>
              </div>

              <div style={{ animation: 'dlv-breathe 7s ease-in-out infinite', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '0 0 0.75rem' }}>
                  {t('loginHeroTitle')}<br />
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('loginHeroSubtitle')}</span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
                  {t('loginHeroDesc')}
                </p>
              </div>
            </div>

            {/* Feature pills */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { icon: Truck, label: t('loginFeatureRoute') },
                  { icon: Package, label: t('loginFeatureOrderMgmt') },
                  { icon: MapPin, label: t('loginFeatureLiveTracking') },
                  { icon: Clock, label: t('loginFeatureShift') },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="dlv-feature" style={{
                    background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.18)', borderRadius: '0.875rem',
                    padding: '0.875rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'default',
                  }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '0.5rem',
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon style={{ width: '1rem', height: '1rem', color: '#fff' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT FORM PANEL ── */}
          <div className="dlv-right" style={{
            flex: '1 1 55%', background: '#fff',
            padding: '3rem 2.75rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                background: `rgba(223,120,23,0.09)`, borderRadius: '999px',
                padding: '0.25rem 0.75rem', marginBottom: '1rem',
              }}>
                <Truck style={{ width: '0.875rem', height: '0.875rem', color: PRI }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: PRI }}>{t('deliveryDriverAccess')}</span>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.375rem', lineHeight: 1.2 }}>
                {t('welcomeBack')} 🚚
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.925rem', margin: 0 }}>
                {t('loginSignInDesc')}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Phone */}
              <div>
                <label htmlFor="phone" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
                  {t('phoneNumber')}
                </label>
                <div className="dlv-input-wrap">
                  <Phone className="dlv-ico" style={{ width: '1rem', height: '1rem' }} />
                  <InputText
                    id="phone"
                    type="tel"
                    placeholder={t('enterPhoneNumber')}
                    value={credentials.phoneNumber}
                    onChange={(e) => { setCredentials({ ...credentials, phoneNumber: e.target.value }); setError(''); }}
                    disabled={isLoading}
                    style={{ width: '100%', border: '1.5px solid #e2e8f0', fontSize: '0.9375rem' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
                  {t('password')}
                </label>
                <div className="dlv-input-wrap">
                  <Lock className="dlv-ico" style={{ width: '1rem', height: '1rem' }} />
                  <InputText
                    id="password"
                    type="password"
                    placeholder={t('enterPassword')}
                    value={credentials.password}
                    onChange={(e) => { setCredentials({ ...credentials, password: e.target.value }); setError(''); }}
                    disabled={isLoading}
                    style={{ width: '100%', border: '1.5px solid #e2e8f0', fontSize: '0.9375rem' }}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '0.75rem 1rem', background: '#fef2f2',
                  border: '1px solid #fecaca', borderRadius: '0.75rem',
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                }}>
                  <span style={{ color: '#ef4444', fontSize: '1rem', lineHeight: 1 }}>⚠</span>
                  <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="dlv-btn"
                style={{
                  width: '100%', padding: '0.875rem 1.5rem',
                  border: 'none', borderRadius: '0.875rem',
                  background: isLoading ? '#94a3b8' : `linear-gradient(135deg, ${PRI} 0%, ${PRI_DARK} 100%)`,
                  color: '#fff', fontSize: '0.9375rem', fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  letterSpacing: '0.02em', marginTop: '0.25rem',
                  boxShadow: `0 4px 16px rgba(223,120,23,0.3)`,
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{ display: 'inline-block', width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'dlv-spin 0.7s linear infinite' }} />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    {t('login')}
                    <ArrowRight style={{ width: '1rem', height: '1rem' }} />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div style={{
              marginTop: '2rem', paddingTop: '1.5rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                © {new Date().getFullYear()} {t('appName')}
              </p>
              <LanguageToggle />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
