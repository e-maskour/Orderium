import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Loader2, LogIn, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          {/* Professional Delivery Logo */}
          <div className="mx-auto relative w-32 h-32">
            {/* Animated route path background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-300 to-transparent rounded-full opacity-40"></div>
              <div className="absolute w-2 h-2 bg-orange-400 rounded-full animate-ping" style={{left: '20%'}}></div>
              <div className="absolute w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{right: '20%'}}></div>
            </div>
            
            {/* Main Orderium O Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-2xl flex items-center justify-center relative overflow-hidden">
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
                {/* Large O */}
                <span className="text-5xl font-bold text-white relative z-10">O</span>
              </div>
            </div>
            
            {/* Delivery Truck Icon Badge */}
            <div className="absolute bottom-0 right-0 w-12 h-12 bg-white rounded-xl shadow-lg border-2 border-orange-100 flex items-center justify-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          
          <div>
            <CardTitle className="text-3xl font-bold text-gray-900">{t('appName')}</CardTitle>
            <CardDescription className="text-base mt-1">{t('tagline')}</CardDescription>
          </div>
          <CardDescription>{t('welcomeBack')}</CardDescription>
        </CardHeader>
        <CardContent>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phoneNumber')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('enterPhoneNumber')}
                value={credentials.phoneNumber}
                onChange={(e) => {
                  setCredentials({ ...credentials, phoneNumber: e.target.value });
                  setError('');
                }}
                className={error ? 'border-destructive' : ''}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('enterPassword')}
                value={credentials.password}
                onChange={(e) => {
                  setCredentials({ ...credentials, password: e.target.value });
                  setError('');
                }}
                className={error ? 'border-destructive' : ''}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('loading')}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('login')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
