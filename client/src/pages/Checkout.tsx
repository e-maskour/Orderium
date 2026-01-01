import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { formatCurrency, moroccanCities, validateMoroccanPhone } from '@/lib/i18n';
import { productTranslations } from '@/data/mockProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Package, Loader2, MapPin, Navigation } from 'lucide-react';
import { SiGooglemaps, SiWaze } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Customer } from '@/types/customer';

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
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [showOtherFields, setShowOtherFields] = useState(false);
  const [mapsLink, setMapsLink] = useState<string | null>(null);
  const [wazeLink, setWazeLink] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    address: '',
    latitude: undefined,
    longitude: undefined,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  // Search customer by phone (debounced)
  const searchCustomerByPhone = useCallback(async (phone: string) => {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Only search if we have at least 10 digits (full Moroccan phone)
    if (cleanPhone.length < 10) {
      setExistingCustomer(null);
      setShowOtherFields(false);
      return;
    }

    setIsSearchingCustomer(true);
    try {
      const result = await api.searchCustomers(cleanPhone);
      
      if (result.customers && result.customers.length > 0) {
        const customer = result.customers[0];
        setExistingCustomer(customer);
        
        // Auto-fill form with customer data
        setFormData(prev => ({
          ...prev,
          name: customer.name,
          address: customer.address || '',
          latitude: customer.latitude,
          longitude: customer.longitude,
        }));

        // Set map links if available
        if (customer.googleMapsUrl) setMapsLink(customer.googleMapsUrl);
        if (customer.wazeUrl) setWazeLink(customer.wazeUrl);

        // Clear errors
        setErrors({});
        
        // Show other fields
        setShowOtherFields(true);

        toast({
          title: language === 'ar' ? 'عميل موجود' : 'Client existant',
          description: language === 'ar'
            ? `مرحباً بعودتك ${customer.name}!`
            : `Bon retour ${customer.name}!`,
        });
      } else {
        // New customer - show empty fields
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
        
        setShowOtherFields(true);
        
        toast({
          title: language === 'ar' ? 'عميل جديد' : 'Nouveau client',
          description: language === 'ar'
            ? 'يرجى إدخال معلوماتك'
            : 'Veuillez saisir vos informations',
        });
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      setExistingCustomer(null);
      // Show fields even on error
      setShowOtherFields(true);
    } finally {
      setIsSearchingCustomer(false);
    }
  }, [language, toast]);

  // Debounce customer search
  useEffect(() => {
    if (!formData.phone) {
      setShowOtherFields(false);
      return;
    }

    const cleanPhone = formData.phone.replace(/[\s\-()]/g, '');
    
    // Auto-search when user completes phone number (10 digits)
    if (cleanPhone.length === 10) {
      const timer = setTimeout(() => {
        searchCustomerByPhone(formData.phone);
      }, 300); // Wait 300ms after user stops typing

      return () => clearTimeout(timer);
    } else if (cleanPhone.length > 10) {
      // If more than 10 digits, search immediately
      searchCustomerByPhone(formData.phone);
    }
  }, [formData.phone, searchCustomerByPhone]);

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: language === 'ar' ? 'غير مدعوم' : 'Non supporté',
        description: language === 'ar' 
          ? 'المتصفح لا يدعم تحديد الموقع'
          : 'Votre navigateur ne supporte pas la géolocalisation',
        variant: 'destructive',
      });
      return;
    }

    setIsDetectingLocation(true);

    // Try with high accuracy first, then fallback to lower accuracy
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Create Google Maps and Waze links
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
        setMapsLink(googleMapsUrl);
        setWazeLink(wazeUrl);
        
        try {
          // Use OpenStreetMap Nominatim for reverse geocoding - get full address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${language}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'Orderium POS'
              }
            }
          );
          
          if (!response.ok) {
            throw new Error('Geocoding failed');
          }
          
          const data = await response.json();
          
          // Build complete address with all available details
          const addressParts = [];
          if (data.address) {
            // Street number and name
            if (data.address.house_number) addressParts.push(data.address.house_number);
            if (data.address.road) addressParts.push(data.address.road);
            
            // Neighborhood/Quarter
            if (data.address.neighbourhood || data.address.suburb || data.address.quarter) {
              addressParts.push(data.address.neighbourhood || data.address.suburb || data.address.quarter);
            }
            
            // City
            if (data.address.city || data.address.town || data.address.village) {
              addressParts.push(data.address.city || data.address.town || data.address.village);
            }
            
            // Postal code
            if (data.address.postcode) addressParts.push(data.address.postcode);
            
            // Country
            if (data.address.country) addressParts.push(data.address.country);
          }
          
          const formattedAddress = addressParts.length > 0 
            ? addressParts.join(', ') 
            : data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          setFormData((prev) => ({
            ...prev,
            address: formattedAddress,
            latitude,
            longitude,
          }));
          
          if (errors.address) {
            setErrors((prev) => ({ ...prev, address: undefined }));
          }
          
          toast({
            title: language === 'ar' ? 'تم تحديد الموقع' : 'Position détectée',
            description: language === 'ar' 
              ? 'تم تحديد موقعك بنجاح'
              : 'Votre position a été détectée avec succès',
          });
        } catch (error) {
          // Still save coordinates even if geocoding fails
          setFormData((prev) => ({
            ...prev,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude,
          }));
          
          if (errors.address) {
            setErrors((prev) => ({ ...prev, address: undefined }));
          }
          
          toast({
            title: language === 'ar' ? 'تحذير' : 'Avertissement',
            description: language === 'ar'
              ? 'تم حفظ الإحداثيات. يمكنك تعديل العنوان يدوياً'
              : 'Coordonnées sauvegardées. Vous pouvez modifier l\'adresse manuellement',
          });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      async (error) => {
        setIsDetectingLocation(false);
        
        let errorMessage = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = language === 'ar'
              ? 'يرجى السماح بالوصول إلى الموقع من إعدادات المتصفح'
              : 'Veuillez autoriser l\'accès à la position dans les paramètres du navigateur';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = language === 'ar'
              ? 'الموقع غير متاح. تأكد من تفعيل خدمات الموقع'
              : 'Position non disponible. Vérifiez que les services de localisation sont activés';
            break;
          case error.TIMEOUT:
            errorMessage = language === 'ar'
              ? 'انتهت مهلة تحديد الموقع. يرجى المحاولة مرة أخرى'
              : 'Délai d\'attente dépassé. Veuillez réessayer';
            break;
          default:
            errorMessage = language === 'ar'
              ? 'خطأ في تحديد الموقع'
              : 'Erreur de localisation';
        }
        
        toast({
          title: language === 'ar' ? 'خطأ' : 'Erreur',
          description: errorMessage,
          variant: 'destructive',
        });
      },
      options
    );
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
      newErrors.address = language === 'ar' ? 'العنوان مطلوب' : 'Adresse requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (items.length === 0) return;

    setIsSubmitting(true);

    // Save or update customer in database
    try {
      await api.upsertCustomer({
        phone: formData.phone,
        name: formData.name,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        googleMapsUrl: mapsLink || undefined,
        wazeUrl: wazeLink || undefined,
      });
    } catch (error) {
      console.error('Failed to save customer:', error);
      // Continue with order even if customer save fails
    }

    // Simulate API call - in production, this would POST to /orders
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate order number
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      // Navigate to success with order data (before clearing cart)
      navigate('/success', { 
        state: { 
          orderNumber,
          total: subtotal,
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          items: items, // Pass items before clearing cart
        } 
      });
      
      // Clear cart after navigation
      clearCart();
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
                  {/* Phone - Always visible */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="phone">{t('phone')} *</Label>
                      {isSearchingCustomer && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {language === 'ar' ? 'بحث...' : 'Recherche...'}
                        </span>
                      )}
                      {existingCustomer && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {language === 'ar' ? 'عميل موجود' : 'Client existant'}
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
                        'h-12',
                        errors.phone && 'border-destructive focus-visible:ring-destructive',
                        existingCustomer && 'border-green-500'
                      )}
                      dir="ltr"
                      autoFocus
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                    {existingCustomer && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {language === 'ar' 
                          ? `${existingCustomer.totalOrders} طلبية سابقة`
                          : `${existingCustomer.totalOrders} commande(s) précédente(s)`
                        }
                      </p>
                    )}
                  </div>

                  {/* Name - Show after phone lookup */}
                  {showOtherFields && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
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
                  )}

                  {/* Address - Show after phone lookup */}
                  {showOtherFields && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label htmlFor="address">{t('address')} *</Label>
                      <div className="flex gap-2">
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        placeholder={t('addressPlaceholder')}
                        className={cn(
                          'h-12 flex-1',
                          errors.address && 'border-destructive focus-visible:ring-destructive'
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleDetectLocation}
                        disabled={isDetectingLocation}
                        className="h-12 w-12 flex-shrink-0"
                        title={language === 'ar' ? 'تحديد موقعي' : 'Détecter ma position'}
                      >
                        {isDetectingLocation ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <MapPin className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                    {errors.address && (
                      <p className="text-sm text-destructive">{errors.address}</p>
                    )}
                    {formData.latitude && formData.longitude && (
                      <div className="space-y-2 mt-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {language === 'ar' 
                            ? `الإحداثيات: ${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}`
                            : `Coordonnées: ${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}`
                          }
                        </p>
                        <div className="flex items-center gap-2">
                          {mapsLink && (
                            <a
                              href={mapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 transition-colors shadow-sm group"
                            >
                              <div className="w-8 h-8 bg-[#4285F4] rounded-full flex items-center justify-center">
                                <SiGooglemaps className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                {language === 'ar' ? 'خرائط جوجل' : 'Google Maps'}
                              </span>
                            </a>
                          )}
                          {wazeLink && (
                            <a
                              href={wazeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 transition-colors shadow-sm group"
                            >
                              <div className="w-8 h-8 bg-[#33CCFF] rounded-full flex items-center justify-center">
                                <SiWaze className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                {language === 'ar' ? 'ويز' : 'Waze'}
                              </span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>

              {/* Submit button (mobile) */}
              {showOtherFields && (
                <div className="lg:hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              )}
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
              {showOtherFields && (
                <div className="hidden lg:block mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
