import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency, moroccanCities, validateMoroccanPhone } from '@/lib/i18n';
import { productTranslations } from '@/data/mockProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Package, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { language, t, dir } = useLanguage();
  const { items, subtotal, clearCart } = useCart();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('phoneRequired');
    } else if (!validateMoroccanPhone(formData.phone)) {
      newErrors.phone = t('phoneInvalid');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (items.length === 0) return;

    setIsSubmitting(true);

    // Simulate API call - in production, this would POST to /orders
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate order number
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      // Clear cart and navigate to success
      clearCart();
      navigate('/success', { 
        state: { 
          orderNumber,
          total: subtotal,
          customerName: formData.name,
        } 
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: dir === 'rtl' ? 'حدث خطأ، يرجى المحاولة مجدداً' : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={dir}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('emptyCart')}</h2>
          <p className="text-muted-foreground mb-6">{t('emptyCartMessage')}</p>
          <Button variant="gold" asChild>
            <Link to="/">{t('continueShopping')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <BackIcon className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-foreground">{t('checkoutTitle')}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="order-2 lg:order-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-card rounded-2xl p-6 shadow-card">
                <h2 className="text-lg font-semibold text-foreground mb-4">{t('customerInfo')}</h2>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder={t('namePlaceholder')}
                      className={cn(
                        'h-12',
                        errors.name && 'border-destructive focus-visible:ring-destructive'
                      )}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('phone')} *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      className={cn(
                        'h-12',
                        errors.phone && 'border-destructive focus-visible:ring-destructive'
                      )}
                      dir="ltr"
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      className={cn(
                        'h-12',
                        errors.email && 'border-destructive focus-visible:ring-destructive'
                      )}
                      dir="ltr"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  {/* City */}
                  <div className="space-y-2">
                    <Label htmlFor="city">{t('city')}</Label>
                    <Select
                      value={formData.city}
                      onValueChange={(value) => updateField('city', value)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder={t('cityPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {moroccanCities.map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {language === 'ar' ? city.ar : city.fr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address">{t('address')}</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder={t('addressPlaceholder')}
                      className="h-12"
                    />
                  </div>

                  {/* Postal code */}
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">{t('postalCode')}</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => updateField('postalCode', e.target.value)}
                      placeholder={t('postalCodePlaceholder')}
                      className="h-12 max-w-[150px]"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Submit button (mobile) */}
              <div className="lg:hidden">
                <Button
                  type="submit"
                  variant="cart"
                  size="touchLg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    <>
                      {t('placeOrder')}
                      <span className="font-bold">{formatCurrency(subtotal, language)}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Order summary */}
          <div className="order-1 lg:order-2">
            <div className="bg-card rounded-2xl p-6 shadow-card lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4">{t('orderSummary')}</h2>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {items.map((item) => {
                  const translation = productTranslations[item.product.Id];
                  const displayName = language === 'fr' && translation 
                    ? translation.name 
                    : item.product.Name;

                  return (
                    <div key={item.product.Id} className="flex gap-3 py-2">
                      <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground line-clamp-1">{displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.product.Price, language)}
                        </p>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(item.product.Price * item.quantity, language)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border mt-4 pt-4">
                <div className="flex items-center justify-between text-lg">
                  <span className="text-muted-foreground">{t('total')}</span>
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(subtotal, language)}
                  </span>
                </div>
              </div>

              {/* Submit button (desktop) */}
              <div className="hidden lg:block mt-6">
                <Button
                  type="submit"
                  variant="cart"
                  size="touchLg"
                  className="w-full"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    t('placeOrder')
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
