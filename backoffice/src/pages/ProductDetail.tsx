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
import { ImageUpload } from '../components/ImageUpload';
import { Package, ArrowLeft, Save, Plus, ArrowRightLeft, Edit2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { toastSuccess, toastUpdated, toastDeleted, toastError } from '../services/toast.service';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';
import { useLanguage } from '../context/LanguageContext';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { RadioButton } from 'primereact/radiobutton';

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' };
const dropdownItemStyle: React.CSSProperties = { padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' };
const dropdownContainerStyle: React.CSSProperties = { position: 'absolute', zIndex: 10, width: '100%', marginTop: '0.25rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '15rem', overflowY: 'auto' };

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'info' | 'stock' | 'pricing'>('info');
  const [isEditing, setIsEditing] = useState(true);
  const [showStockCorrection, setShowStockCorrection] = useState(false);
  const [showStockTransfer, setShowStockTransfer] = useState(false);

  const [formData, setFormData] = useState({
    name: '', code: '', description: '', price: '', cost: '', minPrice: '',
    saleTax: '20', purchaseTax: '20', saleUnit: 'Unité(s)', purchaseUnit: 'Unité(s)',
    categoryIds: [] as number[], warehouseId: '', isService: false, isEnabled: true, isPriceChangeAllowed: true,
  });

  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleImageModeChange = (mode: 'file' | 'url') => { setShowUrlInput(mode === 'url'); };

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => { const n = { ...prev }; delete n[fieldName]; return n; });
    }
  };

  const handleRegenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const uniqueCode = await generateUniqueProductCode();
      setFormData(prev => ({ ...prev, code: uniqueCode }));
      clearFieldError('code');
      toastSuccess(t('newUniqueCodeGenerated'));
    } catch (error) {
      console.error('Failed to generate unique code:', error);
      toastError(t('failedToGenerateUniqueCode'));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleSaveImageUrl = async () => {
    if (!imageUrlInput.trim() || !id) return;
    try {
      await updateMutation.mutateAsync({ imageUrl: imageUrlInput.trim() });
      setImageUrlInput('');
      setShowUrlInput(false);
      toastUpdated(t('imageUrlSavedSuccessfully'));
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    } catch (error) {
      toastError(t('failedToSaveImageUrl'));
    }
  };

  const [stockCorrectionData, setStockCorrectionData] = useState({
    warehouseId: '', quantity: '', operation: 'add' as 'add' | 'remove', unitPrice: '', notes: '',
  });

  const [stockTransferData, setStockTransferData] = useState({
    sourceWarehouseId: '', destWarehouseId: '', quantity: '', notes: '',
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsService.getProduct(Number(id)),
    enabled: !!id,
  });

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

  const [showWarehouseSearch, setShowWarehouseSearch] = useState(false);
  const [warehouseSearchTerm, setWarehouseSearchTerm] = useState('');
  const [showCategorySearch, setShowCategorySearch] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showSaleUnitSearch, setShowSaleUnitSearch] = useState(false);
  const [showPurchaseUnitSearch, setShowPurchaseUnitSearch] = useState(false);
  const [showSaleTaxSearch, setShowSaleTaxSearch] = useState(false);
  const [showPurchaseTaxSearch, setShowPurchaseTaxSearch] = useState(false);

  const warehouseSearchRef = useRef<HTMLDivElement>(null);
  const categorySearchRef = useRef<HTMLDivElement>(null);
  const saleUnitSearchRef = useRef<HTMLDivElement>(null);
  const purchaseUnitSearchRef = useRef<HTMLDivElement>(null);
  const saleTaxSearchRef = useRef<HTMLDivElement>(null);
  const purchaseTaxSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (warehouseSearchRef.current && !warehouseSearchRef.current.contains(event.target as Node)) setShowWarehouseSearch(false);
      if (categorySearchRef.current && !categorySearchRef.current.contains(event.target as Node)) setShowCategorySearch(false);
      if (saleUnitSearchRef.current && !saleUnitSearchRef.current.contains(event.target as Node)) setShowSaleUnitSearch(false);
      if (purchaseUnitSearchRef.current && !purchaseUnitSearchRef.current.contains(event.target as Node)) setShowPurchaseUnitSearch(false);
      if (saleTaxSearchRef.current && !saleTaxSearchRef.current.contains(event.target as Node)) setShowSaleTaxSearch(false);
      if (purchaseTaxSearchRef.current && !purchaseTaxSearchRef.current.contains(event.target as Node)) setShowPurchaseTaxSearch(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: stockQuants = [] } = useQuery({
    queryKey: ['stock-quants', id],
    queryFn: () => stockService.getProductStock(Number(id)),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => productsService.updateProduct(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditing(false);
      toastUpdated(t('productUpdatedSuccessfully'));
    },
    onError: (error: any) => { toastError(error.message || t('failedToUpdateProduct')); },
  });

  const stockCorrectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const movement = await stockService.createMovement({
        movementType: 'adjustment', productId: Number(id),
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
      setStockCorrectionData({ warehouseId: '', quantity: '', operation: 'add', unitPrice: '', notes: '' });
      toastUpdated(t('stockCorrectedSuccessfully'));
    },
    onError: (error: any) => { toastError(error.message || t('failedToCorrectStock')); },
  });

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
      setStockTransferData({ sourceWarehouseId: '', destWarehouseId: '', quantity: '', notes: '' });
      toastUpdated(t('stockTransferredSuccessfully'));
    },
    onError: (error: any) => { toastError(error.message || t('failedToTransferStock')); },
  });

  useEffect(() => {
    if (product) {
      const productCategories = (product as any).categories || [];
      const categoryIdsFromProduct = productCategories.map((c: any) => c.id);
      const saleUnitName = (product as any).saleUnitOfMeasure?.name || '';
      const purchaseUnitName = (product as any).purchaseUnitOfMeasure?.name || '';
      setFormData({
        name: product.name, code: product.code || '', description: product.description || '',
        price: product.price.toString(), cost: product.cost.toString(), minPrice: product.minPrice.toString(),
        saleTax: product.saleTax?.toString() || '20', purchaseTax: product.purchaseTax?.toString() || '20',
        saleUnit: saleUnitName, purchaseUnit: purchaseUnitName,
        categoryIds: categoryIdsFromProduct, warehouseId: product.warehouseId?.toString() || '',
        isService: product.isService, isEnabled: product.isEnabled, isPriceChangeAllowed: product.isPriceChangeAllowed,
      });
      setSelectedCategories(productCategories);
      if (product.warehouseId) {
        const warehouseFromProduct = (product as any).warehouse;
        const warehouse = warehouseFromProduct || warehouses.find((w: any) => w.id === product.warehouseId);
        if (warehouse) { setSelectedWarehouse(warehouse); setWarehouseSearchTerm(`${warehouse.name} (${warehouse.code})`); }
      } else { setSelectedWarehouse(null); setWarehouseSearchTerm(''); }
    }
  }, [product, warehouses]);

  const handleSave = () => {
    const errors = validateProductForm(formData, false);
    setValidationErrors(errors);
    if (hasValidationErrors(errors)) { const firstError = getFirstError(errors); if (firstError) toastError(firstError); return; }
    const saleUom = uoms.find((u: any) => u.name === formData.saleUnit);
    const purchaseUom = uoms.find((u: any) => u.name === formData.purchaseUnit);
    updateMutation.mutate({
      name: formData.name, code: formData.code || null, description: formData.description || null,
      price: parseFloat(formData.price), cost: parseFloat(formData.cost), minPrice: parseFloat(formData.minPrice),
      saleTax: parseFloat(formData.saleTax), purchaseTax: parseFloat(formData.purchaseTax),
      warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
      categoryIds: formData.categoryIds, isService: formData.isService, isEnabled: formData.isEnabled,
      isPriceChangeAllowed: formData.isPriceChangeAllowed, saleUnitId: saleUom?.id || null, purchaseUnitId: purchaseUom?.id || null,
    });
  };

  const handleStockCorrection = () => { stockCorrectionMutation.mutate(stockCorrectionData); };
  const handleStockTransfer = () => { stockTransferMutation.mutate(stockTransferData); };

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '3rem' }}>
          <div className="animate-spin" style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '4px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '9999px' }}></div>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '3rem' }}>
          <p style={{ color: '#64748b' }}>Product not found</p>
        </div>
      </AdminLayout>
    );
  }

  const totalStock = stockQuants.reduce((sum, sq) => sum + parseFloat(sq.quantity?.toString() || '0'), 0).toFixed(2);

  const warehouseOptions = warehouses.map((wh) => ({ label: wh.name, value: wh.id.toString() }));
  const sourceWarehouseOptions = warehouses.map((wh) => ({ label: wh.name, value: wh.id.toString() }));
  const destWarehouseOptions = warehouses
    .filter((wh) => wh.id.toString() !== stockTransferData.sourceWarehouseId)
    .map((wh) => ({ label: wh.name, value: wh.id.toString() }));

  return (
    <AdminLayout>
      {/* Compact Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button
              icon={<ArrowLeft style={{ width: '1.25rem', height: '1.25rem' }} />}
              onClick={() => navigate('/products')}
              text rounded
            />
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>{product.name}</h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{product.code || t('noCode')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Tabs */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingLeft: '1rem', paddingRight: '1rem' }}>
          {(['info', 'pricing', 'stock'] as const).map((tab) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              label={tab === 'info' ? 'Information' : tab === 'pricing' ? 'Tarification' : 'Stock'}
              badge={tab === 'stock' ? String(totalStock) : undefined}
              text
              style={{
                paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.625rem', paddingBottom: '0.625rem',
                fontSize: '0.875rem', fontWeight: 500, position: 'relative', borderRadius: 0,
                ...(activeTab === tab
                  ? { color: '#d97706', borderBottom: '2px solid #d97706' }
                  : { color: '#475569' }),
              }}
            />
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '1rem' }}>
          {/* Product Info Tab */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>{t('basicInformation')}</h3>

                {/* Image + Name/Code Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    {id && (
                      <ImageUpload
                        productId={Number(id)}
                        currentImage={(product as any)?.imageUrl}
                        onImageUpload={(url, publicId) => { queryClient.invalidateQueries({ queryKey: ['product', id] }); toastUpdated(t('imageUpdatedSuccessfully')); }}
                        onImageRemove={() => { queryClient.invalidateQueries({ queryKey: ['product', id] }); toastDeleted(t('imageRemovedSuccessfully')); }}
                        folder="products"
                        maxSizeMB={5}
                        onModeChange={handleImageModeChange}
                      />
                    )}
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={labelStyle}>{t('productName')} *</label>
                        <InputText type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('enterProductName')} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={labelStyle}>{t('productCodeEAN13')}</label>
                        {validationErrors.code && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{validationErrors.code}</p>}
                        <div style={{ position: 'relative' }}>
                          <InputText type="text" value={formData.code} onChange={(e) => { setFormData({ ...formData, code: e.target.value }); clearFieldError('code'); }} placeholder={t('eanBarcodeePlaceholder')} maxLength={13} style={{ width: '100%' }} />
                          {!validationErrors.code && formData.code && <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>{t('eanBarcodeHint')}</p>}
                          <Button
                            type="button"
                            icon={<RefreshCw className={isGeneratingCode ? 'animate-spin' : ''} style={{ width: '0.75rem', height: '0.75rem' }} />}
                            label={isGeneratingCode ? t('generating') : t('generateCode')}
                            onClick={handleRegenerateCode}
                            disabled={isGeneratingCode}
                            text
                            style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#d97706', padding: '0.125rem 0' }}
                            title={t('generateNewUniqueCode')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image URL Input */}
                {showUrlInput && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>{t('imageUrl')}</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <InputText type="text" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder={t('exampleImageUrl')} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveImageUrl(); } }} style={{ flex: 1 }} />
                      <Button type="button" onClick={handleSaveImageUrl} disabled={!imageUrlInput.trim() || updateMutation.isPending} label={t('saveUrl')} />
                    </div>
                  </div>
                )}

                {/* Warehouse and Categories */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
                  <div>
                    <label style={labelStyle}>{t('warehouse')} *</label>
                    <div style={{ position: 'relative' }} ref={warehouseSearchRef}>
                      <InputText type="text" value={warehouseSearchTerm} onChange={(e) => { setWarehouseSearchTerm(e.target.value); setShowWarehouseSearch(true); }} onFocus={() => setShowWarehouseSearch(true)} placeholder={t('selectOrSearchWarehouse')} style={{ width: '100%' }} />
                      {showWarehouseSearch && (
                        <div style={dropdownContainerStyle}>
                          {warehouses.filter((w: any) => w.name.toLowerCase().includes(warehouseSearchTerm.toLowerCase()) || w.code?.toLowerCase().includes(warehouseSearchTerm.toLowerCase())).length > 0 ? (
                            warehouses.filter((w: any) => w.name.toLowerCase().includes(warehouseSearchTerm.toLowerCase()) || w.code?.toLowerCase().includes(warehouseSearchTerm.toLowerCase())).map((warehouse: any) => (
                              <div key={warehouse.id} onClick={() => { setSelectedWarehouse(warehouse); setFormData({ ...formData, warehouseId: warehouse.id.toString() }); setWarehouseSearchTerm(`${warehouse.name} (${warehouse.code})`); setShowWarehouseSearch(false); }} style={dropdownItemStyle}>
                                <div style={{ fontWeight: 500, color: '#1e293b' }}>{warehouse.name}</div>
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{warehouse.code}</div>
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{t('noWarehousesFound')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>{t('categories')}</label>
                    <div style={{ position: 'relative' }} ref={categorySearchRef}>
                      <div style={{ width: '100%', minHeight: '42px', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                        {selectedCategories.map((category: any) => (
                          <span key={category.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '9999px', fontSize: '0.875rem' }}>
                            {category.name}
                            <Button type="button" label="×" onClick={() => { setSelectedCategories(selectedCategories.filter((c: any) => c.id !== category.id)); setFormData({ ...formData, categoryIds: formData.categoryIds.filter((cid: number) => cid !== category.id) }); }} text style={{ color: '#92400e', padding: '0 0.25rem', minWidth: 'unset', lineHeight: 1 }} />
                          </span>
                        ))}
                        <InputText value={categorySearchTerm} onChange={(e) => { setCategorySearchTerm(e.target.value); setShowCategorySearch(true); }} onFocus={() => setShowCategorySearch(true)} style={{ flex: 1, minWidth: '120px', outline: 'none', border: 'none', boxShadow: 'none', padding: '0' }} placeholder={selectedCategories.length === 0 ? t('typeToSearchAndAddCategories') : ""} />
                      </div>
                      {showCategorySearch && (
                        <div style={dropdownContainerStyle}>
                          {categories.filter((c: any) => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) && !formData.categoryIds.includes(c.id)).length > 0 ? (
                            categories.filter((c: any) => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) && !formData.categoryIds.includes(c.id)).map((category: any) => (
                              <div key={category.id} onClick={() => { setSelectedCategories([...selectedCategories, category]); setFormData({ ...formData, categoryIds: [...formData.categoryIds, category.id] }); setCategorySearchTerm(''); setShowCategorySearch(false); }} style={dropdownItemStyle}>
                                <div style={{ fontWeight: 500, color: '#1e293b' }}>{category.name}</div>
                                {category.description && <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{category.description}</div>}
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{categorySearchTerm ? t('noCategoriesFound') : t('startTypingToSearchCategories')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <label style={labelStyle}>{t('description')}</label>
                  <InputTextarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} placeholder={t('enterProductDescription')} style={{ width: '100%' }} />
                </div>
              </div>

              {/* Product Options */}
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>{t('options')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Checkbox checked={formData.isService} onChange={() => setFormData({ ...formData, isService: !formData.isService })} />
                    <label style={{ fontSize: '0.875rem', color: '#0f172a' }}>{t('isService')}</label>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '2rem' }}>{t('serviceDescription')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Checkbox checked={formData.isEnabled} onChange={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })} />
                    <label style={{ fontSize: '0.875rem', color: '#0f172a' }}>{t('enabled')}</label>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '2rem' }}>{t('enabledDescription')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Checkbox checked={formData.isPriceChangeAllowed} onChange={() => setFormData({ ...formData, isPriceChangeAllowed: !formData.isPriceChangeAllowed })} />
                    <label style={{ fontSize: '0.875rem', color: '#0f172a' }}>{t('allowPriceChange')}</label>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '2rem' }}>{t('allowPriceChangeDescription')}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button type="button" outlined onClick={() => navigate('/products')} label="Cancel" />
                <Button type="button" onClick={handleSave} loading={updateMutation.isPending} icon={<Save style={{ width: '1rem', height: '1rem' }} />} label={t('saveChanges')} />
              </div>
            </div>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>{t('stockManagement')}</h3>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button onClick={() => setShowStockCorrection(true)} icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label={t('correctStock')} />
                  <Button onClick={() => setShowStockTransfer(true)} icon={<ArrowRightLeft style={{ width: '1rem', height: '1rem' }} />} label={t('transferStock')} severity="help" />
                </div>
              </div>

              {/* Stock Table */}
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                <table style={{ width: '100%' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('location')}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('onHand')}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('reserved')}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('available')}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('incoming')}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('outgoing')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockQuants.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>{t('noStockRecordsFound')}</td></tr>
                    ) : (
                      stockQuants.map((sq) => (
                        <tr key={sq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#0f172a' }}>{sq.warehouse?.name || t('unknown')}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#0f172a', textAlign: 'right', fontWeight: 500 }}>{parseFloat(sq.quantity.toString()).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#d97706', textAlign: 'right' }}>{parseFloat(sq.reservedQuantity.toString()).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#16a34a', textAlign: 'right', fontWeight: 500 }}>{parseFloat(sq.availableQuantity.toString()).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2563eb', textAlign: 'right' }}>{parseFloat(sq.incomingQuantity.toString()).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#ea580c', textAlign: 'right' }}>{parseFloat(sq.outgoingQuantity.toString()).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <tr>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{t('total')}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>{stockQuants.reduce((sum, sq) => sum + parseFloat(sq.quantity?.toString() || '0'), 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#d97706', textAlign: 'right' }}>{stockQuants.reduce((sum, sq) => sum + parseFloat(sq.reservedQuantity?.toString() || '0'), 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#16a34a', textAlign: 'right' }}>{stockQuants.reduce((sum, sq) => sum + parseFloat(sq.availableQuantity?.toString() || '0'), 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#2563eb', textAlign: 'right' }}>{stockQuants.reduce((sum, sq) => sum + parseFloat(sq.incomingQuantity?.toString() || '0'), 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#ea580c', textAlign: 'right' }}>{stockQuants.reduce((sum, sq) => sum + parseFloat(sq.outgoingQuantity?.toString() || '0'), 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>{t('pricing')}</h3>

              {/* Sale Price */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontWeight: 500, color: '#0f172a', marginBottom: '0.75rem' }}>{t('salePrice')}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>{t('price')} *</label>
                    <div style={{ position: 'relative' }}>
                      <InputText type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} disabled={!isEditing} placeholder={t('numericPlaceholder')} style={{ width: '100%' }} />
                      <span style={{ position: 'absolute', top: '0.625rem', color: '#64748b', fontSize: '0.875rem', ...(language === 'ar' ? { left: '0.75rem' } : { right: '0.75rem' }) }}>{language === 'ar' ? 'د.م' : 'DH'}</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('unit')}</label>
                    <div style={{ position: 'relative' }} ref={saleUnitSearchRef}>
                      <InputText type="text" value={formData.saleUnit} onChange={(e) => { setFormData({ ...formData, saleUnit: e.target.value }); setShowSaleUnitSearch(true); }} onFocus={() => setShowSaleUnitSearch(true)} placeholder={t('unit')} style={{ width: '100%' }} />
                      {showSaleUnitSearch && (
                        <div style={dropdownContainerStyle}>
                          {uoms.filter((u: any) => u.name.toLowerCase().includes(formData.saleUnit.toLowerCase()) || u.code.toLowerCase().includes(formData.saleUnit.toLowerCase())).length > 0 ? (
                            uoms.filter((u: any) => u.name.toLowerCase().includes(formData.saleUnit.toLowerCase()) || u.code.toLowerCase().includes(formData.saleUnit.toLowerCase())).map((uom: any) => (
                              <div key={uom.id} onClick={() => { setFormData({ ...formData, saleUnit: uom.name }); setShowSaleUnitSearch(false); }} style={dropdownItemStyle}>
                                <div style={{ fontWeight: 500, color: '#1e293b' }}>{uom.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{uom.code} - {uom.category}</div>
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{uoms.length === 0 ? 'No units configured' : 'Type to create custom unit'}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('tax')}</label>
                    <div style={{ position: 'relative' }} ref={saleTaxSearchRef}>
                      <InputText type="text" value={formData.saleTax} onChange={(e) => { setFormData({ ...formData, saleTax: e.target.value }); setShowSaleTaxSearch(true); }} onFocus={() => setShowSaleTaxSearch(true)} placeholder={t('taxPlaceholder')} style={{ width: '100%' }} />
                      {showSaleTaxSearch && (
                        <div style={dropdownContainerStyle}>
                          {taxRates.length > 0 ? taxRates.map((tax: any) => (
                            <div key={tax.name} onClick={() => { setFormData({ ...formData, saleTax: tax.rate.toString() }); setShowSaleTaxSearch(false); }} style={dropdownItemStyle}>
                              <div style={{ fontWeight: 500, color: '#1e293b' }}>{tax.name}</div>
                              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{tax.rate}%</div>
                            </div>
                          )) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{t('noTaxRatesConfigured')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {parseFloat(formData.saleTax) > 0 && formData.price && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                    {t('priceWithTax')}: {(parseFloat(formData.price) * (1 + parseFloat(formData.saleTax) / 100)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'} par {formData.saleUnit}
                  </p>
                )}
              </div>

              {/* Cost Price */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontWeight: 500, color: '#0f172a', marginBottom: '0.75rem' }}>{t('costPrice')}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>{t('price')} *</label>
                    <div style={{ position: 'relative' }}>
                      <InputText type="number" step="0.01" min="0" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} placeholder={t('numericPlaceholder')} style={{ width: '100%' }} />
                      <span style={{ position: 'absolute', top: '0.625rem', color: '#64748b', fontSize: '0.875rem', ...(language === 'ar' ? { left: '0.75rem' } : { right: '0.75rem' }) }}>{language === 'ar' ? 'د.م' : 'DH'}</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('unitLabel')}</label>
                    <div style={{ position: 'relative' }} ref={purchaseUnitSearchRef}>
                      <InputText type="text" value={formData.purchaseUnit} onChange={(e) => { setFormData({ ...formData, purchaseUnit: e.target.value }); setShowPurchaseUnitSearch(true); }} onFocus={() => setShowPurchaseUnitSearch(true)} placeholder={t('unit')} style={{ width: '100%' }} />
                      {showPurchaseUnitSearch && (
                        <div style={dropdownContainerStyle}>
                          {uoms.filter((u: any) => u.name.toLowerCase().includes(formData.purchaseUnit.toLowerCase()) || u.code.toLowerCase().includes(formData.purchaseUnit.toLowerCase())).length > 0 ? (
                            uoms.filter((u: any) => u.name.toLowerCase().includes(formData.purchaseUnit.toLowerCase()) || u.code.toLowerCase().includes(formData.purchaseUnit.toLowerCase())).map((uom: any) => (
                              <div key={uom.id} onClick={() => { setFormData({ ...formData, purchaseUnit: uom.name }); setShowPurchaseUnitSearch(false); }} style={dropdownItemStyle}>
                                <div style={{ fontWeight: 500, color: '#1e293b' }}>{uom.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{uom.code} - {uom.category}</div>
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{uoms.length === 0 ? 'No units configured' : 'Type to create custom unit'}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('tax')}</label>
                    <div style={{ position: 'relative' }} ref={purchaseTaxSearchRef}>
                      <InputText type="text" value={formData.purchaseTax} onChange={(e) => { setFormData({ ...formData, purchaseTax: e.target.value }); setShowPurchaseTaxSearch(true); }} onFocus={() => setShowPurchaseTaxSearch(true)} placeholder={t('taxPlaceholder')} style={{ width: '100%' }} />
                      {showPurchaseTaxSearch && (
                        <div style={dropdownContainerStyle}>
                          {taxRates.length > 0 ? taxRates.map((tax: any) => (
                            <div key={tax.name} onClick={() => { setFormData({ ...formData, purchaseTax: tax.rate.toString() }); setShowPurchaseTaxSearch(false); }} style={dropdownItemStyle}>
                              <div style={{ fontWeight: 500, color: '#1e293b' }}>{tax.name}</div>
                              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{tax.rate}%</div>
                            </div>
                          )) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{t('noTaxRatesConfigured')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Min Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>{t('minPrice')}</label>
                  <div style={{ position: 'relative' }}>
                    <InputText type="number" step="0.01" min="0" value={formData.minPrice} onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })} disabled={!isEditing} placeholder={t('numericPlaceholder')} style={{ width: '100%' }} />
                    <span style={{ position: 'absolute', top: '0.625rem', color: '#64748b', ...(language === 'ar' ? { left: '0.75rem' } : { right: '0.75rem' }) }}>{language === 'ar' ? 'د.م' : 'DH'}</span>
                  </div>
                </div>
              </div>

              {/* Margin Preview */}
              {formData.price && formData.cost && (
                <div style={{ background: 'linear-gradient(to right, #fffbeb, #fff7ed)', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '1rem' }}>
                  <h4 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>{t('marginAnalysis')}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: '#475569' }}>{t('marginAmount')}</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{(parseFloat(formData.price) - parseFloat(formData.cost)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: '#475569' }}>{t('marginPercent')}</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#16a34a' }}>{parseFloat(formData.cost) > 0 ? (((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.cost)) * 100).toFixed(2) : '0.00'}%</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: '#475569' }}>{t('markupPercent')}</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb' }}>{parseFloat(formData.price) > 0 ? (((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(2) : '0.00'}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button type="button" outlined onClick={() => navigate('/products')} label="Cancel" />
                <Button type="button" onClick={handleSave} loading={updateMutation.isPending} icon={<Save style={{ width: '1rem', height: '1rem' }} />} label={t('saveChanges')} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Correction Modal */}
      {showStockCorrection && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', maxWidth: '32rem', width: '100%' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Correction du stock</h2>
              <p style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.25rem' }}>Pour le produit {product.code || product.name}</p>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {warehouses.length === 0 && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem' }}><strong>Aucun entrepôt disponible.</strong></p>
                  <p style={{ fontSize: '0.75rem', color: '#a16207', marginBottom: '0.75rem' }}>Vous devez créer au moins un entrepôt pour gérer le stock.</p>
                  <Button type="button" label="Créer un entrepôt →" onClick={() => window.open('/warehouses', '_blank')} style={{ fontSize: '0.75rem', backgroundColor: '#d97706', borderColor: '#d97706' }} />
                </div>
              )}

              <div>
                <label style={labelStyle}>Entrepôt *</label>
                <Dropdown
                  value={stockCorrectionData.warehouseId}
                  onChange={(e) => setStockCorrectionData({ ...stockCorrectionData, warehouseId: e.value })}
                  options={[{ label: warehousesLoading ? t('loading') : warehouses.length === 0 ? t('noWarehouseCreateOne') : t('selectWarehouse'), value: '' }, ...warehouseOptions]}
                  optionLabel="label"
                  optionValue="value"
                  disabled={warehouses.length === 0}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Ajouter/Supprimer *</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RadioButton inputId="op-add" value="add" checked={stockCorrectionData.operation === 'add'} onChange={() => setStockCorrectionData({ ...stockCorrectionData, operation: 'add' })} />
                    <span style={{ fontSize: '0.875rem' }}>{t('add')}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RadioButton inputId="op-remove" value="remove" checked={stockCorrectionData.operation === 'remove'} onChange={() => setStockCorrectionData({ ...stockCorrectionData, operation: 'remove' })} />
                    <span style={{ fontSize: '0.875rem' }}>{t('remove')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Nombre de pièces *</label>
                <InputText type="number" min="0" value={stockCorrectionData.quantity} onChange={(e) => setStockCorrectionData({ ...stockCorrectionData, quantity: e.target.value })} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={labelStyle}>Prix d'achat unitaire</label>
                <InputText type="number" step="0.01" min="0" value={stockCorrectionData.unitPrice} onChange={(e) => setStockCorrectionData({ ...stockCorrectionData, unitPrice: e.target.value })} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={labelStyle}>Libellé du mouvement</label>
                <InputText type="text" value={stockCorrectionData.notes} onChange={(e) => setStockCorrectionData({ ...stockCorrectionData, notes: e.target.value })} placeholder={`Correction du stock pour le produit ${product.code || product.name}`} style={{ width: '100%' }} />
              </div>

              <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#475569' }}>Code mouvement ou inventaire</p>
                <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#0f172a' }}>{new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}</p>
              </div>
            </div>
            <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem' }}>
              <Button outlined onClick={() => setShowStockCorrection(false)} label="Annuler" style={{ flex: 1 }} />
              <Button onClick={handleStockCorrection} disabled={!stockCorrectionData.warehouseId || !stockCorrectionData.quantity || stockCorrectionMutation.isPending} loading={stockCorrectionMutation.isPending} label={t('validate')} style={{ flex: 1 }} />
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showStockTransfer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', maxWidth: '32rem', width: '100%' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Transfert de stock</h2>
              <p style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.25rem' }}>Pour le produit {product.code || product.name}</p>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {warehouses.length === 0 && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem' }}><strong>Aucun entrepôt disponible.</strong></p>
                  <p style={{ fontSize: '0.75rem', color: '#a16207', marginBottom: '0.75rem' }}>Vous devez créer au moins deux entrepôts pour transférer le stock.</p>
                  <Button type="button" label="Créer un entrepôt →" onClick={() => window.open('/warehouses', '_blank')} style={{ fontSize: '0.75rem', backgroundColor: '#d97706', borderColor: '#d97706' }} />
                </div>
              )}

              <div>
                <label style={labelStyle}>Entrepôt source *</label>
                <Dropdown
                  value={stockTransferData.sourceWarehouseId}
                  onChange={(e) => setStockTransferData({ ...stockTransferData, sourceWarehouseId: e.value })}
                  options={[{ label: warehousesLoading ? t('loading') : warehouses.length === 0 ? t('noWarehouseCreateOne') : t('selectSourceWarehouse'), value: '' }, ...sourceWarehouseOptions]}
                  optionLabel="label"
                  optionValue="value"
                  disabled={warehouses.length === 0}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Entrepôt destination *</label>
                <Dropdown
                  value={stockTransferData.destWarehouseId}
                  onChange={(e) => setStockTransferData({ ...stockTransferData, destWarehouseId: e.value })}
                  options={[{ label: warehousesLoading ? t('loading') : warehouses.length === 0 ? t('noWarehouseCreateOne') : t('selectDestinationWarehouse'), value: '' }, ...destWarehouseOptions]}
                  optionLabel="label"
                  optionValue="value"
                  disabled={warehouses.length === 0}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Nombre de pièces *</label>
                <InputText type="number" min="0" value={stockTransferData.quantity} onChange={(e) => setStockTransferData({ ...stockTransferData, quantity: e.target.value })} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={labelStyle}>Libellé du mouvement</label>
                <InputText type="text" value={stockTransferData.notes} onChange={(e) => setStockTransferData({ ...stockTransferData, notes: e.target.value })} placeholder={`Transfert de stock du produit ${product.code || product.name} dans un autre entrepôt`} style={{ width: '100%' }} />
              </div>

              <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#475569' }}>Code mouvement ou inventaire</p>
                <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#0f172a' }}>{new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}</p>
              </div>
            </div>
            <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem' }}>
              <Button outlined onClick={() => setShowStockTransfer(false)} label="Annuler" style={{ flex: 1 }} />
              <Button onClick={handleStockTransfer} disabled={!stockTransferData.sourceWarehouseId || !stockTransferData.destWarehouseId || !stockTransferData.quantity || stockTransferMutation.isPending} loading={stockTransferMutation.isPending} label={t('transfer')} style={{ flex: 1 }} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
