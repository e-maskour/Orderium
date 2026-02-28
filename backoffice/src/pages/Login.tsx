import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { Shield } from 'lucide-react';
import { Input } from '../components/ui/input';
import { FormField } from '../components/ui/form-field';
import { Button } from '../components/ui/button';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="bg-card p-8 rounded-xl shadow-xl w-full max-w-md border border-border">
        {/* Professional Admin Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto relative w-32 h-32 mb-4">
            {/* Animated security pattern background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#235ae4]/30 to-transparent rounded-full opacity-40"></div>
              <div className="absolute w-2 h-2 rounded-full animate-ping" style={{ left: '20%', backgroundColor: '#235ae4' }}></div>
              <div className="absolute w-2 h-2 rounded-full animate-pulse" style={{ right: '20%', backgroundColor: '#235ae4' }}></div>
            </div>

            {/* Main Orderium O Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)' }}>
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
                {/* Large O */}
                <span className="text-5xl font-bold text-white relative z-10">O</span>
              </div>
            </div>

            {/* Shield Icon Badge for Admin */}
            <div className="absolute bottom-0 right-0 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center" style={{ borderWidth: '2px', borderColor: '#e0ebff' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)' }}>
                <Shield className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">{t('appName')}</h1>
          <p className="text-base text-muted-foreground">{t('adminBackoffice')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('welcomeBack')}</p>
          <div className="mt-3 flex justify-center">
            <LanguageToggle />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t('phoneNumber')} htmlFor="login-phone">
            <Input
              id="login-phone"
              type="tel"
              value={credentials.phoneNumber}
              onChange={(e) => {
                setCredentials({ ...credentials, phoneNumber: e.target.value });
                setError('');
              }}
              placeholder="0600000000"
              required
              disabled={isLoading}
            />
          </FormField>

          <FormField label={t('password')} htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              value={credentials.password}
              onChange={(e) => {
                setCredentials({ ...credentials, password: e.target.value });
                setError('');
              }}
              placeholder={t('enterYourPassword')}
              required
              disabled={isLoading}
            />
          </FormField>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            loading={isLoading}
            loadingText={t('loggingIn')}
            className="w-full"
            style={{ background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)' }}
          >
            {t('login')}
          </Button>
        </form>
      </div>
    </div>
  );
}
