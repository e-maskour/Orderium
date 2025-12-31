import { useLocation, Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home } from 'lucide-react';

interface SuccessState {
  orderNumber: string;
  total: number;
  customerName: string;
}

const Success = () => {
  const location = useLocation();
  const { language, t, dir } = useLanguage();
  const state = location.state as SuccessState | null;

  // Redirect if accessed directly without order data
  if (!state?.orderNumber) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={dir}>
      <div className="max-w-md w-full text-center">
        {/* Success animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto shadow-lg animate-scale-in">
            <CheckCircle2 className="w-14 h-14 text-white" />
          </div>
          <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-400/30 mx-auto animate-ping" />
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl p-8 shadow-medium animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t('orderSuccess')}
          </h1>
          
          <p className="text-muted-foreground mb-6">
            {t('thankYou')}, {state.customerName}!
          </p>

          {/* Order details */}
          <div className="bg-secondary rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">{t('orderNumber')}</span>
              <span className="font-mono font-bold text-primary">{state.orderNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('total')}</span>
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(state.total, language)}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-8">
            {t('orderConfirmation')}
          </p>

          <Button variant="terracotta" size="touchLg" asChild className="w-full">
            <Link to="/">
              <Home className="w-5 h-5" />
              {t('backToHome')}
            </Link>
          </Button>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 start-10 w-3 h-3 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/3 end-16 w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.7s' }} />
          <div className="absolute bottom-1/3 start-20 w-4 h-4 bg-teal rounded-full animate-bounce" style={{ animationDelay: '0.9s' }} />
        </div>
      </div>
    </div>
  );
};

export default Success;
