import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { CreateInvoiceDTO } from '../modules/invoices/invoices.interface';
import { Partner } from '../modules/partners/partners.interface';
import { Product } from '../modules/products/products.interface';
import { partnersService } from '../modules/partners/partners.service';
import { productsService } from '../modules/products/products.service';
import { useLanguage } from '../context/LanguageContext';
import { ProductCatalogueModal } from './ProductCatalogueModal';

interface InvoiceItemRow {
  id: string;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number; // 0 = amount, 1 = percentage
  tax: number; // Tax percentage (0, 10, or 20)
  total: number;
}

interface FactureFormProps {
  type: 'vente' | 'achat';
  onSubmit: (data: CreateInvoiceDTO) => void;
  onCancel: () => void;
  initialData?: any;
  loading?: boolean;
  readOnly?: boolean;
}

export function FactureForm({ type, onSubmit, onCancel, initialData, readOnly }: FactureFormProps) {
  const { t } = useLanguage();
  const isVente = type === 'vente';
  const partnerLabel = isVente ? t('invoice.customer') : t('invoice.supplier');

  // Form state
  const [partnerId, setPartnerId] = useState<number | undefined>(initialData?.partnerId);
  const [partnerName, setPartnerName] = useState(initialData?.partnerName || '');
  const [partnerPhone, setPartnerPhone] = useState(initialData?.partnerPhone || '');
  const [partnerAddress, setPartnerAddress] = useState(initialData?.partnerAddress || '');
  const [partnerIce, setPartnerIce] = useState(initialData?.partnerIce || '');
  const [deliveryAddress, setDeliveryAddress] = useState(initialData?.deliveryAddress || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [paymentTerms, setPaymentTerms] = useState(initialData?.paymentTerms || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  const [items, setItems] = useState<InvoiceItemRow[]>([
    { id: '1', productId: undefined, description: '', quantity: 1, unitPrice: 0, discount: 0, discountType: 0, tax: 0, total: 0 }
  ]);

  // Catalogue modal state
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  
  // MinPrice validation state
  const [minPriceValidation, setMinPriceValidation] = useState<{ show: boolean; message: string; itemId: string }>({ 
    show: false, 
    message: '', 
    itemId: '' 
  });
  
  // Debounce validation
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingValidation, setPendingValidation] = useState<{ itemId: string; productId: number; value: number } | null>(null);

  // Handle catalogue modal opening
  const handleOpenCatalogue = () => {
    setShowCatalogueModal(true);
  };

  // Handle items change from catalogue
  const handleCatalogueItemsChange = (newItems: InvoiceItemRow[]) => {
    setItems(newItems);
  };

  // Debounced minPrice validation
  useEffect(() => {
    if (pendingValidation) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      
      validationTimeoutRef.current = setTimeout(async () => {
        try {
          const product = await productsService.getProduct(pendingValidation.productId);
          if (product && product.minPrice && pendingValidation.value < product.minPrice) {
            setMinPriceValidation({
              show: true,
              message: `Le prix minimum pour ce produit est de ${product.minPrice.toFixed(2)} DH`,
              itemId: pendingValidation.itemId
            });
          }
        } catch (error) {
          console.error('Error fetching product for minPrice validation:', error);
        }
        setPendingValidation(null);
      }, 800); // 800ms delay
    }
    
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [pendingValidation]);
  useEffect(() => {
    if (initialData?.items && initialData.items.length > 0) {
      const loadedItems = initialData.items.map((item: any, index: number) => ({
        id: String(index + 1),
        productId: item.productId,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        discountType: item.discountType || 0,
        tax: parseFloat(item.tax) || 0,
        total: parseFloat(item.total) || 0
      }));
      setItems(loadedItems);
    }
  }, [initialData]);

  // Partner search
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const partnerSearchRef = useRef<HTMLDivElement>(null);

  // Product search for each row
  const [showProductSearch, setShowProductSearch] = useState<string | null>(null);
  const [products, setProducts] = useState<Record<string, Product[]>>({});
  const [loadingProducts, setLoadingProducts] = useState<Record<string, boolean>>({});
  const productSearchRef = useRef<HTMLInputElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<Record<string, number>>({});

  // Load partners
  useEffect(() => {
    const loadPartners = async () => {
      try {
        const response = await partnersService.getAll();
        // Filter by type: customers for vente, suppliers for achat
        const filtered = response.partners.filter(p => 
          isVente ? p.isCustomer : p.isSupplier
        );
        setPartners(filtered);
      } catch (error) {
        console.error('Error loading partners:', error);
        setPartners([]);
      }
    };
    
    loadPartners();
  }, [type, isVente]);

  // Debounced product search
  const searchProducts = async (itemId: string, query: string) => {
    // Clear existing timeout for this item
    if (searchTimeoutRef.current[itemId]) {
      clearTimeout(searchTimeoutRef.current[itemId]);
    }

    // Set loading state
    setLoadingProducts(prev => ({ ...prev, [itemId]: true }));

    // Debounce the search
    searchTimeoutRef.current[itemId] = setTimeout(async () => {
      try {
        const response = await productsService.getProducts({ 
          search: query.trim() || undefined, 
          limit: 20 
        });
        setProducts(prev => ({ ...prev, [itemId]: response.products || [] }));
      } catch (error) {
        console.error('Error searching products:', error);
        setProducts(prev => ({ ...prev, [itemId]: [] }));
      } finally {
        setLoadingProducts(prev => ({ ...prev, [itemId]: false }));
      }
    }, query.trim() ? 300 : 0);
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partnerSearchRef.current && !partnerSearchRef.current.contains(event.target as Node)) {
        setShowPartnerSearch(false);
      }
      // Check if click is outside both the input and the dropdown
      const clickedInput = productSearchRef.current?.contains(event.target as Node);
      const clickedDropdown = productDropdownRef.current?.contains(event.target as Node);
      if (!clickedInput && !clickedDropdown) {
        setShowProductSearch(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate item total
  const calculateItemTotal = (item: InvoiceItemRow): number => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discountType === 1 
      ? subtotal * (item.discount / 100) 
      : item.discount;
    return subtotal - discountAmount;
  };

  // Calculate totals
  // Total HT: sum of items before tax
  const totalHT = items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discountType === 1 
      ? itemSubtotal * (item.discount / 100) 
      : item.discount;
    return sum + (itemSubtotal - discountAmount);
  }, 0);
  
  // Group items by tax rate and calculate TVA for each rate (excluding 0%)
  const taxByRate = items.reduce((acc, item) => {
    if (item.tax > 0) {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount = item.discountType === 1 
        ? itemSubtotal * (item.discount / 100) 
        : item.discount;
      const itemHT = itemSubtotal - discountAmount;
      const itemTVA = itemHT * (item.tax / 100);
      
      if (!acc[item.tax]) {
        acc[item.tax] = 0;
      }
      acc[item.tax] += itemTVA;
    }
    return acc;
  }, {} as Record<number, number>);
  
  // Total TVA: sum of all tax amounts
  const totalTVA = Object.values(taxByRate).reduce((sum, tva) => sum + tva, 0);
  
  // Total TTC: Total HT + Total TVA
  const totalTTC = totalHT + totalTVA;

  const handleAddItem = () => {
    const newId = (Math.max(...items.map(i => parseInt(i.id)), 0) + 1).toString();
    setItems([...items, {
      id: newId,
      productId: undefined,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 0,
      tax: 0,
      total: 0
    }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof InvoiceItemRow, value: any) => {
    // If changing unitPrice, setup debounced validation
    if (field === 'unitPrice' && typeof value === 'number') {
      const item = items.find(i => i.id === id);
      if (item && item.productId) {
        // Clear any existing validation popup
        setMinPriceValidation({ show: false, message: '', itemId: '' });
        // Setup debounced validation
        setPendingValidation({ itemId: id, productId: item.productId, value });
      }
    }

    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.total = calculateItemTotal(updated);
        
        // Trigger product search when description changes
        if (field === 'description' && typeof value === 'string') {
          searchProducts(id, value);
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleSelectPartner = (partner: Partner) => {
    setPartnerId(partner.id);
    setPartnerName(partner.name);
    setPartnerPhone(partner.phoneNumber);
    setPartnerAddress(partner.address || '');
    setPartnerIce(partner.ice || '');
    setDeliveryAddress(partner.deliveryAddress || '');
    setShowPartnerSearch(false);
  };

  const handleSelectProduct = (itemId: string, product: Product) => {
    // Check if product already exists in the items list
    const existingItemIndex = items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex !== -1) {
      // Product already exists, increase quantity by 1
      const updatedItems = items.map((item, index) => {
        if (index === existingItemIndex) {
          const updated = { 
            ...item, 
            quantity: item.quantity + 1
          };
          updated.total = calculateItemTotal(updated);
          return updated;
        }
        return item;
      });
      setItems(updatedItems);
    } else {
      // Product doesn't exist, update the current row
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          const updated = { 
            ...item, 
            productId: product.id,
            description: product.name,
            unitPrice: isVente ? product.price : product.cost,
            tax: product.defaultTax || 0
          };
          updated.total = calculateItemTotal(updated);
          return updated;
        }
        return item;
      });
      setItems(updatedItems);
    }
    
    setShowProductSearch(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty items (no productId and no description)
    const validItems = items.filter(item => 
      item.productId || item.description.trim()
    );

    const invoiceData: CreateInvoiceDTO = {
      date,
      dueDate: dueDate || undefined,
      items: validItems.map(item => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        tax: item.tax,
      })),
      tax: 0,
      discount: 0,
      discountType: 0,
      notes: notes || undefined,
    };

    if (isVente) {
      invoiceData.customerId = partnerId;
      invoiceData.customerName = partnerName;
      invoiceData.customerPhone = partnerPhone;
      invoiceData.customerAddress = partnerAddress;
    } else {
      invoiceData.supplierId = partnerId;
      invoiceData.supplierName = partnerName;
      invoiceData.supplierPhone = partnerPhone;
      invoiceData.supplierAddress = partnerAddress;
    }

    onSubmit(invoiceData);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" style={{overflow: 'visible'}}>
      {/* Partner Information & Invoice Information Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Partner Information */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-base font-bold text-slate-800 mb-3">{t('invoice.customerInfo').replace('client', partnerLabel)}</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {partnerLabel} *
              </label>
              <div className="relative" ref={partnerSearchRef}>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => {
                    setPartnerName(e.target.value);
                    setShowPartnerSearch(true);
                  }}
                  onFocus={() => setShowPartnerSearch(true)}
                  placeholder={t('invoice.partnerNamePlaceholder').replace('{partner}', partnerLabel.toLowerCase())}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                  required
                  disabled={readOnly}
                />
                {(partnerPhone || partnerAddress) && (
                  <div className="mt-1.5 space-y-0.5">
                    {partnerPhone && (
                      <p className="text-xs text-slate-600">
                        <span className="font-medium">{t('invoice.phoneLabel')}</span> {partnerPhone}
                      </p>
                    )}
                    {partnerAddress && (
                      <p className="text-xs text-slate-600">
                        <span className="font-medium">{t('invoice.addressLabel')}</span> {partnerAddress}
                      </p>
                    )}
                  </div>
                )}
                {showPartnerSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {partners.length > 0 ? (
                      <div>
                        {partners
                          .filter(p => 
                            p.name.toLowerCase().includes(partnerName.toLowerCase()) ||
                            p.phoneNumber.includes(partnerName)
                          )
                          .map(partner => (
                            <div
                              key={partner.id}
                              onClick={() => handleSelectPartner(partner)}
                              className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                            >
                              <div className="font-medium text-slate-800">{partner.name}</div>
                              <div className="text-sm text-slate-500">{partner.phoneNumber}</div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        {t('invoice.noPartnerFound').replace('{partner}', partnerLabel.toLowerCase())}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {partnerIce && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t('invoice.iceLabel')}
                </label>
                <input
                  type="text"
                  value={partnerIce}
                  readOnly
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 bg-slate-50 rounded-lg text-slate-600"
                />
              </div>
            )}

            {deliveryAddress && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t('invoice.deliveryAddressLabel')}
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  readOnly
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 bg-slate-50 rounded-lg text-slate-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Invoice Information */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-base font-bold text-slate-800 mb-3">{t('invoice.information')}</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t('invoice.dateRequired')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t('invoice.dueDateLabel')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t('invoice.paymentTermsLabel')}
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder={t('invoice.paymentTermsPlaceholder')}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 overflow-visible">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800">{t('invoice.articlesTitle')}</h3>
        </div>

        <div className="overflow-x-auto" style={{overflowY: 'visible'}}>
          <table className="w-full" style={{overflow: 'visible'}}>
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">{t('invoice.descriptionHeader')}</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700 w-24">{t('invoice.quantityHeader')}</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700 w-32">{t('invoice.unitPriceHeader')}</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700 w-24">{t('invoice.discountHeader')}</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700 w-20">{t('invoice.tax')}</th>
                <th className="text-center py-2 px-2 text-sm font-semibold text-slate-700 w-32">{t('invoice.totalHeader')}</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody style={{overflow: 'visible'}}>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100" style={{overflow: 'visible'}}>
                  <td className="py-2 px-2" style={{overflow: 'visible'}}>
                    <div className="relative">
                      <input
                        ref={showProductSearch === item.id ? productSearchRef : null}
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        onFocus={() => {
                          if (!readOnly) {
                            setShowProductSearch(item.id);
                            // Load products if not already loaded for this item
                            if (!products[item.id]) {
                              searchProducts(item.id, item.description);
                            }
                          }
                        }}
                        placeholder={t('invoice.itemDescriptionPlaceholder')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                        disabled={readOnly}
                      />
                      {showProductSearch === item.id && productSearchRef.current && (
                        <div 
                          ref={productDropdownRef}
                          className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                          style={{
                            top: `${productSearchRef.current.getBoundingClientRect().bottom + 4}px`,
                            left: `${productSearchRef.current.getBoundingClientRect().left}px`,
                            width: `${productSearchRef.current.getBoundingClientRect().width}px`,
                          }}
                        >
                          {loadingProducts[item.id] ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              {t('loading')}
                            </div>
                          ) : (products[item.id] || []).length > 0 ? (
                            <div>
                              {(products[item.id] || []).map(product => (
                                <div
                                  key={product.id}
                                  onClick={() => handleSelectProduct(item.id, product)}
                                  className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                >
                                  <div className="font-medium text-slate-800">{product.name}</div>
                                  <div className="text-sm text-slate-500">
                                    {isVente ? product.price : product.cost} DH
                                    {product.code && ` • ${product.code}`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : item.description.trim() ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              {t('invoice.noProductsFound')}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              {t('invoice.productSearchPlaceholder')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.discount}
                        onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-20 flex-1 px-2 py-2 text-sm text-right focus:outline-none border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                        disabled={readOnly}
                      />
                      <button
                        type="button"
                        onClick={() => !readOnly && handleItemChange(item.id, 'discountType', item.discountType === 0 ? 1 : 0)}
                        className="px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium min-w-[40px] transition-colors disabled:bg-slate-200 disabled:text-slate-400"
                        disabled={readOnly}
                      >
                        {item.discountType === 0 ? 'DH' : '%'}
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={item.tax}
                      onChange={(e) => handleItemChange(item.id, 'tax', parseFloat(e.target.value))}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={readOnly}
                    >
                      <option value={0}>0%</option>
                      <option value={10}>10%</option>
                      <option value={20}>20%</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <div className="text-right font-semibold text-slate-800 px-3 py-2">
                      {calculateItemTotal(item).toFixed(2)} DH
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    {item.productId && !readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Action Buttons - Only show when not readOnly */}
          {!readOnly && (
            <div className="mt-4 flex justify-start gap-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center justify-center w-8 h-8 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors"
                title="Ajouter une ligne"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleOpenCatalogue}
                className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                title="Catalogue produits"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Totals and Adjustments */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('invoice.notesLabel')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={t('invoice.notesPlaceholder')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Totals */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-slate-700">
              <span>{t('invoice.totalHT')}:</span>
              <span className="font-semibold">{totalHT.toFixed(2)} DH</span>
            </div>

            {Object.entries(taxByRate).map(([rate, amount]) => (
              <div key={rate} className="flex justify-between items-center text-slate-700">
                <span>Total TVA {rate}%:</span>
                <span className="font-semibold">{amount.toFixed(2)} DH</span>
              </div>
            ))}

            {Object.keys(taxByRate).length > 0 && (
              <div className="flex justify-between items-center text-slate-700 border-t border-slate-200 pt-2">
                <span className="font-semibold">Total TVA:</span>
                <span className="font-semibold">{totalTVA.toFixed(2)} DH</span>
              </div>
            )}

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-900">Total TTC:</span>
              <span className="text-2xl font-bold text-amber-600">{totalTTC.toFixed(2)} DH</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
        >
          {readOnly ? 'Fermer' : t('cancel')}
        </button>
        {!readOnly && (
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
          >
            {initialData ? t('edit') : t('create')} {type === 'vente' ? t('invoice.title').toLowerCase().slice(0, -1) : 'bon d\'achat'}
          </button>
        )}
      </div>
    </form>

    {/* Product Catalogue Modal */}
    {/* MinPrice Validation Popup */}
    {minPriceValidation.show && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Prix en dessous du minimum</h3>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-sm text-gray-600">{minPriceValidation.message}</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setMinPriceValidation({ show: false, message: '', itemId: '' })}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Compris
            </button>
          </div>
        </div>
      </div>
    )}

    <ProductCatalogueModal
      isOpen={showCatalogueModal}
      onClose={() => setShowCatalogueModal(false)}
      onItemsChange={handleCatalogueItemsChange}
      currentItems={items}
      type={type}
    />
    </>
  );
}
