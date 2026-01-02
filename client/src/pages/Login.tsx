import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Loader2, UserPlus, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneExists, setPhoneExists] = useState<boolean | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState({
    phone: '',
    password: '',
  });

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Normalize Moroccan phone number to 06XXXXXXXX format
  const normalizePhoneNumber = (phone: string): string => {
    // Remove all spaces and special characters except +
    let cleaned = phone.replace(/[\s\-()]/g, '');
    
    // Handle +2126XXXXXXXX format
    if (cleaned.startsWith('+2126')) {
      return '0' + cleaned.slice(4); // Convert +2126XXXXXXXX to 06XXXXXXXX
    }
    
    // Handle 2126XXXXXXXX format (without +)
    if (cleaned.startsWith('2126')) {
      return '0' + cleaned.slice(3); // Convert 2126XXXXXXXX to 06XXXXXXXX
    }
    
    // Already in 06XXXXXXXX format or other format
    return cleaned;
  };

  // Validate Moroccan phone format
  const isValidMoroccanPhone = (phone: string): boolean => {
    const normalized = normalizePhoneNumber(phone);
    // Must be 06XXXXXXXX or 07XXXXXXXX (10 digits starting with 06 or 07)
    return /^0[67]\d{8}$/.test(normalized);
  };

  // Check if phone exists when user finishes typing
  useEffect(() => {
    const checkPhone = async () => {
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      
      if (isValidMoroccanPhone(formData.phone)) {
        setIsCheckingPhone(true);
        try {
          const result = await authService.checkPhoneExists(normalizedPhone);
          setPhoneExists(result.exists);
          setCustomerName(result.customerName || '');
          setCustomerId(result.customerId);
        } catch (error) {
          setPhoneExists(false);
          setCustomerName('');
          setCustomerId(undefined);
        } finally {
          setIsCheckingPhone(false);
        }
      } else {
        setPhoneExists(null);
        setCustomerName('');
        setCustomerId(undefined);
      }
    };

    const timer = setTimeout(checkPhone, 500);
    return () => clearTimeout(timer);
  }, [formData.phone]);

  const validateForm = () => {
    const newErrors = { phone: '', password: '' };
    let isValid = true;

    if (!formData.phone.trim()) {
      newErrors.phone = t('phoneNumberRequired');
      isValid = false;
    } else if (!isValidMoroccanPhone(formData.phone)) {
      newErrors.phone = t('phoneNumberInvalidFormat');
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = t('passwordRequired');
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = t('passwordMinLength');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      
      if (phoneExists) {
        // Login existing user
        await login({
          PhoneNumber: normalizedPhone,
          Password: formData.password,
        });
        
        toast({
          title: t('loginSuccess'),
          description: t('welcome'),
        });
      } else {
        // Register new user
        await register({
          PhoneNumber: normalizedPhone,
          Password: formData.password,
          CustomerId: customerId,
          IsCustomer: true,
        });
        
        toast({
          title: t('accountCreatedSuccess'),
          description: t('welcome'),
        });
      }
    } catch (error: any) {
      console.error('Authentication failed:', error);
      toast({
        title: phoneExists ? t('loginFailed') : t('registrationFailed'),
        description: phoneExists ? t('incorrectPassword') : t('errorOccurred'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isNewAccount = phoneExists === false;
  const isExistingAccount = phoneExists === true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4" dir={dir}>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isCheckingPhone
              ? t('verifying')
              : isNewAccount
              ? t('createNewAccount')
              : isExistingAccount
              ? t('login')
              : t('appAccess')}
          </CardTitle>
          <CardDescription>
            {isNewAccount
              ? t('createPasswordForNewAccount')
              : isExistingAccount
              ? t('enterPasswordToContinue')
              : t('enterPhoneToStart')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                {t('phoneNumber')}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('phonePlaceholder')}
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setErrors({ ...errors, phone: '' });
                }}
                className={errors.phone ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
              
              {/* Show customer name if phone exists */}
              {isExistingAccount && customerName && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">
                    {t('name')}
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {customerName}
                  </p>
                </div>
              )}
            </div>

            {(isNewAccount || isExistingAccount) && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {isNewAccount ? t('createPassword') : t('password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setErrors({ ...errors, password: '' });
                  }}
                  className={errors.password ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
                {isNewAccount && (
                  <p className="text-xs text-slate-500">
                    {t('passwordMinLengthHint')}
                  </p>
                )}
              </div>
            )}

            {(isNewAccount || isExistingAccount) && (
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isCheckingPhone}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('processing')}
                  </>
                ) : isNewAccount ? (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('createAccount')}
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('signIn')}
                  </>
                )}
              </Button>
            )}
          </form>

          {!isNewAccount && !isExistingAccount && formData.phone.length > 0 && !isValidMoroccanPhone(formData.phone) && (
            <div className="mt-4 text-center text-sm text-slate-500">
              {t('enterValidMoroccanPhone')}
            </div>
          )}

          <div className="mt-6 text-center text-sm text-slate-600">
            {t('yourInfoIsSecure')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
