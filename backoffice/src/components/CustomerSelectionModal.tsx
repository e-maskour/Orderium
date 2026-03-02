import { useState, useEffect, useRef } from 'react';
import { Search, User, MapPin, Plus } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useMutation } from '@tanstack/react-query';
import { toastCreated, toastError } from '../services/toast.service';
import { partnersService } from '../modules/partners';
import { IPosCustomer as Customer } from '../modules/pos';

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

  const headerContent = (
    <div className="flex align-items-center gap-2">
      <User style={{ width: 20, height: 20, color: '#d97706' }} />
      <span>{t('selectCustomer')}</span>
    </div>
  );

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={headerContent}
      modal
      dismissableMask
      style={{ width: '95vw', maxWidth: '32rem' }}
      contentStyle={{ padding: '1rem' }}
    >
      <div className="flex flex-column gap-3">
        {/* Search Input */}
        <span className="p-input-icon-left" style={{ width: '100%' }}>
          <i className="pi pi-search" />
          <InputText
            ref={searchInputRef}
            placeholder={t('searchByNameOrPhone')}
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </span>

        {/* Currently Selected Customer */}
        {selectedCustomer && customerSearch.length === 0 && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.5rem', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857', marginBottom: '0.5rem' }}>{t('currentCustomer')}</div>
            <div>
              <div style={{ fontWeight: 600, color: '#064e3b' }}>{selectedCustomer.name}</div>
              <div style={{ fontSize: '0.875rem', color: '#047857' }}>{selectedCustomer.phoneNumber}</div>
              {selectedCustomer.address && (
                <div className="flex align-items-start gap-1" style={{ fontSize: '0.875rem', color: '#047857', marginTop: '0.25rem' }}>
                  <MapPin style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
                  <span>{selectedCustomer.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Suggestions */}
        {customerSuggestions.length > 0 && (
          <div className="flex flex-column gap-2">
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{t('searchResults')}</div>
            <div className="flex flex-column gap-2" style={{ maxHeight: '15rem', overflowY: 'auto' }}>
              {customerSuggestions.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectCustomer(customer)}
                  style={{ width: '100%', textAlign: 'left', padding: '0.75rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 600, color: '#111827' }}>{customer.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>{customer.phoneNumber}</div>
                  {customer.address && (
                    <div className="flex align-items-start gap-1 line-clamp-1" style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      <MapPin style={{ width: 12, height: 12, marginTop: 2, flexShrink: 0 }} />
                      <span>{customer.address}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Customer Form */}
        {showCustomerForm && (
          <div className="flex flex-column gap-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '1rem' }}>
            <div className="flex align-items-center gap-2" style={{ color: '#1d4ed8' }}>
              <Plus style={{ width: 20, height: 20 }} />
              <span style={{ fontWeight: 600 }}>{t('createNewCustomer')}</span>
            </div>
            <InputText
              placeholder={t('name')}
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              style={{ width: '100%' }}
            />
            <InputText
              placeholder={t('phoneNumber')}
              value={newCustomer.phoneNumber}
              onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
              style={{ width: '100%' }}
            />
            <span className="p-input-icon-left" style={{ width: '100%' }}>
              <i><MapPin style={{ width: 16, height: 16 }} /></i>
              <InputText
                placeholder={t('address')}
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                style={{ width: '100%' }}
              />
            </span>
            <Button
              label={t('createCustomer')}
              icon={<Plus style={{ width: 16, height: 16 }} />}
              onClick={() => createCustomerMutation.mutate(newCustomer)}
              disabled={!newCustomer.name || !newCustomer.phoneNumber}
              loading={createCustomerMutation.isPending}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Empty State */}
        {customerSearch.length === 0 && !selectedCustomer && (
          <div className="flex flex-column align-items-center" style={{ padding: '3rem 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Search style={{ width: 32, height: 32, color: '#d1d5db' }} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>{t('searchForCustomer')}</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t('searchCustomerInstructions')}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
};
