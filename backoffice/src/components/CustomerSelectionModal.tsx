import { useState, useEffect, useRef } from 'react';
import { X, Search, User, MapPin, Plus } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useMutation } from '@tanstack/react-query';
import { toastCreated, toastError } from '../services/toast.service';
import { partnersService } from '../modules/partners';
import { IPosCustomer as Customer } from '../modules/pos';

// Keyframe animations for Apple-style entrance
const backdropAnimation = `
  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const modalAnimation = `
  @keyframes modalSlideUp {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const contentAnimation = `
  @keyframes contentFadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject keyframes
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = backdropAnimation + modalAnimation + contentAnimation;
  if (!document.head.querySelector('[data-modal-animations-customer]')) {
    styleSheet.setAttribute('data-modal-animations-customer', 'true');
    document.head.appendChild(styleSheet);
  }
}

interface CustomerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomer: Customer | null;
  t: (key: string) => string;
  dir?: string;
}

export const CustomerSelectionModal = ({
  isOpen,
  onClose,
  onSelectCustomer,
  selectedCustomer,
  t,
  dir = 'ltr',
}: CustomerSelectionModalProps) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phoneNumber: '',
    address: '',
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      // Reset state when modal closes
      setCustomerSearch('');
      setCustomerSuggestions([]);
      setShowCustomerForm(false);
      setNewCustomer({ name: '', phoneNumber: '', address: '' });
    }
  }, [isOpen]);

  // Search customers with debounce
  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerForm(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await partnersService.searchCustomers(customerSearch, 10);

        if (results.length > 0) {
          setCustomerSuggestions(results.map((p) => ({
            id: p.id,
            name: p.name,
            phoneNumber: p.phoneNumber ?? '',
            address: p.address ?? undefined,
            latitude: p.latitude ?? undefined,
            longitude: p.longitude ?? undefined,
          })));
          setShowCustomerForm(false);
        } else {
          setCustomerSuggestions([]);
          setShowCustomerForm(true);
          setNewCustomer({ phoneNumber: customerSearch, name: '', address: '' });
        }
      } catch (error) {
        console.error('Failed to search customers:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: (customerData: typeof newCustomer) => partnersService.create(customerData as any),
    onSuccess: (customer) => {
      toastCreated(t('customerCreated'));
      onSelectCustomer({
        id: customer.id,
        name: customer.name,
        phoneNumber: customer.phoneNumber ?? '',
        address: customer.address ?? undefined,
        latitude: customer.latitude ?? undefined,
        longitude: customer.longitude ?? undefined,
      });
      onClose();
    },
    onError: () => {
      toastError(t('failedToCreate'));
    },
  });

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir={dir}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{
          animation: 'backdropFadeIn 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
        }}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-[95vw] mx-4 overflow-hidden max-h-[85vh] flex flex-col"
        style={{
          animation: 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-4 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm transition-all hover:scale-110"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>

          <div className="pr-12">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {t('selectCustomer')}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{
            animation: 'contentFadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s backwards'
          }}
        >
          {/* Search Input */}
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('searchByNameOrPhone')}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              leadingIcon={Search}
              fullWidth
            />
          </div>

          {/* Currently Selected Customer */}
          {selectedCustomer && customerSearch.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-emerald-700 mb-2">{t('currentCustomer')}</p>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-emerald-900">{selectedCustomer.name}</p>
                  <p className="text-sm text-emerald-700">{selectedCustomer.phoneNumber}</p>
                  {selectedCustomer.address && (
                    <p className="text-sm text-emerald-700 flex items-start gap-1 mt-1">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{selectedCustomer.address}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Customer Suggestions */}
          {customerSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">{t('searchResults')}</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {customerSuggestions.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full text-left p-3 bg-white hover:bg-primary/5 border border-gray-200 hover:border-primary/30 rounded-lg transition-all cursor-pointer"
                  >
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-600">{customer.phoneNumber}</p>
                    {customer.address && (
                      <p className="text-sm text-gray-500 flex items-start gap-1 mt-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{customer.address}</span>
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Customer Form */}
          {showCustomerForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Plus className="w-5 h-5" />
                <p className="font-semibold">{t('createNewCustomer')}</p>
              </div>
              <Input
                type="text"
                placeholder={t('name')}
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                fullWidth
              />
              <Input
                type="tel"
                placeholder={t('phoneNumber')}
                value={newCustomer.phoneNumber}
                onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
                fullWidth
              />
              <Input
                type="text"
                placeholder={t('address')}
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                leadingIcon={MapPin}
                fullWidth
              />
              <Button
                onClick={() => createCustomerMutation.mutate(newCustomer)}
                disabled={!newCustomer.name || !newCustomer.phoneNumber}
                loading={createCustomerMutation.isPending}
                loadingText={t('loading')}
                leadingIcon={Plus}
                className="w-full"
              >
                {t('createCustomer')}
              </Button>
            </div>
          )}

          {/* Empty State */}
          {customerSearch.length === 0 && !selectedCustomer && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{t('searchForCustomer')}</h3>
              <p className="text-sm text-gray-500">{t('searchCustomerInstructions')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
