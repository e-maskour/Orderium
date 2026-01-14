import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { invoiceService, customerService, productsService } from '../services/api';
import { CreateInvoiceDTO } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  ArrowLeft,
  Save,
  Send,
  ShoppingCart,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface InvoiceItem {
  productId?: number;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface Product {
  Id: number;
  Code: string | null;
  Name: string;
  Description?: string;
  Price: number;
  Cost: number;
  IsEnabled: boolean;
  Stock?: number | null;
  IsService: boolean;
  IsPriceChangeAllowed: boolean;
}

export default function CreateInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { admin } = useAuth();
  const isEditMode = !!id;

  // Form state
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('immediate');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { productName: '', quantity: 1, unitPrice: 0, taxRate: 20 }
  ]);

  // Autocomplete state
  const [productSearch, setProductSearch] = useState<{ [key: number]: string }>({});
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogProducts, setSelectedCatalogProducts] = useState<{ [key: number]: number }>({});

  // Queries
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const result = await customerService.getAll();
        return result.customers || [];
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        return [];
      }
    },
  });

  const customers = Array.isArray(customersData) ? customersData : [];

  // Get selected customer
  const selectedCustomer = customers.find(c => c.Id === customerId);

  // Filter customers for autocomplete
  const filteredCustomers = customers.filter(customer => 
    customer.Name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (customer.Email && customer.Email.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (customer.PhoneNumber && customer.PhoneNumber.includes(customerSearch))
  ).slice(0, 10);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-invoice', debouncedSearch],
    queryFn: async () => {
      try {
        const params = debouncedSearch ? { limit: 24, search: debouncedSearch } : { limit: 24 };
        const result = await productsService.getProducts(params);
        return result.products || [];
      } catch (error) {
        console.error('Failed to fetch products:', error);
        return [];
      }
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const products: Product[] = Array.isArray(productsData) ? productsData.filter(p => p.IsEnabled) : [];
  

  // Catalog products query - loads all products for catalog modal
  const { data: catalogProductsData } = useQuery({
    queryKey: ['products-catalog', catalogSearch],
    queryFn: async () => {
      try {
        const params = catalogSearch ? { limit: 100, search: catalogSearch } : { limit: 100 };
        const result = await productsService.getProducts(params);
        return result.products || [];
      } catch (error) {
        console.error('Failed to fetch catalog products:', error);
        return [];
      }
    },
    enabled: catalogModalOpen, // Only fetch when catalog is open
  });

  const catalogProducts: Product[] = Array.isArray(catalogProductsData) ? catalogProductsData.filter(p => p.IsEnabled) : [];

  // Update dropdown position when active index changes
  useEffect(() => {
    const updatePosition = () => {
      if (activeSearchIndex !== null && inputRefs.current[activeSearchIndex]) {
        const rect = inputRefs.current[activeSearchIndex]!.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeSearchIndex, showSuggestions]);

  // Initialize with empty search to load default products
  useEffect(() => {
    setDebouncedSearch('');
  }, []);

  // Debounce product search
  useEffect(() => {
    if (activeSearchIndex !== null) {
      const searchTerm = productSearch[activeSearchIndex] || '';
      const timer = setTimeout(() => {
        setDebouncedSearch(searchTerm.trim());
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [productSearch, activeSearchIndex]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice;
    return sum + (itemTotal * item.taxRate / 100);
  }, 0);
  const total = subtotal + taxAmount - discount;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceDTO) => invoiceService.create(data),
    onSuccess: () => {
      toast.success(t('invoice.createSuccess'));
      navigate('/invoices');
    },
    onError: (error: any) => {
      console.error('Invoice creation error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || t('invoice.createError');
      
      // Check for specific foreign key error
      if (errorMessage.includes('FK__Invoice__UserId') || errorMessage.includes('FOREIGN KEY constraint')) {
        toast.error('Database error: Admin user not properly configured. Please contact system administrator.');
      } else {
        toast.error(errorMessage);
      }
    },
  });

  // Handlers
  const handleSelectCustomer = (customer: typeof customers[0]) => {
    setCustomerId(customer.Id);
    setCustomerSearch(customer.Name);
    setShowCustomerSuggestions(false);
  };

  const handleAddItem = () => {
    setItems([...items, { productName: '', quantity: 1, unitPrice: 0, taxRate: 20 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      // Clean up search state
      const newSearch = { ...productSearch };
      const newShowSuggestions = { ...showSuggestions };
      delete newSearch[index];
      delete newShowSuggestions[index];
      setProductSearch(newSearch);
      setShowSuggestions(newShowSuggestions);
    }
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleProductSearch = (index: number, searchTerm: string) => {
    console.log('handleProductSearch:', { index, searchTerm });
    setProductSearch({ ...productSearch, [index]: searchTerm });
    handleUpdateItem(index, 'productName', searchTerm);
    setActiveSearchIndex(index);
    setShowSuggestions({ ...showSuggestions, [index]: true });
  };

  const handleSelectProduct = (index: number, product: Product) => {
    const price = product.Price ?? 0;
    
    // Clear active search to prevent debounce trigger
    setActiveSearchIndex(null);
    setShowSuggestions({ ...showSuggestions, [index]: false });
    
    // Update all fields in single state update to avoid race conditions
    setItems(items.map((item, i) => 
      i === index ? {
        ...item,
        productId: product.Id,
        productName: product.Name,
        unitPrice: price,
        description: product.Description || ''
      } : item
    ));
    
    setProductSearch({ ...productSearch, [index]: product.Name });
  };

  const getFilteredProducts = (index: number): Product[] => {    
    // Show products if this is the active search index and suggestions are visible
    if (activeSearchIndex === index && showSuggestions[index]) {
      return products;
    }
    
    return [];
  };

  const openCatalog = () => {
    // Pre-populate catalog selections from existing invoice items
    const existingSelections: { [key: number]: number } = {};
    items.forEach(item => {
      if (item.productId) {
        existingSelections[item.productId] = item.quantity;
      }
    });
    setSelectedCatalogProducts(existingSelections);
    setCatalogSearch('');
    setCatalogModalOpen(true);
  };

  const handleToggleCatalogProduct = (productId: number) => {
    setSelectedCatalogProducts(prev => {
      const newSelection = { ...prev };
      if (newSelection[productId]) {
        delete newSelection[productId];
      } else {
        newSelection[productId] = 1;
      }
      return newSelection;
    });
  };

  const handleUpdateCatalogQuantity = (productId: number, value: string) => {
    // Allow empty string or any number (including 0)
    if (value === '') {
      setSelectedCatalogProducts(prev => ({
        ...prev,
        [productId]: '' as any // Temporarily allow empty string
      }));
    } else {
      const quantity = parseInt(value);
      if (!isNaN(quantity) && quantity >= 0) {
        setSelectedCatalogProducts(prev => ({
          ...prev,
          [productId]: quantity
        }));
      }
    }
  };

  const handleConfirmCatalogSelection = () => {
    const selectedProducts = catalogProducts.filter(p => selectedCatalogProducts[p.Id]);
    
    setItems(prev => {
      const updatedItems = [...prev];
      
      selectedProducts.forEach(product => {
        const catalogQuantity = selectedCatalogProducts[product.Id];
        const quantity = typeof catalogQuantity === 'number' ? catalogQuantity : 1;
        const price = product.Price ?? 0;
        
        // Check if product already exists in items
        const existingIndex = updatedItems.findIndex(item => item.productId === product.Id);
        
        if (existingIndex !== -1) {
          // Update existing item quantity
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: quantity,
            unitPrice: price // Update price in case it changed
          };
        } else {
          // Add new item
          updatedItems.push({
            productId: product.Id,
            productName: product.Name,
            unitPrice: price,
            description: product.Description || '',
            quantity: quantity,
            taxRate: 20
          });
        }
      });
      
      return updatedItems;
    });
    
    setCatalogModalOpen(false);
    setSelectedCatalogProducts({});
    setCatalogSearch('');
  };

  const handleSubmit = (e: React.FormEvent, status: 'draft' | 'sent' = 'draft') => {
    e.preventDefault();
    
    if (!customerId) {
      toast.error(t('invoice.customerRequired'));
      return;
    }

    if (!admin?.Id) {
      toast.error('User not authenticated');
      console.error('Admin ID is missing:', admin);
      return;
    }

    console.log('Creating invoice with UserId:', admin.Id, 'Admin object:', admin);

    if (items.length === 0 || items.some(item => !item.productName || item.quantity <= 0 || item.unitPrice < 0)) {
      toast.error(t('invoice.validItemsRequired'));
      return;
    }

    // Calculate due date based on payment terms
    const dueDate = new Date(issueDate);
    switch (paymentTerms) {
      case 'immediate':
        break;
      case 'net15':
        dueDate.setDate(dueDate.getDate() + 15);
        break;
      case 'net30':
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      case 'net60':
        dueDate.setDate(dueDate.getDate() + 60);
        break;
      case 'net90':
        dueDate.setDate(dueDate.getDate() + 90);
        break;
    }

    const invoiceData: CreateInvoiceDTO = {
      CustomerId: customerId,
      // Only include UserId if it exists and is valid
      ...(admin?.Id ? { UserId: admin.Id } : {}),
      Date: new Date(issueDate),
      DueDate: dueDate,
      Note: notes || undefined,
      Status: status,
      Items: items.filter(item => item.productName && item.quantity > 0).map(item => ({
        ProductId: item.productId || 0,
        Description: item.description,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        Discount: discount > 0 ? (discount / items.length) : 0,
        TaxRate: item.taxRate,
      }))
    };

    console.log('Invoice data being sent:', invoiceData);
    createMutation.mutate(invoiceData);
  };

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions({});
      setShowCustomerSuggestions(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/invoices')}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {isEditMode ? t('invoice.edit') : t('invoice.create')}
                </h1>
                <p className="text-sm text-slate-500">
                  {isEditMode ? t('invoice.editSubtitle') : t('invoice.createSubtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-6">
          {/* Basic Information Card */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              {t('invoice.basicInfo')}
            </h2>
            
            {/* First Row: Customer, Date, Payment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Selection with Autocomplete */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('customer')} *
                </label>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <User className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerSuggestions(true);
                      if (!e.target.value) setCustomerId(undefined);
                    }}
                    onFocus={() => setShowCustomerSuggestions(true)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('invoice.selectCustomer')}
                    required
                  />
                  
                  {/* Customer Autocomplete Suggestions */}
                  {showCustomerSuggestions && filteredCustomers.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.Id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                        >
                          <div className="font-medium text-slate-900 text-sm">{customer.Name}</div>
                          <div className="text-xs text-slate-500">
                            {customer.Email && `${customer.Email}`}
                            {customer.PhoneNumber && ` • ${customer.PhoneNumber}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Date */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date de facturation *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Conditions de paiement *
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="immediate">Immédiat</option>
                  <option value="net15">Net 15 jours</option>
                  <option value="net30">Net 30 jours</option>
                  <option value="net60">Net 60 jours</option>
                  <option value="net90">Net 90 jours</option>
                </select>
              </div>
            </div>

            {/* Second Row: Customer Address (Read-only Label) */}
            {selectedCustomer && selectedCustomer.Address && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t('address')}
                </label>
                <p className="text-sm text-slate-700">
                  {selectedCustomer.Address}
                  {selectedCustomer.City && `, ${selectedCustomer.City}`}
                  {selectedCustomer.PostalCode && ` ${selectedCustomer.PostalCode}`}
                </p>
              </div>
            )}
          </div>

          {/* Items Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200" style={{ overflow: 'visible' }}>
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">{t('invoice.items')}</h2>
            </div>

            <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 w-[35%]">{t('product')}</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 w-[10%]">{t('quantity')}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 w-[15%]">{t('price')}</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 w-[10%]">{t('invoice.tax')}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 w-[18%]">Total HT</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 w-[12%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {/* Product with Autocomplete */}
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div style={{ position: 'relative' }}>
                          <input
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="text"
                            value={productSearch[index] !== undefined ? productSearch[index] : item.productName}
                            onChange={(e) => handleProductSearch(index, e.target.value)}
                            onFocus={() => {
                              setShowSuggestions({ ...showSuggestions, [index]: true });
                              setActiveSearchIndex(index);
                            }}
                            onBlur={() => {
                              // Delay to allow click on suggestion
                              setTimeout(() => {
                                setShowSuggestions({ ...showSuggestions, [index]: false });
                              }, 200);
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={t('invoice.searchProduct')}
                            required
                          />
                          
                          {/* Autocomplete Suggestions - rendered at body level */}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </td>

                      {/* Tax Rate */}
                      <td className="px-3 py-2">
                        <select
                          value={item.taxRate}
                          onChange={(e) => handleUpdateItem(index, 'taxRate', parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="0">0%</option>
                          <option value="10">10%</option>
                          <option value="20">20%</option>
                        </select>
                      </td>

                      {/* Total HT */}
                      <td className="px-3 py-2">
                        <div className="px-2 py-1.5 bg-slate-50 rounded text-sm font-semibold text-slate-900 text-right">
                          {(item.quantity * item.unitPrice).toFixed(2)} MAD
                        </div>
                      </td>

                      {/* Remove Button */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Bottom Action Buttons */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t('invoice.addItem')}
              </button>
              <button
                type="button"
                onClick={() => openCatalog()}
                className="px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                {t('invoice.openCatalog')}
              </button>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('invoice.discount')}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={subtotal}
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('invoice.subtotal')} HT</span>
                    <span className="font-medium">{subtotal.toFixed(2)} MAD</span>
                  </div>
                  
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('invoice.tax')}</span>
                      <span className="font-medium">{taxAmount.toFixed(2)} MAD</span>
                    </div>
                  )}
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('invoice.discount')}</span>
                      <span className="font-medium text-red-600">-{discount.toFixed(2)} MAD</span>
                    </div>
                  )}
                  
                  <hr className="border-slate-300" />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-slate-900">{t('invoice.total')} TTC</span>
                    <span className="text-blue-600">{total.toFixed(2)} MAD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('invoice.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('invoice.notesPlaceholder')}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end sticky bottom-0 bg-white border-t border-slate-200 p-4 -mx-6 -mb-6 mt-6">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              disabled={createMutation.isPending}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || total <= 0}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('invoice.saveDraft')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'sent')}
              disabled={createMutation.isPending || total <= 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('creating')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('invoice.createAndSend')}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Catalog Modal */}
        {catalogModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-slate-900">{t('invoice.productCatalog')}</h3>
                  {Object.keys(selectedCatalogProducts).length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                      {Object.keys(selectedCatalogProducts).length} {t('selected')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setCatalogModalOpen(false)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="p-4 border-b border-slate-200">
                <div className="relative">
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder={t('invoice.searchProduct')}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Products Grid */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {catalogProducts.map((product, index) => {
                    const isSelected = !!selectedCatalogProducts[product.Id];
                    const quantity = selectedCatalogProducts[product.Id];
                    
                    return (
                      <div
                        key={product.Id}
                        style={{ animationDelay: `${index * 20}ms` }}
                        className={`group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer active:scale-[0.98] ${
                          isSelected ? 'ring-2 ring-blue-600 bg-blue-50' : ''
                        }`}
                      >
                        {/* Product Image/Icon */}
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                          {product.ImageUrl ? (
                            <img
                              src={product.ImageUrl}
                              alt={product.Name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-slate-300" />
                            </div>
                          )}

                          {/* Quantity badge when selected */}
                          {isSelected && quantity > 0 && (
                            <div className="absolute top-2 right-2 min-w-[24px] h-6 px-2 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-lg">
                              {quantity}
                            </div>
                          )}
                          
                          {/* Checkbox overlay */}
                          <div className="absolute top-2 left-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCatalogProduct(product.Id)}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {/* Stock badge */}
                          {product.Stock !== undefined && product.Stock !== null && (
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs font-medium text-slate-700">
                              Stock: {product.Stock}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-3 flex flex-col">
                          <h3 className="font-semibold text-slate-900 line-clamp-2 leading-tight mb-1 text-sm">
                            {product.Name}
                          </h3>
                          
                          {product.Code && (
                            <p className="text-xs text-slate-500 mb-2">Code: {product.Code}</p>
                          )}

                          {product.Description && !isSelected && (
                            <p className="text-xs text-slate-600 line-clamp-2 mb-2">{product.Description}</p>
                          )}

                          <div className="mt-auto">
                            <span className="text-sm font-bold text-blue-600">
                              {(product.Price ?? 0).toFixed(2)} MAD
                            </span>
                          </div>

                          {/* Quantity Input - shown when selected */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                {t('quantity')}
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={quantity === '' ? '' : (quantity || '')}
                                onChange={(e) => handleUpdateCatalogQuantity(product.Id, e.target.value)}
                                placeholder="0"
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {catalogProducts.length === 0 && (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">{t('invoice.noProductsFound')}</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="text-sm text-slate-600">
                  {Object.keys(selectedCatalogProducts).length > 0 ? (
                    <span>
                      {Object.keys(selectedCatalogProducts).length} {t('invoice.productsSelected')} • 
                      Total Qty: {Object.values(selectedCatalogProducts).reduce((sum, qty) => sum + qty, 0)}
                    </span>
                  ) : (
                    <span>{t('invoice.selectProducts')}</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCatalogModalOpen(false)}
                    className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCatalogSelection}
                    disabled={
                      Object.keys(selectedCatalogProducts).length === 0 ||
                      Object.values(selectedCatalogProducts).some(qty => !qty || qty <= 0)
                    }
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('invoice.addToInvoice')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Autocomplete Dropdown */}
      {activeSearchIndex !== null && showSuggestions[activeSearchIndex] && getFilteredProducts(activeSearchIndex).length > 0 && dropdownPosition && (
        <div 
          className="fixed z-50 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            minWidth: '300px'
          }}
        >
          {getFilteredProducts(activeSearchIndex).slice(0, 10).map((product) => (
            <button
              key={product.Id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectProduct(activeSearchIndex, product);
              }}
              className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-slate-900 text-sm">{product.Name}</div>
                  <div className="text-xs text-slate-500">
                    {product.Code && `Code: ${product.Code}`}
                    {product.Stock !== undefined && product.Stock !== null && ` • Stock: ${product.Stock}`}
                  </div>
                </div>
                <div className="text-sm font-semibold text-blue-600 ml-2">
                  {(product.Price ?? 0).toFixed(2)} MAD
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
