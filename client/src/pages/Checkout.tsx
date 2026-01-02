import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, validateMoroccanPhone } from '@/lib/i18n';
import { productTranslations } from '@/data/mockProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Package, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { customerService, orderService } from '@/services';
import { Customer } from '@/types/customer';
import { AddressInput } from '@/components/AddressInput';

interface FormData {
  name: string;
  phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { language, t, dir } = useLanguage();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [mapsLink, setMapsLink] = useState<string | null>(null);
  const [wazeLink, setWazeLink] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: user?.PhoneNumber || '',
    address: '',
    latitude: undefined,
    longitude: undefined,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  // Search customer by phone
  const searchCustomerByPhone = useCallback(async (phone: string) => {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Only search if we have at least 10 digits (full Moroccan phone)
    if (cleanPhone.length < 10) {
      setExistingCustomer(null);
      return;
    }

    setIsSearchingCustomer(true);
    try {
      const result = await customerService.searchByPhone(cleanPhone);
      
      if (result.customers && result.customers.length > 0) {
        const customer = result.customers[0];
        setExistingCustomer(customer);
        
        // Auto-fill form with customer data
        setFormData(prev => ({
          ...prev,
          name: customer.Name,
          address: customer.Address || '',
          latitude: customer.Latitude,
          longitude: customer.Longitude,
        }));

        // Set map links if available
        if (customer.GoogleMapsUrl) setMapsLink(customer.GoogleMapsUrl);
        if (customer.WazeUrl) setWazeLink(customer.WazeUrl);

        // Clear errors
        setErrors({});
      } else {
        // New customer - clear fields
        setExistingCustomer(null);
        
        // Clear form fields for new customer
        setFormData(prev => ({
          ...prev,
          name: '',
          address: '',
          latitude: undefined,
          longitude: undefined,
        }));
        
        // Clear map links
        setMapsLink(null);
        setWazeLink(null);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      setExistingCustomer(null);
    } finally {
      setIsSearchingCustomer(false);
    }
  }, [language, toast, t]);

  // Auto-search customer on mount if user phone is available
  useEffect(() => {
    if (user?.PhoneNumber) {
      searchCustomerByPhone(user.PhoneNumber);
    }
  }, [user?.PhoneNumber, searchCustomerByPhone]);

  const handleAddressChange = (address: string, latitude?: number, longitude?: number) => {
    setFormData(prev => ({
      ...prev,
      address,
      latitude,
      longitude,
    }));
    if (errors.address) {
      setErrors(prev => ({ ...prev, address: undefined }));
    }
  };

  const handleMapsLinksChange = (googleMaps: string | null, waze: string | null) => {
    setMapsLink(googleMaps);
    setWazeLink(waze);
  };

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

    if (!formData.address.trim()) {
      newErrors.address = t('addressRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (items.length === 0) return;

    setIsSubmitting(true);

    try {
      // 1. Save or update customer in database
      let customerId: number | undefined;
      try {
        const customerResult = await customerService.upsert({
          PhoneNumber: formData.phone,
          Name: formData.name,
          Address: formData.address,
          Latitude: formData.latitude,
          Longitude: formData.longitude,
          GoogleMapsUrl: mapsLink || undefined,
          WazeUrl: wazeLink || undefined,
        });
        customerId = customerResult.customer.Id;
      } catch (error) {
        console.error('Failed to save customer:', error);
        // Continue with order even if customer save fails
      }

      // 2. Create order in database
      const orderResult = await orderService.create({
        CustomerId: customerId,
        CustomerPhone: formData.phone,
        Items: items.map(item => ({
          ProductId: item.product.Id,
          Quantity: item.quantity,
          Price: item.product.Price,
          Discount: 0,
          DiscountType: 0,
        })),
        Note: formData.address,
      });

      // 3. Navigate to success with order data (before clearing cart)
      navigate('/success', { 
        state: { 
          orderNumber: orderResult.documentNumber,
          total: subtotal,
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          items: items,
        } 
      });
      
      // 4. Clear cart after navigation
      clearCart();
      
    } catch (error) {
      console.error('Order creation failed:', error);
      toast({
        title: t('error'),
        description: t('orderCreationError'),
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
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 sm:h-10 sm:w-10">
            <Link to="/">
              <BackIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{t('checkoutTitle')}</h1>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Form */}
          <div className="order-1 lg:order-1">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-card">
                <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">{t('customerInfo')}</h2>
                
                <div className="space-y-4">
                  {/* Phone - Always visible */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="phone">{t('phone')} *</Label>
                      {isSearchingCustomer && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {t('searching')}
                        </span>
                      )}
                      {existingCustomer && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {t('existingCustomer')}
                        </span>
                      )}
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      className={cn(
                        'h-12 bg-gray-100',
                        errors.phone && 'border-destructive focus-visible:ring-destructive',
                        existingCustomer && 'border-green-500'
                      )}
                      dir="ltr"
                      autoFocus
                      disabled
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                    {existingCustomer && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {`${existingCustomer.totalOrders} ${t('previousOrders')}`}
                      </p>
                    )}
                  </div>

                  {/* Name - Always visible */}
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

                  {/* Address - Always visible */}
                  <div className="space-y-2">
                    <Label htmlFor="address">{t('address')} *</Label>
                    <AddressInput
                      value={formData.address}
                      onChange={handleAddressChange}
                      onMapsLinksChange={handleMapsLinksChange}
                      error={errors.address}
                      placeholder={t('addressPlaceholder')}
                      googleMapsUrl={mapsLink}
                      wazeUrl={wazeLink}
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
                  className="w-full h-12 sm:h-14 text-sm sm:text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    <>
                      {t('placeOrder')}
                      <span className="font-bold ml-2">{formatCurrency(subtotal, language)}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Order summary */}
          <div className="order-2 lg:order-2">
            <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-card lg:sticky lg:top-24">
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">{t('orderSummary')}</h2>
              
              <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
                {items.map((item) => {
                  const translation = productTranslations[item.product.Id];
                  const displayName = language === 'fr' && translation 
                    ? translation.name 
                    : item.product.Name;

                  return (
                    <div key={item.product.Id} className="flex gap-2 sm:gap-3 py-2">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground line-clamp-1 text-sm sm:text-base">{displayName}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.product.Price, language)}
                        </p>
                      </div>
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        {formatCurrency(item.product.Price * item.quantity, language)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border mt-3 sm:mt-4 pt-3 sm:pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-base sm:text-lg">{t('total')}</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground">
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
