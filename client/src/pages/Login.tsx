import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authService } from '@/modules/auth';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { ShoppingCart } from 'lucide-react';
import { toastSuccess, toastError } from '@/services/toast.service';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const { t, dir } = useLanguage();
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

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const normalizePhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+2126')) return '0' + cleaned.slice(4);
    if (cleaned.startsWith('2126')) return '0' + cleaned.slice(3);
    return cleaned;
  };

  const isValidMoroccanPhone = (phone: string): boolean => {
    const normalized = normalizePhoneNumber(phone);
    return /^0[67]\d{8}$/.test(normalized);
  };

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
        await login({ phoneNumber: normalizedPhone, password: formData.password });
        toastSuccess(t('loginSuccess'));
      } else {
        await register({ phoneNumber: normalizedPhone, password: formData.password, customerId, isCustomer: true });
        toastSuccess(t('accountCreatedSuccess'));
      }
    } catch (error: any) {
      console.error('Authentication failed:', error);
      toastError(phoneExists ? t('loginFailed') : t('registrationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const isNewAccount = phoneExists === false;
  const isExistingAccount = phoneExists === true;

  const cardTitle = (
    <div className="text-center">
      {/* Logo */}
      <div className="mx-auto mb-3" style={{ width: '6rem', height: '6rem', position: 'relative' }}>
        <div className="flex align-items-center justify-content-center" style={{ position: 'absolute', inset: 0 }}>
          <div className="flex align-items-center justify-content-center shadow-4" style={{ width: '5rem', height: '5rem', borderRadius: '1rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
            <span className="text-white font-bold" style={{ fontSize: '2.5rem' }}>O</span>
          </div>
        </div>
        <div className="flex align-items-center justify-content-center shadow-2 border-2 surface-border" style={{ position: 'absolute', bottom: 0, right: 0, width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'white' }}>
          <div className="flex align-items-center justify-content-center" style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
            <ShoppingCart style={{ width: '1rem', height: '1rem', color: 'white' }} />
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold text-color">
        {isCheckingPhone ? t('verifying') : isNewAccount ? t('createNewAccount') : isExistingAccount ? t('login') : t('appAccess')}
      </div>
    </div>
  );

  const cardSubTitle = (
    <div className="text-center text-color-secondary">
      {isNewAccount ? t('createPasswordForNewAccount') : isExistingAccount ? t('enterPasswordToContinue') : t('enterPhoneToStart')}
    </div>
  );

  return (
    <div className="flex align-items-center justify-content-center p-3" dir={dir} style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--surface-50), var(--surface-100))' }}>
      <Card title={cardTitle} subTitle={cardSubTitle} className="shadow-4 w-full" style={{ maxWidth: '28rem' }}>
        <form onSubmit={handleSubmit} className="flex flex-column gap-3">
          <div className="flex flex-column gap-2">
            <label htmlFor="phone" className="font-medium text-color">{t('phoneNumber')}</label>
            <InputText
              id="phone"
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={formData.phone}
              onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }}
              className={errors.phone ? 'p-invalid' : ''}
              disabled={isLoading}
            />
            {errors.phone && <Message severity="error" text={errors.phone} />}
            {isExistingAccount && customerName && (
              <div className="p-3 surface-100 border-round border-1 surface-border">
                <p className="text-xs text-color-secondary mb-1">{t('name')}</p>
                <p className="text-sm font-medium text-color">{customerName}</p>
              </div>
            )}
          </div>

          {(isNewAccount || isExistingAccount) && (
            <div className="flex flex-column gap-2">
              <label htmlFor="password" className="font-medium text-color">{isNewAccount ? t('createPassword') : t('password')}</label>
              <InputText
                id="password"
                type="password"
                placeholder="••••••"
                value={formData.password}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
                className={errors.password ? 'p-invalid' : ''}
                disabled={isLoading}
              />
              {errors.password && <Message severity="error" text={errors.password} />}
              {isNewAccount && <p className="text-xs text-color-secondary">{t('passwordMinLengthHint')}</p>}
            </div>
          )}

          {(isNewAccount || isExistingAccount) && (
            <Button
              type="submit"
              label={isLoading ? t('processing') : isNewAccount ? t('createAccount') : t('signIn')}
              icon={isLoading ? 'pi pi-spin pi-spinner' : isNewAccount ? 'pi pi-user-plus' : 'pi pi-sign-in'}
              className="w-full"
              disabled={isLoading || isCheckingPhone}
              loading={isLoading}
            />
          )}
        </form>

        {!isNewAccount && !isExistingAccount && formData.phone.length > 0 && !isValidMoroccanPhone(formData.phone) && (
          <div className="mt-3 text-center text-sm text-color-secondary">{t('enterValidMoroccanPhone')}</div>
        )}

        <div className="mt-4 text-center text-sm text-color-secondary">{t('yourInfoIsSecure')}</div>
      </Card>
    </div>
  );
}
