import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService, validateProductForm, hasValidationErrors, getFirstError, ValidationErrors } from '../modules/products';
import { warehousesService } from '../modules/warehouses';
import { stockService } from '../modules/stock';
import { categoriesService } from '../modules/categories';
import { taxesService } from '../modules/taxes';
import { uomService } from '../modules/uom';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Package, ArrowLeft, Save, Plus, ArrowRightLeft, Edit2, CheckSquare, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'stock' | 'pricing'>('info');
  const [isEditing, setIsEditing] = useState(true);
  const [showStockCorrection, setShowStockCorrection] = useState(false);
  const [showStockTransfer, setShowStockTransfer] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    cost: '',
    minPrice: '',
    saleTax: '20',
    purchaseTax: '20',
    saleUnit: 'Unité(s)',
    purchaseUnit: 'Unité(s)',
    categoryIds: [] as number[],
    warehouseId: '',
    isService: false,
    isEnabled: true,
    isPriceChangeAllowed: true,
  });

  // Store selected category objects for display
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Clear validation error for a specific field
  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Function to regenerate product code
  const handleRegenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const uniqueCode = await generateUniqueProductCode();
      setFormData(prev => ({ ...prev, code: uniqueCode }));
      clearFieldError('code');
      toast.success('New unique product code generated');
    } catch (error) {
      console.error('Failed to generate unique code:', error);
      toast.error('Failed to generate unique code. Please try again.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const [stockCorrectionData, setStockCorrectionData] = useState({
    warehouseId: '',
    quantity: '',
    operation: 'add' as 'add' | 'remove',
    unitPrice: '',
    notes: '',
  });

  const [stockTransferData, setStockTransferData] = useState({
    sourceWarehouseId: '',
    destWarehouseId: '',
    quantity: '',
    notes: '',
  });

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsService.getProduct(Number(id)),
    enabled: !!id,
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesService.getAll(),
  });

  const { data: taxesConfig } = useQuery({
    queryKey: ['taxes', 'configuration'],
    queryFn: () => taxesService.getConfiguration(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'product'],
    queryFn: () => categoriesService.getByType('product'),
  });

  const { data: uoms = [] } = useQuery({
    queryKey: ['uom'],
    queryFn: () => uomService.getAll(),
  });

  const taxRates = taxesConfig?.rates || [];

  // Autocomplete states
  const [showWarehouseSearch, setShowWarehouseSearch] = useState(false);
  const [warehouseSearchTerm, setWarehouseSearchTerm] = useState('');
  const [showCategorySearch, setShowCategorySearch] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showSaleUnitSearch, setShowSaleUnitSearch] = useState(false);
  const [showPurchaseUnitSearch, setShowPurchaseUnitSearch] = useState(false);
  const [showSaleTaxSearch, setShowSaleTaxSearch] = useState(false);
  const [showPurchaseTaxSearch, setShowPurchaseTaxSearch] = useState(false);

  // Refs for click outside handling
  const warehouseSearchRef = useRef<HTMLDivElement>(null);
  const categorySearchRef = useRef<HTMLDivElement>(null);
  const saleUnitSearchRef = useRef<HTMLDivElement>(null);
  const purchaseUnitSearchRef = useRef<HTMLDivElement>(null);
  const saleTaxSearchRef = useRef<HTMLDivElement>(null);
  const purchaseTaxSearchRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (warehouseSearchRef.current && !warehouseSearchRef.current.contains(event.target as Node)) {
        setShowWarehouseSearch(false);
      }
      if (categorySearchRef.current && !categorySearchRef.current.contains(event.target as Node)) {
        setShowCategorySearch(false);
      }
      if (saleUnitSearchRef.current && !saleUnitSearchRef.current.contains(event.target as Node)) {
        setShowSaleUnitSearch(false);
      }
      if (purchaseUnitSearchRef.current && !purchaseUnitSearchRef.current.contains(event.target as Node)) {
        setShowPurchaseUnitSearch(false);
      }
      if (saleTaxSearchRef.current && !saleTaxSearchRef.current.contains(event.target as Node)) {
        setShowSaleTaxSearch(false);
      }
      if (purchaseTaxSearchRef.current && !purchaseTaxSearchRef.current.contains(event.target as Node)) {
        setShowPurchaseTaxSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch stock quants for this product
  const { data: stockQuants = [] } = useQuery({
    queryKey: ['stock-quants', id],
    queryFn: () => stockService.getProductStock(Number(id)),
    enabled: !!id,
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => productsService.updateProduct(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditing(false);
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });

  // Stock correction mutation
  const stockCorrectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const movement = await stockService.createMovement({
        movementType: 'adjustment',
        productId: Number(id),
        destWarehouseId: data.operation === 'add' ? Number(data.warehouseId) : undefined,
        sourceWarehouseId: data.operation === 'remove' ? Number(data.warehouseId) : undefined,
        quantity: Number(data.quantity),
        notes: data.notes || `Stock correction for product ${product?.code || id}`,
      });
      await stockService.validateMovement({ movementId: movement.id });
      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-quants', id] });
      setShowStockCorrection(false);
      setStockCorrectionData({
        warehouseId: '',
        quantity: '',
        operation: 'add',
        unitPrice: '',
        notes: '',
      });
      toast.success('Stock corrected successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to correct stock');
    },
  });

  // Stock transfer mutation
  const stockTransferMutation = useMutation({
    mutationFn: (data: any) => stockService.internalTransfer({
      productId: Number(id),
      sourceWarehouseId: Number(data.sourceWarehouseId),
      destWarehouseId: Number(data.destWarehouseId),
      quantity: Number(data.quantity),
      notes: data.notes || `Stock transfer for product ${product?.code || id}`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-quants', id] });
      setShowStockTransfer(false);
      setStockTransferData({
        sourceWarehouseId: '',
        destWarehouseId: '',
        quantity: '',
        notes: '',
      });
      toast.success('Stock transferred successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to transfer stock');
    },
  });

  // Initialize form when product loads
  useEffect(() => {
    if (product) {
      const productCategories = (product as any).categories || [];
      const categoryIdsFromProduct = productCategories.map((c: any) => c.id);
      
      // Get UOM names from relations
      const saleUnitName = (product as any).saleUnitOfMeasure?.name || '';
      const purchaseUnitName = (product as any).purchaseUnitOfMeasure?.name || '';
      
      setFormData({
        name: product.name,
        code: product.code || '',
        description: product.description || '',
        price: product.price.toString(),
        cost: product.cost.toString(),
        minPrice: product.minPrice.toString(),
        saleTax: product.saleTax?.toString() || '20',
        purchaseTax: product.purchaseTax?.toString() || '20',
        saleUnit: saleUnitName,
        purchaseUnit: purchaseUnitName,
        categoryIds: categoryIdsFromProduct,
        warehouseId: product.warehouseId?.toString() || '',
        isService: product.isService,
        isEnabled: product.isEnabled,
        isPriceChangeAllowed: product.isPriceChangeAllowed,
      });
      
      // Store category objects for display
      setSelectedCategories(productCategories);
      
      // Set warehouse for autocomplete
      if (product.warehouseId) {
        // Check if product has warehouse object from API
        const warehouseFromProduct = (product as any).warehouse;
        const warehouse = warehouseFromProduct || warehouses.find((w: any) => w.id === product.warehouseId);
        if (warehouse) {
          setSelectedWarehouse(warehouse);
          setWarehouseSearchTerm(`${warehouse.name} (${warehouse.code})`);
        }
      } else {
        setSelectedWarehouse(null);
        setWarehouseSearchTerm('');
      }
    }
  }, [product, warehouses]);

  const handleSave = () => {
    // Validate form
    const errors = validateProductForm(formData, false);
    setValidationErrors(errors);

    if (hasValidationErrors(errors)) {
      const firstError = getFirstError(errors);
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    // Find UOM IDs from the selected unit names
    const saleUom = uoms.find((u: any) => u.name === formData.saleUnit);
    const purchaseUom = uoms.find((u: any) => u.name === formData.purchaseUnit);

    const updateData: any = {
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      minPrice: parseFloat(formData.minPrice),
      saleTax: parseFloat(formData.saleTax),
      purchaseTax: parseFloat(formData.purchaseTax),
      warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
      categoryIds: formData.categoryIds,
      isService: formData.isService,
      isEnabled: formData.isEnabled,
      isPriceChangeAllowed: formData.isPriceChangeAllowed,
      saleUnitId: saleUom?.id || null,
      purchaseUnitId: purchaseUom?.id || null,
    };
    
    updateMutation.mutate(updateData);
  };

  const handleStockCorrection = () => {
    stockCorrectionMutation.mutate(stockCorrectionData);
  };

  const handleStockTransfer = () => {
    stockTransferMutation.mutate(stockTransferData);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-slate-500">Product not found</p>
        </div>
      </AdminLayout>
    );
  }

  const totalStock = stockQuants.reduce((sum, sq) => sum + parseFloat(sq.quantity?.toString() || '0'), 0).toFixed(2);

  return (
    <AdminLayout>
      {/* Compact Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/products')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{product.name}</h1>
              <p className="text-sm text-slate-500">{product.code || 'No code'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-200 px-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'info'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'pricing'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tarification
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'stock'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock
            <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
              {totalStock}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* Product Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Basic Info Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Product Code (EAN-13)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => {
                          setFormData({ ...formData, code: e.target.value });
                          clearFieldError('code');
                        }}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          validationErrors.code ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-amber-500 focus:ring-amber-500/20'
                        } focus:ring-2`}
                        placeholder="EAN-13 barcode"
                        maxLength={13}
                      />
                      {validationErrors.code && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.code}</p>
                      )}
                      {!validationErrors.code && formData.code && (
                        <p className="mt-1 text-xs text-slate-500">13-digit EAN-13 barcode for Morocco (611)</p>
                      )}
                      <button
                        type="button"
                        onClick={handleRegenerateCode}
                        disabled={isGeneratingCode}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Generate new unique EAN-13 code"
                      >
                        <RefreshCw className={`w-3 h-3 ${isGeneratingCode ? 'animate-spin' : ''}`} />
                        {isGeneratingCode ? 'Generating...' : 'Generate new code'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Warehouse <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={warehouseSearchRef}>
                      <input
                        type="text"
                        value={warehouseSearchTerm}
                        onChange={(e) => {
                          setWarehouseSearchTerm(e.target.value);
                          setShowWarehouseSearch(true);
                        }}
                        onFocus={() => setShowWarehouseSearch(true)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        placeholder="Select or search warehouse"
                      />
                      {showWarehouseSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {warehouses.filter((w: any) =>
                            w.name.toLowerCase().includes(warehouseSearchTerm.toLowerCase()) ||
                            w.code?.toLowerCase().includes(warehouseSearchTerm.toLowerCase())
                          ).length > 0 ? (
                            warehouses
                              .filter((w: any) =>
                                w.name.toLowerCase().includes(warehouseSearchTerm.toLowerCase()) ||
                                w.code?.toLowerCase().includes(warehouseSearchTerm.toLowerCase())
                              )
                              .map((warehouse: any) => (
                                <div
                                  key={warehouse.id}
                                  onClick={() => {
                                    setSelectedWarehouse(warehouse);
                                    setFormData({ ...formData, warehouseId: warehouse.id.toString() });
                                    setWarehouseSearchTerm(`${warehouse.name} (${warehouse.code})`);
                                    setShowWarehouseSearch(false);
                                  }}
                                  className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                >
                                  <div className="font-medium text-slate-800">{warehouse.name}</div>
                                  <div className="text-sm text-slate-500">{warehouse.code}</div>
                                </div>
                              ))
                          ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              No warehouses found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Categories
                    </label>
                    <div className="relative" ref={categorySearchRef}>
                      {/* Input container with chips inside */}
                      <div className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 flex flex-wrap gap-2 items-center">
                        {/* Selected categories chips */}
                        {selectedCategories.map((category: any) => (
                          <span
                            key={category.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                          >
                            {category.name}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategories(selectedCategories.filter((c: any) => c.id !== category.id));
                                setFormData({
                                  ...formData,
                                  categoryIds: formData.categoryIds.filter((id: number) => id !== category.id)
                                });
                              }}
                              className="hover:text-amber-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {/* Input field */}
                        <input
                          type="text"
                          value={categorySearchTerm}
                          onChange={(e) => {
                            setCategorySearchTerm(e.target.value);
                            setShowCategorySearch(true);
                          }}
                          onFocus={() => setShowCategorySearch(true)}
                          className="flex-1 min-w-[120px] outline-none border-none focus:ring-0"
                          placeholder={selectedCategories.length === 0 ? "Type to search and add categories" : ""}
                        />
                      </div>
                      {showCategorySearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {categories.filter((c: any) =>
                            c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) &&
                            !formData.categoryIds.includes(c.id)
                          ).length > 0 ? (
                            categories
                              .filter((c: any) =>
                                c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) &&
                                !formData.categoryIds.includes(c.id)
                              )
                              .map((category: any) => (
                                <div
                                  key={category.id}
                                  onClick={() => {
                                    setSelectedCategories([...selectedCategories, category]);
                                    setFormData({ 
                                      ...formData, 
                                      categoryIds: [...formData.categoryIds, category.id] 
                                    });
                                    setCategorySearchTerm('');
                                    setShowCategorySearch(false);
                                  }}
                                  className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                >
                                  <div className="font-medium text-slate-800">{category.name}</div>
                                  {category.description && (
                                    <div className="text-sm text-slate-500">{category.description}</div>
                                  )}
                                </div>
                              ))
                          ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              {categorySearchTerm ? 'No categories found' : 'Start typing to search categories'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    placeholder="Enter product description"
                  />
                </div>
              </div>

              {/* Product Options Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <div
                      onClick={() => setFormData({ ...formData, isService: !formData.isService })}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                        formData.isService
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {formData.isService && <CheckSquare className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700">Is Service</span>
                      <p className="text-xs text-slate-500">
                        Check if this is a service (no physical inventory)
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <div
                      onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                        formData.isEnabled
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {formData.isEnabled && <CheckSquare className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700">Enabled</span>
                      <p className="text-xs text-slate-500">
                        Product is active and available for sale
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <div
                      onClick={() => setFormData({ ...formData, isPriceChangeAllowed: !formData.isPriceChangeAllowed })}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                        formData.isPriceChangeAllowed
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {formData.isPriceChangeAllowed && <CheckSquare className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700">Allow Price Change</span>
                      <p className="text-xs text-slate-500">
                        Users can modify price during order creation
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="px-6 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">Stock Management</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowStockCorrection(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Correct Stock
                  </button>
                  <button
                    onClick={() => setShowStockTransfer(true)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                    Transfer Stock
                  </button>
                </div>
              </div>

              {/* Stock by Warehouse */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Location</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">On Hand</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Reserved</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Available</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Incoming</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Outgoing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockQuants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                          No stock records found
                        </td>
                      </tr>
                    ) : (
                      stockQuants.map((sq) => (
                        <tr key={sq.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {sq.location?.name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                            {parseFloat(sq.quantity.toString()).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-amber-600 text-right">
                            {parseFloat(sq.reservedQuantity.toString()).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                            {parseFloat(sq.availableQuantity.toString()).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600 text-right">
                            {parseFloat(sq.incomingQuantity.toString()).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-orange-600 text-right">
                            {parseFloat(sq.outgoingQuantity.toString()).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">
                        {stockQuants.reduce((sum, sq) => sum + parseFloat(sq.quantity?.toString() || '0'), 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-amber-600 text-right">
                        {stockQuants.reduce((sum, sq) => sum + parseFloat(sq.reservedQuantity?.toString() || '0'), 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                        {stockQuants.reduce((sum, sq) => sum + parseFloat(sq.availableQuantity?.toString() || '0'), 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                        {stockQuants.reduce((sum, sq) => sum + parseFloat(sq.incomingQuantity?.toString() || '0'), 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-orange-600 text-right">
                        {stockQuants.reduce((sum, sq) => sum + parseFloat(sq.outgoingQuantity?.toString() || '0'), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Tarification</h3>
              
              {/* Sale Price Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-3">Prix de vente</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Prix <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-500 text-sm">DH</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Unité
                    </label>
                    <div className="relative" ref={saleUnitSearchRef}>
                      <input
                        type="text"
                        value={formData.saleUnit}
                        onChange={(e) => {
                          setFormData({ ...formData, saleUnit: e.target.value });
                          setShowSaleUnitSearch(true);
                        }}
                        onFocus={() => setShowSaleUnitSearch(true)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        placeholder="Unité(s)"
                      />
                      {showSaleUnitSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {uoms.filter((u: any) =>
                            u.name.toLowerCase().includes(formData.saleUnit.toLowerCase()) ||
                            u.code.toLowerCase().includes(formData.saleUnit.toLowerCase())
                          ).length > 0 ? (
                            uoms
                              .filter((u: any) =>
                                u.name.toLowerCase().includes(formData.saleUnit.toLowerCase()) ||
                                u.code.toLowerCase().includes(formData.saleUnit.toLowerCase())
                              )
                              .map((uom: any) => (
                                <div
                                  key={uom.id}
                                  onClick={() => {
                                    setFormData({ ...formData, saleUnit: uom.name });
                                    setShowSaleUnitSearch(false);
                                  }}
                                  className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                >
                                  <div className="font-medium text-slate-800">{uom.name}</div>
                                  <div className="text-xs text-slate-500">{uom.code} - {uom.category}</div>
                                </div>
                              ))
                          ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              {uoms.length === 0 ? 'No units configured' : 'Type to create custom unit'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Taxe
                    </label>
                    <div className="relative" ref={saleTaxSearchRef}>
                      <input
                        type="text"
                        value={formData.saleTax}
                        onChange={(e) => {
                          setFormData({ ...formData, saleTax: e.target.value });
                          setShowSaleTaxSearch(true);
                        }}
                        onFocus={() => setShowSaleTaxSearch(true)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        placeholder="20"
                      />
                      {showSaleTaxSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {taxRates.length > 0 ? (
                            taxRates.map((tax: any) => (
                              <div
                                key={tax.name}
                                onClick={() => {
                                  setFormData({ ...formData, saleTax: tax.rate.toString() });
                                  setShowSaleTaxSearch(false);
                                }}
                                className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                              >
                                <div className="font-medium text-slate-800">{tax.name}</div>
                                <div className="text-sm text-slate-500">{tax.rate}%</div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              No tax rates configured
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {parseFloat(formData.saleTax) > 0 && formData.price && (
                  <p className="mt-2 text-sm text-slate-600">
                    Prix TTC: {(parseFloat(formData.price) * (1 + parseFloat(formData.saleTax) / 100)).toFixed(2)} DH par {formData.saleUnit}
                  </p>
                )}
              </div>

              {/* Cost Price Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-3">Prix d'achat</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Prix <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-500 text-sm">DH</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Unité
                    </label>
                    <div className="relative" ref={purchaseUnitSearchRef}>
                      <input
                        type="text"
                        value={formData.purchaseUnit}
                        onChange={(e) => {
                          setFormData({ ...formData, purchaseUnit: e.target.value });
                          setShowPurchaseUnitSearch(true);
                        }}
                        onFocus={() => setShowPurchaseUnitSearch(true)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        placeholder="Unité(s)"
                      />
                      {showPurchaseUnitSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {uoms.filter((u: any) =>
                            u.name.toLowerCase().includes(formData.purchaseUnit.toLowerCase()) ||
                            u.code.toLowerCase().includes(formData.purchaseUnit.toLowerCase())
                          ).length > 0 ? (
                            uoms
                              .filter((u: any) =>
                                u.name.toLowerCase().includes(formData.purchaseUnit.toLowerCase()) ||
                                u.code.toLowerCase().includes(formData.purchaseUnit.toLowerCase())
                              )
                              .map((uom: any) => (
                                <div
                                  key={uom.id}
                                  onClick={() => {
                                    setFormData({ ...formData, purchaseUnit: uom.name });
                                    setShowPurchaseUnitSearch(false);
                                  }}
                                  className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                >
                                  <div className="font-medium text-slate-800">{uom.name}</div>
                                  <div className="text-xs text-slate-500">{uom.code} - {uom.category}</div>
                                </div>
                              ))
                          ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              {uoms.length === 0 ? 'No units configured' : 'Type to create custom unit'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Taxe
                    </label>
                    <div className="relative" ref={purchaseTaxSearchRef}>
                      <input
                        type="text"
                        value={formData.purchaseTax}
                        onChange={(e) => {
                          setFormData({ ...formData, purchaseTax: e.target.value });
                          setShowPurchaseTaxSearch(true);
                        }}
                        onFocus={() => setShowPurchaseTaxSearch(true)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        placeholder="20"
                      />
                      {showPurchaseTaxSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {taxRates.length > 0 ? (
                            taxRates.map((tax: any) => (
                              <div
                                key={tax.name}
                                onClick={() => {
                                  setFormData({ ...formData, purchaseTax: tax.rate.toString() });
                                  setShowPurchaseTaxSearch(false);
                                }}
                                className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                              >
                                <div className="font-medium text-slate-800">{tax.name}</div>
                                <div className="text-sm text-slate-500">{tax.rate}%</div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              No tax rates configured
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Pricing Fields */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prix minimum
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minPrice}
                      onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500">DH</span>
                  </div>
                </div>
              </div>

              {/* Margin Preview */}
              {formData.price && formData.cost && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Analyse de marge</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Montant de la marge</p>
                      <p className="text-lg font-bold text-slate-900">
                        {(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)} DH
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Marge %</p>
                      <p className="text-lg font-bold text-green-600">
                        {parseFloat(formData.cost) > 0
                          ? (((parseFloat(formData.price) - parseFloat(formData.cost)) /
                              parseFloat(formData.cost)) *
                              100
                            ).toFixed(2)
                          : '0.00'}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Markup %</p>
                      <p className="text-lg font-bold text-blue-600">
                        {parseFloat(formData.price) > 0
                          ? (((parseFloat(formData.price) - parseFloat(formData.cost)) /
                              parseFloat(formData.price)) *
                              100
                            ).toFixed(2)
                          : '0.00'}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="px-6 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Correction Modal */}
      {showStockCorrection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Correction du stock</h2>
              <p className="text-sm text-slate-600 mt-1">
                Pour le produit {product.code || product.name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {warehouses.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800 mb-2">
                    <strong>Aucun entrepôt disponible.</strong>
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    Vous devez créer au moins un entrepôt pour gérer le stock.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open('/warehouses', '_blank')}
                    className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                  >
                    Créer un entrepôt →
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Entrepôt <span className="text-red-500">*</span>
                </label>
                <select
                  value={stockCorrectionData.warehouseId}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, warehouseId: e.target.value })
                  }
                  disabled={warehouses.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {warehousesLoading 
                      ? 'Chargement...' 
                      : warehouses.length === 0 
                        ? 'Aucun entrepôt - Veuillez en créer un' 
                        : 'Sélectionner un entrepôt'}
                  </option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                {warehouses.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {warehouses.length} entrepôt(s) disponible(s)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ajouter/Supprimer <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={stockCorrectionData.operation === 'add'}
                      onChange={() =>
                        setStockCorrectionData({ ...stockCorrectionData, operation: 'add' })
                      }
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm">Ajouter</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={stockCorrectionData.operation === 'remove'}
                      onChange={() =>
                        setStockCorrectionData({ ...stockCorrectionData, operation: 'remove' })
                      }
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm">Supprimer</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de pièces <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockCorrectionData.quantity}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prix d'achat unitaire
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={stockCorrectionData.unitPrice}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, unitPrice: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Libellé du mouvement
                </label>
                <input
                  type="text"
                  value={stockCorrectionData.notes}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, notes: e.target.value })
                  }
                  placeholder={`Correction du stock pour le produit ${product.code || product.name}`}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600">Code mouvement ou inventaire</p>
                <p className="text-sm font-mono text-slate-900">
                  {new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowStockCorrection(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleStockCorrection}
                disabled={
                  !stockCorrectionData.warehouseId ||
                  !stockCorrectionData.quantity ||
                  stockCorrectionMutation.isPending
                }
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
              >
                {stockCorrectionMutation.isPending ? 'En cours...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showStockTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Transfert de stock</h2>
              <p className="text-sm text-slate-600 mt-1">
                Pour le produit {product.code || product.name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {warehouses.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800 mb-2">
                    <strong>Aucun entrepôt disponible.</strong>
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    Vous devez créer au moins deux entrepôts pour transférer le stock.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open('/warehouses', '_blank')}
                    className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                  >
                    Créer un entrepôt →
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Entrepôt source <span className="text-red-500">*</span>
                </label>
                <select
                  value={stockTransferData.sourceWarehouseId}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, sourceWarehouseId: e.target.value })
                  }
                  disabled={warehouses.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {warehousesLoading 
                      ? 'Chargement...' 
                      : warehouses.length === 0 
                        ? 'Aucun entrepôt - Veuillez en créer un' 
                        : "Sélectionner l'entrepôt source"}
                  </option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Entrepôt destination <span className="text-red-500">*</span>
                </label>
                <select
                  value={stockTransferData.destWarehouseId}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, destWarehouseId: e.target.value })
                  }
                  disabled={warehouses.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {warehousesLoading 
                      ? 'Chargement...' 
                      : warehouses.length === 0 
                        ? 'Aucun entrepôt - Veuillez en créer un' 
                        : "Sélectionner l'entrepôt destination"}
                  </option>
                  {warehouses
                    .filter((wh) => wh.id.toString() !== stockTransferData.sourceWarehouseId)
                    .map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de pièces <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockTransferData.quantity}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Libellé du mouvement
                </label>
                <input
                  type="text"
                  value={stockTransferData.notes}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, notes: e.target.value })
                  }
                  placeholder={`Transfert de stock du produit ${product.code || product.name} dans un autre entrepôt`}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600">Code mouvement ou inventaire</p>
                <p className="text-sm font-mono text-slate-900">
                  {new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowStockTransfer(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleStockTransfer}
                disabled={
                  !stockTransferData.sourceWarehouseId ||
                  !stockTransferData.destWarehouseId ||
                  !stockTransferData.quantity ||
                  stockTransferMutation.isPending
                }
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
              >
                {stockTransferMutation.isPending ? 'En cours...' : 'Transférer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
