import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { productsService, validateProductForm, hasValidationErrors, getFirstError, ValidationErrors } from '../modules/products';
import { warehousesService } from '../modules/warehouses';
import { taxesService } from '../modules/taxes';
import { categoriesService } from '../modules/categories';
import { uomService } from '../modules/uom';
import { AdminLayout } from '../components/AdminLayout';

import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { Save, ArrowLeft, RefreshCw, ShoppingCart, TrendingUp, SlidersHorizontal, Building2, Tag as TagIcon, Package } from 'lucide-react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Message } from 'primereact/message';
import { toastCreated, toastSuccess, toastError } from '../services/toast.service';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';
import { useLanguage } from '../context/LanguageContext';

export default function ProductCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const currency = language === 'ar' ? 'د.م' : 'DH';

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

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: null as number | null,
    cost: null as number | null,
    minPrice: null as number | null,
    saleTaxId: null as string | null,
    purchaseTaxId: null as string | null,
    saleUnitId: null as number | null,
    purchaseUnitId: null as number | null,
    categoryIds: [] as number[],
    warehouseId: null as number | null,
    isService: false,
    isEnabled: true,
    isPriceChangeAllowed: true,
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [formDirty, setFormDirty] = useState(false);

  useUnsavedChanges(formDirty);

  const setField = <K extends keyof typeof formData>(key: K, value: typeof formData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setFormDirty(true);
    if (validationErrors[key as string]) {
      setValidationErrors(prev => { const n = { ...prev }; delete n[key as string]; return n; });
    }
  };

  useEffect(() => {
    const generateCode = async () => {
      try {
        setIsGeneratingCode(true);
        const uniqueCode = await generateUniqueProductCode();
        setFormData(prev => ({ ...prev, code: uniqueCode }));
      } catch {
        toastError(t('failedToGenerateCode'));
      } finally {
        setIsGeneratingCode(false);
      }
    };
    generateCode();
  }, []);

  useEffect(() => {
    if (uoms.length > 0 && formData.saleUnitId === null) {
      const defaultUom = uoms.find((u: any) => u.code === 'UNIT') || uoms[0];
      if (defaultUom) {
        setFormData(prev => ({ ...prev, saleUnitId: defaultUom.id, purchaseUnitId: defaultUom.id }));
      }
    }
  }, [uoms]);

  const handleRegenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const uniqueCode = await generateUniqueProductCode();
      setFormData(prev => ({ ...prev, code: uniqueCode }));
      toastSuccess(t('newCodeGenerated'));
    } catch {
      toastError(t('failedToGenerateCodeRetry'));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => productsService.createProduct(data),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
    const legacyForm = {
      name: formData.name,
      code: formData.code,
      description: formData.description,
      price: formData.price?.toString() ?? '',
      cost: formData.cost?.toString() ?? '',
      minPrice: formData.minPrice?.toString() ?? '',
      saleUnit: formData.saleUnitId?.toString() ?? '',
      purchaseUnit: formData.purchaseUnitId?.toString() ?? '',
      warehouseId: formData.warehouseId?.toString() ?? '',
      categoryIds: formData.categoryIds,
    };
    const errors = validateProductForm(legacyForm, true);
    setValidationErrors(errors);
    if (hasValidationErrors(errors)) {
      const firstError = getFirstError(errors);
      if (firstError) toastError(firstError);
      return;
    }
    const saleTaxRate = taxRates.find((r: any) => r.name === formData.saleTaxId);
    const purchaseTaxRate = taxRates.find((r: any) => r.name === formData.purchaseTaxId);
    createMutation.mutate({
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      price: formData.price ?? 0,
      cost: formData.cost ?? 0,
      minPrice: formData.minPrice ?? 0,
      saleTax: saleTaxRate?.rate ?? 0,
      purchaseTax: purchaseTaxRate?.rate ?? 0,
      warehouseId: formData.warehouseId,
      categoryIds: formData.categoryIds,
      isService: formData.isService,
      isEnabled: formData.isEnabled,
      isPriceChangeAllowed: formData.isPriceChangeAllowed,
      saleUnitId: formData.saleUnitId,
      purchaseUnitId: formData.purchaseUnitId,
    });
  };

  const warehouseOptions = warehouses.map((w: any) => ({ label: `${w.name} (${w.code})`, value: w.id }));
  const categoryOptions = categories.map((c: any) => ({ label: c.name, value: c.id }));
  const uomOptions = uoms.map((u: any) => ({ label: `${u.name} — ${u.code}`, value: u.id }));
  const taxOptions = [{ label: '0%', value: null }, ...taxRates.map((r: any) => ({ label: `${r.name} (${r.rate}%)`, value: r.name }))];

  const saleTaxRate = taxRates.find((r: any) => r.name === formData.saleTaxId)?.rate ?? 0;
  const priceWithTax = formData.price ? formData.price * (1 + saleTaxRate / 100) : null;
  const margin = (formData.price != null && formData.cost != null) ? formData.price - formData.cost : null;
  const marginPct = (margin != null && formData.cost) ? (margin / formData.cost) * 100 : null;
  const markupPct = (margin != null && formData.price) ? (margin / formData.price) * 100 : null;

  const fieldClass = (field: string) => validationErrors[field] ? 'p-invalid' : '';

  const panel: React.CSSProperties = {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '0.875rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const iconBox = (bg: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: '0.5rem',
    background: bg,
    flexShrink: 0,
  });

  return (
    <AdminLayout>

      {/* ── Page Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        marginBottom: '0.75rem',
        padding: '1.125rem 1.375rem',
        background: '#ffffff',
        borderRadius: '1rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        border: '1.5px solid #e2e8f0',
        flexWrap: 'wrap',
      }}>
        <Button
          icon={<ArrowLeft style={{ width: '1.125rem', height: '1.125rem' }} />}
          onClick={() => navigate('/products')}
          style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '0.5rem', padding: 0 }}
        />
        <div style={{ width: '2.75rem', height: '2.75rem', flexShrink: 0, background: 'linear-gradient(135deg, #235ae4, #1a47b8)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(35,90,228,0.4)' }}>
          <Package style={{ width: '1.375rem', height: '1.375rem', color: '#fff' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, letterSpacing: '-0.01em' }}>
                {t('createNewProduct')}
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.125rem 0 0' }}>{t('addNewProductToInventory')}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
              <Button type="button" text onClick={() => navigate('/products')} label={t('cancel')} style={{ color: '#64748b' }} />
              <Button
                type="submit"
                form="product-create-form"
                loading={createMutation.isPending}
                icon={<Save style={{ width: '0.875rem', height: '0.875rem' }} />}
                label={t('createNewProduct')}
              />
            </div>
          </div>
        </div>
      </div>

      <form id="product-create-form" onSubmit={handleSubmit}>
        <div className="product-form-grid">

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Basic Information */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={iconBox('#eef2ff')}>
                  <TagIcon style={{ width: '1rem', height: '1rem', color: '#6366f1' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{t('basicInformation')}</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Name, barcode and description</p>
                </div>
              </div>

              <div className="product-two-col" style={{ marginBottom: '1.25rem' }}>
                <div className="p-field">
                  <label className="p-label">{t('productName')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <InputText
                    value={formData.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder={t('enterProductName')}
                    className={fieldClass('name')}
                    style={{ width: '100%' }}
                  />
                  {validationErrors.name && <Message severity="error" text={validationErrors.name} style={{ marginTop: '0.25rem' }} />}
                </div>
                <div className="p-field">
                  <label className="p-label">{t('productCodeEAN13')}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <InputText
                      value={formData.code}
                      onChange={(e) => setField('code', e.target.value)}
                      placeholder={t('autoGeneratedBarcode')}
                      maxLength={13}
                      className={fieldClass('code')}
                      style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                    />
                    <Button
                      type="button"
                      outlined
                      onClick={handleRegenerateCode}
                      disabled={isGeneratingCode}
                      icon={<RefreshCw className={isGeneratingCode ? 'animate-spin' : ''} style={{ width: '0.875rem', height: '0.875rem' }} />}
                      tooltip={t('generateNewUniqueCode')}
                      tooltipOptions={{ position: 'top' }}
                    />
                  </div>
                  {validationErrors.code && <Message severity="error" text={validationErrors.code} style={{ marginTop: '0.25rem' }} />}
                </div>
              </div>

              <div className="p-field">
                <label className="p-label">{t('description')}</label>
                <InputTextarea
                  value={formData.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={3}
                  autoResize
                  placeholder={t('enterProductDescription')}
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>
            </div>

            {/* Sale Pricing */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={iconBox('#ecfdf5')}>
                  <ShoppingCart style={{ width: '1rem', height: '1rem', color: '#10b981' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{t('salePrice')}</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Price shown to customers</p>
                </div>
              </div>

              <div className="product-pricing-grid">
                <div className="p-field">
                  <label className="p-label">{t('price')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <InputNumber
                    value={formData.price}
                    onValueChange={(e) => setField('price', e.value ?? null)}
                    mode="decimal" minFractionDigits={2} maxFractionDigits={2} min={0}
                    suffix={` ${currency}`} placeholder="0.00"
                    className={fieldClass('price')}
                    inputStyle={{ width: '100%' }} style={{ width: '100%' }}
                  />
                  {validationErrors.price && <Message severity="error" text={validationErrors.price} style={{ marginTop: '0.25rem' }} />}
                </div>
                <div className="p-field">
                  <label className="p-label">{t('unit')}</label>
                  <Dropdown value={formData.saleUnitId} onChange={(e) => setField('saleUnitId', e.value)} options={uomOptions} placeholder={t('selectUnit')} style={{ width: '100%' }} showClear />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('tax')}</label>
                  <Dropdown value={formData.saleTaxId} onChange={(e) => setField('saleTaxId', e.value)} options={taxOptions} placeholder="0%" style={{ width: '100%' }} />
                </div>
              </div>

              {priceWithTax != null && saleTaxRate > 0 && (
                <div style={{ marginTop: '0.875rem', padding: '0.625rem 0.875rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#166534' }}>
                    {t('priceWithTax')}: <strong>{priceWithTax.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</strong>
                  </span>
                </div>
              )}

              <div style={{ marginTop: '1.25rem' }} className="p-field">
                <label className="p-label">{t('minPrice')}</label>
                <InputNumber
                  value={formData.minPrice}
                  onValueChange={(e) => setField('minPrice', e.value ?? null)}
                  mode="decimal" minFractionDigits={2} maxFractionDigits={2} min={0}
                  suffix={` ${currency}`} placeholder="0.00"
                  inputStyle={{ width: '100%' }} style={{ maxWidth: '16rem', width: '100%' }}
                />
              </div>
            </div>

            {/* Cost Pricing */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={iconBox('#eff6ff')}>
                  <TrendingUp style={{ width: '1rem', height: '1rem', color: '#235ae4' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{t('costPrice')}</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Purchase cost</p>
                </div>
              </div>

              <div className="product-pricing-grid">
                <div className="p-field">
                  <label className="p-label">{t('costPrice')}</label>
                  <InputNumber
                    value={formData.cost}
                    onValueChange={(e) => setField('cost', e.value ?? null)}
                    mode="decimal" minFractionDigits={2} maxFractionDigits={2} min={0}
                    suffix={` ${currency}`} placeholder="0.00"
                    inputStyle={{ width: '100%' }} style={{ width: '100%' }}
                  />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('unit')}</label>
                  <Dropdown value={formData.purchaseUnitId} onChange={(e) => setField('purchaseUnitId', e.value)} options={uomOptions} placeholder={t('selectUnit')} style={{ width: '100%' }} showClear />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('tax')}</label>
                  <Dropdown value={formData.purchaseTaxId} onChange={(e) => setField('purchaseTaxId', e.value)} options={taxOptions} placeholder="0%" style={{ width: '100%' }} />
                </div>
              </div>

              {margin != null && (
                <div style={{ marginTop: '1.25rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Margin Analysis</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
                    {[
                      { label: t('marginAmount'), value: `${margin.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`, color: margin >= 0 ? '#0f172a' : '#ef4444', border: '#f1f5f9' },
                      { label: t('marginPercent'), value: `${marginPct?.toFixed(1) ?? '—'}%`, color: '#16a34a', border: '#dcfce7' },
                      { label: t('markupPercent'), value: `${markupPct?.toFixed(1) ?? '—'}%`, color: '#2563eb', border: '#dbeafe' },
                    ].map(({ label, value, color, border }) => (
                      <div key={label} style={{ background: 'white', borderRadius: '0.625rem', padding: '0.75rem 0.5rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: `1px solid ${border}` }}>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.375rem' }}>{label}</p>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700, color, margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Settings */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={iconBox('#f5f3ff')}>
                  <SlidersHorizontal style={{ width: '1rem', height: '1rem', color: '#7c3aed' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>Settings</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Product behavior options</p>
                </div>
              </div>

              {([
                { key: 'isService' as const, label: t('isService'), desc: t('serviceDescription'), value: formData.isService, onChange: (v: boolean) => setField('isService', v) },
                { key: 'isEnabled' as const, label: t('enabled'), desc: t('enabledDescription'), value: formData.isEnabled, onChange: (v: boolean) => setField('isEnabled', v) },
                { key: 'isPriceChangeAllowed' as const, label: t('allowPriceChange'), desc: t('allowPriceChangeDescription'), value: formData.isPriceChangeAllowed, onChange: (v: boolean) => setField('isPriceChangeAllowed', v) },
              ] as const).map(({ key, label, desc, value, onChange }, i, arr) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#0f172a', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.125rem 0 0' }}>{desc}</p>
                  </div>
                  <InputSwitch checked={value} onChange={(e) => onChange(e.value ?? false)} />
                </div>
              ))}
            </div>

            {/* Organization */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={iconBox('#fff7ed')}>
                  <Building2 style={{ width: '1rem', height: '1rem', color: '#ea580c' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{t('classification')}</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Warehouse and categories</p>
                </div>
              </div>

              <div className="p-field" style={{ marginBottom: '1rem' }}>
                <label className="p-label">{t('warehouse')} <span style={{ color: '#ef4444' }}>*</span></label>
                <Dropdown
                  value={formData.warehouseId}
                  onChange={(e) => setField('warehouseId', e.value)}
                  options={warehouseOptions}
                  placeholder={t('selectOrSearchWarehouse')}
                  filter filterPlaceholder={t('search')}
                  className={fieldClass('warehouseId')}
                  style={{ width: '100%' }}
                />
                {validationErrors.warehouseId && <Message severity="error" text={validationErrors.warehouseId} style={{ marginTop: '0.25rem' }} />}
              </div>

              <div className="p-field">
                <label className="p-label">{t('categories')}</label>
                <MultiSelect
                  value={formData.categoryIds}
                  onChange={(e) => setField('categoryIds', e.value)}
                  options={categoryOptions}
                  placeholder={t('typeToSearchCategories')}
                  filter display="chip"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
