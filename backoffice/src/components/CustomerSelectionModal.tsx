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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <div style={{
        width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', flexShrink: 0,
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(245,158,11,0.35)',
      }}>
        <User style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{t('selectCustomer')}</div>
        <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.125rem' }}>{t('searchByNameOrPhone')}</div>
      </div>
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
      breakpoints={{ '960px': '75vw', '640px': '95vw' }}
      contentStyle={{ padding: '1rem', overflowY: 'auto' }}
    >
      <style>{`
        .cust-card { transition: all 0.15s ease; }
        .cust-card:hover { background: #fffbeb !important; border-color: #f59e0b !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245,158,11,0.15); }
        .cust-input:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.15) !important; outline: none; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search style={{
            position: 'absolute', [dir === 'rtl' ? 'right' : 'left']: '0.875rem',
            top: '50%', transform: 'translateY(-50%)',
            width: '1rem', height: '1rem', color: '#9ca3af', pointerEvents: 'none',
          }} />
          <InputText
            ref={searchInputRef}
            placeholder={t('searchByNameOrPhone')}
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="cust-input"
            style={{
              width: '100%', height: '2.875rem',
              paddingLeft: dir === 'rtl' ? '0.875rem' : '2.75rem',
              paddingRight: dir === 'rtl' ? '2.75rem' : '0.875rem',
              borderRadius: '0.75rem', border: '1.5px solid #e5e7eb',
              fontSize: '0.9375rem', transition: 'all 0.2s',
            }}
          />
        </div>

        {/* Currently Selected Customer */}
        {selectedCustomer && customerSearch.length === 0 && (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '0.875rem', padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('currentCustomer')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: '2.25rem', height: '2.25rem', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.875rem', fontWeight: 700, color: '#fff',
              }}>
                {selectedCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9375rem' }}>{selectedCustomer.name}</div>
                <div style={{ fontSize: '0.8125rem', color: '#16a34a' }}>{selectedCustomer.phoneNumber}</div>
                {selectedCustomer.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25rem', fontSize: '0.75rem', color: '#166534', marginTop: '0.125rem' }}>
                    <MapPin style={{ width: 12, height: 12, marginTop: 2, flexShrink: 0 }} />
                    <span>{selectedCustomer.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Customer Suggestions */}
        {customerSuggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('searchResults')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '15rem', overflowY: 'auto' }}>
              {customerSuggestions.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectCustomer(customer)}
                  className="cust-card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', background: '#fff',
                    border: '1.5px solid #e5e7eb', borderRadius: '0.75rem', cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: '2.25rem', height: '2.25rem', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 700, color: '#fff',
                  }}>
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9375rem' }}>{customer.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{customer.phoneNumber}</div>
                    {customer.address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25rem', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.125rem' }}>
                        <MapPin style={{ width: 11, height: 11, marginTop: 2, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Customer Form */}
        {showCustomerForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '0.875rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
              <div style={{
                width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Plus style={{ width: '0.875rem', height: '0.875rem', color: '#fff' }} strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b' }}>{t('createNewCustomer')}</span>
            </div>
            <InputText
              placeholder={t('name')}
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              className="cust-input"
              style={{ width: '100%', height: '2.625rem', borderRadius: '0.625rem', border: '1.5px solid #e5e7eb', fontSize: '0.9375rem', transition: 'all 0.2s' }}
            />
            <InputText
              placeholder={t('phoneNumber')}
              value={newCustomer.phoneNumber}
              onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
              className="cust-input"
              style={{ width: '100%', height: '2.625rem', borderRadius: '0.625rem', border: '1.5px solid #e5e7eb', fontSize: '0.9375rem', transition: 'all 0.2s' }}
            />
            <div style={{ position: 'relative' }}>
              <MapPin style={{
                position: 'absolute', [dir === 'rtl' ? 'right' : 'left']: '0.875rem',
                top: '50%', transform: 'translateY(-50%)',
                width: '1rem', height: '1rem', color: '#9ca3af', pointerEvents: 'none',
              }} />
              <InputText
                placeholder={t('address')}
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                className="cust-input"
                style={{
                  width: '100%', height: '2.625rem',
                  paddingLeft: dir === 'rtl' ? '0.875rem' : '2.75rem',
                  paddingRight: dir === 'rtl' ? '2.75rem' : '0.875rem',
                  borderRadius: '0.625rem', border: '1.5px solid #e5e7eb', fontSize: '0.9375rem', transition: 'all 0.2s',
                }}
              />
            </div>
            <Button
              label={t('createCustomer')}
              onClick={() => createCustomerMutation.mutate(newCustomer)}
              disabled={!newCustomer.name || !newCustomer.phoneNumber}
              loading={createCustomerMutation.isPending}
              style={{
                width: '100%', height: '2.875rem',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none', borderRadius: '0.625rem',
                fontSize: '0.9375rem', fontWeight: 700,
                boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
              }}
            />
          </div>
        )}

        {/* Empty State */}
        {customerSearch.length === 0 && !selectedCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 0', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '1rem',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))',
              border: '1.5px solid rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem',
            }}>
              <Search style={{ width: 28, height: 28, color: '#d97706' }} />
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', marginBottom: '0.375rem' }}>{t('searchForCustomer')}</div>
            <div style={{ fontSize: '0.8125rem', color: '#9ca3af', maxWidth: '18rem' }}>{t('searchCustomerInstructions')}</div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
