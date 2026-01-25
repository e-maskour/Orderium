import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { productsService, validateProductForm, hasValidationErrors, getFirstError, ValidationErrors } from '../modules/products';
import { warehousesService } from '../modules/warehouses';
import { taxesService } from '../modules/taxes';
import { categoriesService } from '../modules/categories';
import { uomService } from '../modules/uom';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Package, Save, ArrowLeft, CheckSquare, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';

export default function ProductCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: warehouses = [] } = useQuery({
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

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    cost: '',
    minPrice: '',
    saleTax: '20',
    purchaseTax: '20',
    saleUnit: 'Units',
    purchaseUnit: 'Units',
    categoryIds: [] as number[],
    warehouseId: '',
    isService: false,
    isEnabled: true,
    isPriceChangeAllowed: true,
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Generate unique code on mount
  useEffect(() => {
    const generateCode = async () => {
      try {
        setIsGeneratingCode(true);
        const uniqueCode = await generateUniqueProductCode();
        setFormData(prev => ({ ...prev, code: uniqueCode }));
      } catch (error) {
        console.error('Failed to generate unique code:', error);
        toast.error('Failed to generate unique product code');
      } finally {
        setIsGeneratingCode(false);
      }
    };
    generateCode();
  }, []);

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

  // Set default UOM to "Units" when UOMs load
  useEffect(() => {
    if (uoms.length > 0 && formData.saleUnit === 'Units') {
      const defaultUom = uoms.find((u: any) => u.code === 'UNIT');
      if (defaultUom) {
        setFormData(prev => ({
          ...prev,
          saleUnit: defaultUom.name,
          purchaseUnit: defaultUom.name,
        }));
      }
    }
  }, [uoms]);

  const createMutation = useMutation({
    mutationFn: (data: any) => productsService.createProduct(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      // The result is { product: Product }
      navigate(`/products/${result.product.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const errors = validateProductForm(formData, true);
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

    createMutation.mutate({
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      minPrice: parseFloat(formData.minPrice || '0'),
      saleTax: parseFloat(formData.saleTax || '0'),
      purchaseTax: parseFloat(formData.purchaseTax || '0'),
      warehouseId: parseInt(formData.warehouseId),
      categoryIds: formData.categoryIds,
      isService: formData.isService,
      isEnabled: formData.isEnabled,
      isPriceChangeAllowed: formData.isPriceChangeAllowed,
      saleUnitId: saleUom?.id || null,
      purchaseUnitId: purchaseUom?.id || null,
    });
  };

  return (
    <AdminLayout>
      <PageHeader
        icon={Package}
        title="Create New Product"
        subtitle="Add a new product to your inventory"
        actions={
          <button
            onClick={() => navigate('/products')}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
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
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    clearFieldError('name');
                  }}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-amber-500 focus:ring-amber-500/20'
                  } focus:ring-2`}
                  placeholder="Enter product name"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
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
                    placeholder="Auto-generated EAN-13 barcode"
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
                      clearFieldError('warehouseId');
                    }}
                    onFocus={() => setShowWarehouseSearch(true)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      validationErrors.warehouseId ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-amber-500 focus:ring-amber-500/20'
                    } focus:ring-2`}
                    placeholder="Select or search warehouse"
                  />
                  {validationErrors.warehouseId && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.warehouseId}</p>
                  )}
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
                  {/* Selected categories chips */}
                  {formData.categoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.categoryIds.map((categoryId: number) => {
                        const category = categories.find((c: any) => c.id === categoryId);
                        if (!category) return null;
                        return (
                          <span
                            key={categoryId}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                          >
                            {category.name}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  categoryIds: formData.categoryIds.filter((id: number) => id !== categoryId)
                                });
                              }}
                              className="hover:text-amber-900"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <input
                    type="text"
                    value={categorySearchTerm}
                    onChange={(e) => {
                      setCategorySearchTerm(e.target.value);
                      setShowCategorySearch(true);
                    }}
                    onFocus={() => setShowCategorySearch(true)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    placeholder="Type to search and add categories"
                  />
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

          {/* Pricing Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Tarification</h3>
            
            {/* Sale Price Section */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
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
                      onChange={(e) => {
                        setFormData({ ...formData, price: e.target.value });
                        clearFieldError('price');
                      }}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        validationErrors.price ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-amber-500 focus:ring-amber-500/20'
                      } focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500 text-sm">DH</span>
                  </div>
                  {validationErrors.price && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.price}</p>
                  )}
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
            <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3">Prix d'achat</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prix
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost}
                      onChange={(e) => {
                        setFormData({ ...formData, cost: e.target.value });
                        clearFieldError('cost');
                      }}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        validationErrors.cost ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-amber-500 focus:ring-amber-500/20'
                      } focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500 text-sm">DH</span>
                  </div>
                  {validationErrors.cost && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.cost}</p>
                  )}
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500">DH</span>
                </div>
              </div>
            </div>

            {/* Margin Preview */}
            {formData.price && formData.cost && (
              <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
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
          </div>

          {/* Product Options Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Options</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <div
                  onClick={() => setFormData({ ...formData, isService: !formData.isService })}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
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
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
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
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
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
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
