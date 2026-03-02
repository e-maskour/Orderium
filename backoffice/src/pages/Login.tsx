import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { Shield } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

export default function Login() {
  const [credentials, setCredentials] = useState({ phoneNumber: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(credentials);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)', padding: '1rem' }}>
      <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '0.75rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', width: '100%', maxWidth: '28rem', border: '1px solid #e2e8f0' }}>
        {/* Professional Admin Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ margin: '0 auto', position: 'relative', width: '8rem', height: '8rem', marginBottom: '1rem' }}>
            {/* Animated security pattern background */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: '0.25rem', background: 'linear-gradient(to right, transparent, rgba(35,90,228,0.3), transparent)', borderRadius: '9999px', opacity: 0.4 }}></div>
              <div className="animate-ping" style={{ position: 'absolute', left: '20%', width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#235ae4' }}></div>
              <div className="animate-pulse" style={{ position: 'absolute', right: '20%', width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#235ae4' }}></div>
            </div>

            {/* Main Orderium O Logo */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '6rem', height: '6rem', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)' }}>
                {/* Subtle shine effect */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top right, transparent, rgba(255,255,255,0.1), transparent)' }}></div>
                {/* Large O */}
                <span style={{ fontSize: '3rem', fontWeight: 700, color: '#ffffff', position: 'relative', zIndex: 10 }}>O</span>
              </div>
            </div>

            {/* Shield Icon Badge for Admin */}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '3rem', height: '3rem', background: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #e0ebff' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)' }}>
                <Shield style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }} />
              </div>
            </div>
          </div>

          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{t('appName')}</h1>
          <p style={{ fontSize: '1rem', color: '#6b7280' }}>{t('adminBackoffice')}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>{t('welcomeBack')}</p>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <LanguageToggle />
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="login-phone" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{t('phoneNumber')}</label>
            <InputText
              id="login-phone"
              type="tel"
              value={String(credentials.phoneNumber)}
              onChange={(e) => {
                setCredentials({ ...credentials, phoneNumber: e.target.value });
                setError('');
              }}
              placeholder="0600000000"
              required
              disabled={isLoading}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{t('password')}</label>
            <InputText
              id="login-password"
              type="password"
              value={String(credentials.password)}
              onChange={(e) => {
                setCredentials({ ...credentials, password: e.target.value });
                setError('');
              }}
              placeholder={t('enterYourPassword')}
              required
              disabled={isLoading}
              style={{ width: '100%' }}
            />
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>{error}</p>
            </div>
          )}

          <Button
            type="submit"
            loading={isLoading}
            label={isLoading ? t('loggingIn') : t('login')}
            style={{ width: '100%', background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)' }}
          />
        </form>
      </div>
    </div>
  );
}
