import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Truck } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { LanguageToggle } from '@/components/LanguageToggle';

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
      navigate('/orders');
    } catch (err) {
      setError(t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex align-items-center justify-content-center min-h-screen" style={{ background: 'linear-gradient(135deg, var(--orderium-bg) 0%, var(--orderium-secondary) 100%)' }}>
      <div className="absolute" style={{ top: '1rem', right: '1rem' }}>
        <LanguageToggle />
      </div>

      <div className="w-full px-3" style={{ maxWidth: '28rem' }}>
        <Card className="shadow-4">
          <div className="text-center mb-5">
            {/* Logo */}
            <div className="flex justify-content-center mb-4">
              <div className="relative">
                <div className="flex align-items-center justify-content-center border-circle"
                  style={{ width: '6rem', height: '6rem', background: 'linear-gradient(135deg, var(--orderium-primary), var(--orderium-primary-dark))', boxShadow: '0 8px 32px rgba(192,97,43,0.3)' }}>
                  <span className="text-5xl font-bold text-white">O</span>
                </div>
                <div className="absolute flex align-items-center justify-content-center border-circle bg-white shadow-3"
                  style={{ width: '2.5rem', height: '2.5rem', bottom: '-4px', right: '-4px' }}>
                  <div className="flex align-items-center justify-content-center border-circle"
                    style={{ width: '2rem', height: '2rem', background: 'linear-gradient(135deg, var(--orderium-primary), var(--orderium-primary-dark))' }}>
                    <Truck size={14} color="white" />
                  </div>
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--orderium-text)' }}>{t('appName')}</h1>
            <p className="text-base" style={{ color: 'var(--orderium-text-secondary)' }}>{t('tagline')}</p>
            <p className="text-sm mt-2" style={{ color: 'var(--orderium-text-muted)' }}>{t('welcomeBack')}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-column gap-4">
              <div className="flex flex-column gap-2">
                <label htmlFor="phone" className="font-semibold text-sm" style={{ color: 'var(--orderium-text-secondary)' }}>{t('phoneNumber')}</label>
                <InputText
                  id="phone"
                  type="tel"
                  placeholder={t('enterPhoneNumber')}
                  value={credentials.phoneNumber}
                  onChange={(e) => {
                    setCredentials({ ...credentials, phoneNumber: e.target.value });
                    setError('');
                  }}
                  className={error ? 'p-invalid w-full' : 'w-full'}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-column gap-2">
                <label htmlFor="password" className="font-semibold text-sm" style={{ color: 'var(--orderium-text-secondary)' }}>{t('password')}</label>
                <InputText
                  id="password"
                  type="password"
                  placeholder={t('enterPassword')}
                  value={credentials.password}
                  onChange={(e) => {
                    setCredentials({ ...credentials, password: e.target.value });
                    setError('');
                  }}
                  className={error ? 'p-invalid w-full' : 'w-full'}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Message severity="error" text={error} className="w-full" />
              )}

              <Button
                type="submit"
                label={isLoading ? t('loading') : t('login')}
                icon={isLoading ? 'pi pi-spinner pi-spin' : 'pi pi-sign-in'}
                className="w-full"
                disabled={isLoading}
                loading={isLoading}
              />
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
