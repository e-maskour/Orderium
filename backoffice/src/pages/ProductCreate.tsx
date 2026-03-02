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
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { ImageUpload } from '../components/ImageUpload';
import { Package, Save, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { toastCreated, toastSuccess, toastError } from '../services/toast.service';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';
import { useLanguage } from '../context/LanguageContext';

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' };
const dropdownItemStyle: React.CSSProperties = { padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' };
const dropdownContainerStyle: React.CSSProperties = { position: 'absolute', zIndex: 10, width: '100%', marginTop: '0.25rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '15rem', overflowY: 'auto' };

export default function ProductCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();

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

  const [imageData, setImageData] = useState<{ url: string; publicId: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formDirty, setFormDirty] = useState(false);

  useUnsavedChanges(formDirty);

  useEffect(() => {
    const generateCode = async () => {
      try {
        setIsGeneratingCode(true);
        const uniqueCode = await generateUniqueProductCode();
        setFormData(prev => ({ ...prev, code: uniqueCode }));
      } catch (error) {
        console.error('Failed to generate unique code:', error);
        toastError(t('failedToGenerateCode'));
      } finally {
        setIsGeneratingCode(false);
      }
    };
    generateCode();
  }, []);

  const handleRegenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const uniqueCode = await generateUniqueProductCode();
      setFormData(prev => ({ ...prev, code: uniqueCode }));
      clearFieldError('code');
      toastSuccess(t('newCodeGenerated'));
    } catch (error) {
      console.error('Failed to generate unique code:', error);
      toastError(t('failedToGenerateCodeRetry'));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

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
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (imageData && result.product?.id) {
        try {
          await productsService.updateProductImage(result.product.id, imageData.url, imageData.publicId);
        } catch (error) {
          console.warn('Could not verify image association:', error);
        }
      }
      toastCreated(t('productCreatedSuccess'));
      setFormDirty(false);
      navigate(`/products/${result.product.id}`);
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToCreateProduct'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateProductForm(formData, true);
    setValidationErrors(errors);
    if (hasValidationErrors(errors)) {
      const firstError = getFirstError(errors);
      if (firstError) toastError(firstError);
      return;
    }
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
        title={t('createNewProduct')}
        subtitle={t('addNewProductToInventory')}
        actions={
          <Button outlined onClick={() => navigate('/products')} icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />} label={t('backToProducts')} />
        }
      />

      <form onSubmit={handleSubmit} onChange={() => setFormDirty(true)}>
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Basic Info Section */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>{t('basicInformation')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>{t('productName')} *</label>
                {validationErrors.name && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{validationErrors.name}</p>}
                <InputText
                  type="text"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name'); }}
                  placeholder={t('enterProductName')}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={labelStyle}>{t('productCodeEAN13')}</label>
                {validationErrors.code && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{validationErrors.code}</p>}
                <div style={{ position: 'relative' }}>
                  <InputText
                    type="text"
                    value={formData.code}
                    onChange={(e) => { setFormData({ ...formData, code: e.target.value }); clearFieldError('code'); }}
                    placeholder={t('autoGeneratedBarcode')}
                    maxLength={13}
                    style={{ width: '100%' }}
                  />
                  {!validationErrors.code && formData.code && (
                    <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>{t('eanBarcodeHint')}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    disabled={isGeneratingCode}
                    style={{ marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#d97706', cursor: isGeneratingCode ? 'not-allowed' : 'pointer', opacity: isGeneratingCode ? 0.5 : 1, background: 'none', border: 'none' }}
                    title={t('generateNewUniqueCode')}
                  >
                    <RefreshCw className={isGeneratingCode ? 'animate-spin' : ''} style={{ width: '0.75rem', height: '0.75rem' }} />
                    {isGeneratingCode ? t('generating') : t('generateCode')}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
              <div>
                <label style={labelStyle}>{t('warehouse')} *</label>
                {validationErrors.warehouseId && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{validationErrors.warehouseId}</p>}
                <div style={{ position: 'relative' }} ref={warehouseSearchRef}>
                  <InputText
                    type="text"
                    value={warehouseSearchTerm}
                    onChange={(e) => { setWarehouseSearchTerm(e.target.value); setShowWarehouseSearch(true); clearFieldError('warehouseId'); }}
                    onFocus={() => setShowWarehouseSearch(true)}
                    placeholder={t('selectOrSearchWarehouse')}
                    style={{ width: '100%' }}
                  />
                  {showWarehouseSearch && (
                    <div style={dropdownContainerStyle}>
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
                              style={dropdownItemStyle}
                            >
                              <div style={{ fontWeight: 500, color: '#1e293b' }}>{warehouse.name}</div>
                              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{warehouse.code}</div>
                            </div>
                          ))
                      ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                          {t('noWarehousesFound')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t('categories')}</label>
                <div style={{ position: 'relative' }} ref={categorySearchRef}>
                  {formData.categoryIds.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {formData.categoryIds.map((categoryId: number) => {
                        const category = categories.find((c: any) => c.id === categoryId);
                        if (!category) return null;
                        return (
                          <span key={categoryId} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '9999px', fontSize: '0.875rem' }}>
                            {category.name}
                            <button type="button" onClick={() => { setFormData({ ...formData, categoryIds: formData.categoryIds.filter((id: number) => id !== categoryId) }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e' }}>×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <InputText
                    type="text"
                    value={categorySearchTerm}
                    onChange={(e) => { setCategorySearchTerm(e.target.value); setShowCategorySearch(true); }}
                    onFocus={() => setShowCategorySearch(true)}
                    placeholder={t('typeToSearchCategories')}
                    style={{ width: '100%' }}
                  />
                  {showCategorySearch && (
                    <div style={dropdownContainerStyle}>
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
                                setFormData({ ...formData, categoryIds: [...formData.categoryIds, category.id] });
                                setCategorySearchTerm('');
                                setShowCategorySearch(false);
                              }}
                              style={dropdownItemStyle}
                            >
                              <div style={{ fontWeight: 500, color: '#1e293b' }}>{category.name}</div>
                              {category.description && <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{category.description}</div>}
                            </div>
                          ))
                      ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                          {categorySearchTerm ? t('noCategoriesFound') : t('startTypingToSearchCategories')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={labelStyle}>{t('description')}</label>
              <InputTextarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder={t('enterProductDescription')}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>{t('pricing')}</h3>

            {/* Sale Price */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontWeight: 500, color: '#0f172a', marginBottom: '0.75rem' }}>{t('salePrice')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>{t('price')} *</label>
                  {validationErrors.price && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{validationErrors.price}</p>}
                  <div style={{ position: 'relative' }}>
                    <InputText
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => { setFormData({ ...formData, price: e.target.value }); clearFieldError('price'); }}
                      placeholder={t('numericPlaceholder')}
                      style={{ width: '100%' }}
                    />
                    <span style={{ position: 'absolute', top: '0.625rem', color: '#64748b', fontSize: '0.875rem', ...(language === 'ar' ? { left: '0.75rem' } : { right: '0.75rem' }) }}>
                      {language === 'ar' ? 'د.م' : 'DH'}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t('unit')}</label>
                  <div style={{ position: 'relative' }} ref={saleUnitSearchRef}>
                    <InputText
                      type="text"
                      value={formData.saleUnit}
                      onChange={(e) => { setFormData({ ...formData, saleUnit: e.target.value }); setShowSaleUnitSearch(true); }}
                      onFocus={() => setShowSaleUnitSearch(true)}
                      placeholder={t('unit')}
                      style={{ width: '100%' }}
                    />
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
                          <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{uoms.length === 0 ? t('noUnitsConfigured') : t('typeToCreateCustomUnit')}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t('tax')}</label>
                  <div style={{ position: 'relative' }} ref={saleTaxSearchRef}>
                    <InputText
                      type="text"
                      value={formData.saleTax}
                      onChange={(e) => { setFormData({ ...formData, saleTax: e.target.value }); setShowSaleTaxSearch(true); }}
                      onFocus={() => setShowSaleTaxSearch(true)}
                      placeholder={t('taxPlaceholder')}
                      style={{ width: '100%' }}
                    />
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
                <p style={{ marginTop: '0.5rem', color: '#475569' }}>
                  {t('priceWithTax')}: {(parseFloat(formData.price) * (1 + parseFloat(formData.saleTax) / 100)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'} {t('per')} {formData.saleUnit}
                </p>
              )}
            </div>

            {/* Cost Price */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontWeight: 500, color: '#0f172a', marginBottom: '0.75rem' }}>{t('costPrice')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>{t('costPrice')}</label>
                  {validationErrors.cost && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{validationErrors.cost}</p>}
                  <div style={{ position: 'relative' }}>
                    <InputText
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost}
                      onChange={(e) => { setFormData({ ...formData, cost: e.target.value }); clearFieldError('cost'); }}
                      placeholder={t('numericPlaceholder')}
                      style={{ width: '100%' }}
                    />
                    <span style={{ position: 'absolute', top: '0.625rem', color: '#64748b', fontSize: '0.875rem', ...(language === 'ar' ? { left: '0.75rem' } : { right: '0.75rem' }) }}>
                      {language === 'ar' ? 'د.م' : 'DH'}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t('unit')}</label>
                  <div style={{ position: 'relative' }} ref={purchaseUnitSearchRef}>
                    <InputText
                      type="text"
                      value={formData.purchaseUnit}
                      onChange={(e) => { setFormData({ ...formData, purchaseUnit: e.target.value }); setShowPurchaseUnitSearch(true); }}
                      onFocus={() => setShowPurchaseUnitSearch(true)}
                      placeholder={t('unit')}
                      style={{ width: '100%' }}
                    />
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
                          <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{uoms.length === 0 ? t('noUnitsConfigured') : t('typeToCreateCustomUnit')}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t('tax')}</label>
                  <div style={{ position: 'relative' }} ref={purchaseTaxSearchRef}>
                    <InputText
                      type="text"
                      value={formData.purchaseTax}
                      onChange={(e) => { setFormData({ ...formData, purchaseTax: e.target.value }); setShowPurchaseTaxSearch(true); }}
                      onFocus={() => setShowPurchaseTaxSearch(true)}
                      placeholder={t('taxPlaceholder')}
                      style={{ width: '100%' }}
                    />
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
                  <InputText
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minPrice}
                    onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                    placeholder={t('numericPlaceholder')}
                    style={{ width: '100%' }}
                  />
                  <span style={{ position: 'absolute', top: '0.625rem', color: '#64748b', ...(language === 'ar' ? { left: '0.75rem' } : { right: '0.75rem' }) }}>
                    {language === 'ar' ? 'د.م' : 'DH'}
                  </span>
                </div>
              </div>
            </div>

            {/* Margin Preview */}
            {formData.price && formData.cost && (
              <div style={{ marginTop: '1rem', background: 'linear-gradient(to right, #fffbeb, #fff7ed)', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '1rem' }}>
                <h4 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>{t('marginAnalysis')}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#475569' }}>{t('marginAmount')}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                      {(parseFloat(formData.price) - parseFloat(formData.cost)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#475569' }}>{t('marginPercent')}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#16a34a' }}>
                      {parseFloat(formData.cost) > 0 ? (((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.cost)) * 100).toFixed(2) : '0.00'}%
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#475569' }}>{t('markupPercent')}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb' }}>
                      {parseFloat(formData.price) > 0 ? (((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(2) : '0.00'}%
                    </p>
                  </div>
                </div>
              </div>
            )}
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
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button type="button" outlined onClick={() => navigate('/products')} label={t('cancel')} />
          <Button
            type="submit"
            loading={createMutation.isPending}
            icon={<Save style={{ width: '1rem', height: '1rem' }} />}
            label={t('createProduct')}
          />
        </div>
      </form>
    </AdminLayout>
  );
}
