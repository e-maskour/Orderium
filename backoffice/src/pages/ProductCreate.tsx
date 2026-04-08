import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productsService } from '../modules/products';
import {
  productFormSchema,
  type ProductFormValues,
} from '../modules/products/schemas/product-form.schema';
import { warehousesService } from '../modules/warehouses';
import { taxesService } from '../modules/taxes';
import { categoriesService } from '../modules/categories';
import { uomService } from '../modules/uom';
import { AdminLayout } from '../components/AdminLayout';
import { useApiErrors } from '../hooks/useApiErrors';
import type { TranslationKey } from '../lib/i18n';

import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import {
  Save,
  ArrowLeft,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  SlidersHorizontal,
  Building2,
  Tag as TagIcon,
  Package,
} from 'lucide-react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { toastCreated, toastSuccess, toastError } from '../services/toast.service';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';
import { useLanguage } from '../context/LanguageContext';
import { formatAmount } from '@orderium/ui';

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

  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      code: '',
      description: '',
      price: null,
      cost: null,
      minPrice: null,
      saleTaxId: null,
      purchaseTaxId: null,
      saleUnitId: null,
      purchaseUnitId: null,
      categoryIds: [],
      warehouseId: null,
      isService: false,
      isEnabled: true,
      isPriceChangeAllowed: true,
    },
  });
  const {
    register,
    control,
    handleSubmit: rhfHandleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = form;
  const { handleApiErrors } = useApiErrors(form);

  useUnsavedChanges(isDirty);

  // Watch for computed values
  const price = watch('price');
  const cost = watch('cost');
  const saleTaxId = watch('saleTaxId');

  useEffect(() => {
    const generateCode = async () => {
      try {
        setIsGeneratingCode(true);
        const uniqueCode = await generateUniqueProductCode();
        setValue('code', uniqueCode, { shouldDirty: false });
      } catch {
        toastError(t('failedToGenerateCode'));
      } finally {
        setIsGeneratingCode(false);
      }
    };
    generateCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (uoms.length > 0) {
      const defaultUom = uoms.find((u: any) => u.code === 'UNIT') || uoms[0];
      if (defaultUom) {
        setValue('saleUnitId', defaultUom.id, { shouldDirty: false });
        setValue('purchaseUnitId', defaultUom.id, { shouldDirty: false });
      }
    }
  }, [uoms, setValue]);

  const handleRegenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const uniqueCode = await generateUniqueProductCode();
      setValue('code', uniqueCode);
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
      navigate(`/products/${result.product.id}`);
    },
    onError: (error: unknown) => {
      handleApiErrors(error);
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    const saleTaxRate = taxRates.find((r: any) => r.name === data.saleTaxId);
    const purchaseTaxRate = taxRates.find((r: any) => r.name === data.purchaseTaxId);
    createMutation.mutate({
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      price: data.price ?? 0,
      cost: data.cost ?? 0,
      minPrice: data.minPrice ?? 0,
      saleTax: saleTaxRate?.rate ?? 0,
      purchaseTax: purchaseTaxRate?.rate ?? 0,
      warehouseId: data.warehouseId,
      categoryIds: data.categoryIds,
      isService: data.isService,
      isEnabled: data.isEnabled,
      isPriceChangeAllowed: data.isPriceChangeAllowed,
      saleUnitId: data.saleUnitId,
      purchaseUnitId: data.purchaseUnitId,
    });
  };

  const onInvalidSubmit = () => {
    toastError(t('validationCheckFields' as TranslationKey));
  };

  const warehouseOptions = warehouses.map((w: any) => ({
    label: `${w.name} (${w.code})`,
    value: w.id,
  }));
  const categoryOptions = categories.map((c: any) => ({ label: c.name, value: c.id }));
  const uomOptions = uoms.map((u: any) => ({ label: `${u.name} — ${u.code}`, value: u.id }));
  const taxOptions = [
    { label: '0%', value: null },
    ...taxRates.map((r: any) => ({ label: `${r.name} (${r.rate}%)`, value: r.name })),
  ];

  const saleTaxRate = taxRates.find((r: any) => r.name === saleTaxId)?.rate ?? 0;
  const priceWithTax = price ? price * (1 + saleTaxRate / 100) : null;
  const margin = price != null && cost != null ? price - cost : null;
  const marginPct = margin != null && cost ? (margin / cost) * 100 : null;
  const markupPct = margin != null && price ? (margin / price) * 100 : null;

  const fieldClass = (field: keyof ProductFormValues) => (errors[field] ? 'p-invalid' : '');

  /** Renders inline error for a named field */
  const FieldError = ({ name }: { name: keyof ProductFormValues }) => {
    const err = errors[name];
    if (!err?.message) return null;
    return (
      <small
        role="alert"
        style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: '#ef4444' }}
      >
        {t(err.message as TranslationKey)}
      </small>
    );
  };

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
      <style>{`
        .prod-create-hdr { display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap; position: relative; margin-bottom: 0.75rem; padding: 0.75rem 1.25rem; background: rgba(255,255,255,0.72); backdrop-filter: blur(8px); border-radius: 1rem; border: 1.5px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
        .prod-create-hdr__icon { width: 2.75rem; height: 2.75rem; flex-shrink: 0; background: linear-gradient(135deg, #235ae4, #1a47b8); border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(35,90,228,0.4); }
        .prod-create-hdr__body { flex: 1; min-width: 0; overflow: hidden; }
        .prod-create-hdr__crumb { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.2rem; }
        .prod-create-hdr__title { margin: 0; font-size: 1.125rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .prod-create-hdr__actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; flex-wrap: nowrap; }
        @media (max-width: 767px) {
          .prod-create-hdr { padding: 0.625rem 0.875rem; gap: 0.5rem; }
          .prod-create-hdr__icon { display: none !important; }
          .prod-create-hdr__title { font-size: 0.9375rem !important; font-weight: 700 !important; }
          .prod-create-hdr__body { flex: 1; min-width: 0; }
          .prod-create-hdr__crumb { display: none; }
          .prod-create-hdr__actions { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; gap: 0.375rem; width: 100%; }
          .prod-create-hdr__actions::-webkit-scrollbar { display: none; }
          .prod-create-hdr .p-button, .prod-create-hdr__actions .p-button { height: 2.25rem !important; min-height: 2.25rem !important; max-height: 2.25rem !important; padding-top: 0 !important; padding-bottom: 0 !important; font-size: 0.8125rem !important; white-space: nowrap; }
        }
        @media (max-width: 479px) {
          .prod-create-hdr { padding: 0.5rem 0.75rem; border-radius: 0.875rem; }
        }
      `}</style>

      {/* ── Page Header ── */}
      <div className="prod-create-hdr">
        <Button
          icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
          onClick={() => navigate('/products')}
          style={{
            width: '2.25rem',
            height: '2.25rem',
            flexShrink: 0,
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            color: '#64748b',
            borderRadius: '0.625rem',
            padding: 0,
          }}
        />
        <div className="prod-create-hdr__icon">
          <Package style={{ width: '1.375rem', height: '1.375rem', color: '#fff' }} />
        </div>
        <div className="prod-create-hdr__body">
          <div className="prod-create-hdr__crumb">
            <span
              onClick={() => navigate('/products')}
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                cursor: 'pointer',
              }}
            >
              {t('products')}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>›</span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#235ae4',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              {t('createNewProduct')}
            </span>
          </div>
          <h1 className="prod-create-hdr__title">{t('newProductLabel')}</h1>
        </div>
        <div className="prod-create-hdr__actions">
          <Button
            type="button"
            text
            onClick={() => navigate('/products')}
            label={t('cancel')}
            style={{ color: '#64748b', flexShrink: 0 }}
          />
          <Button
            type="submit"
            form="product-create-form"
            loading={createMutation.isPending}
            icon={<Save style={{ width: '0.875rem', height: '0.875rem' }} />}
            label={t('createNewProduct')}
            style={{ flexShrink: 0 }}
          />
        </div>
      </div>

      <form
        id="product-create-form"
        onSubmit={rhfHandleSubmit(onSubmit, onInvalidSubmit)}
        noValidate
      >
        <div className="product-form-grid">
          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Basic Information */}
            <div style={panel} className="product-panel">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={iconBox('#eef2ff')}>
                  <TagIcon style={{ width: '1rem', height: '1rem', color: '#6366f1' }} />
                </div>
                <div>
                  <h3
                    style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}
                  >
                    {t('basicInformation')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                    Name, barcode and description
                  </p>
                </div>
              </div>

              <div className="product-two-col" style={{ marginBottom: '1.25rem' }}>
                <div className="p-field">
                  <label className="p-label">
                    {t('productName')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <InputText
                    {...register('name')}
                    placeholder={t('enterProductName')}
                    className={fieldClass('name')}
                    style={{ width: '100%' }}
                  />
                  <FieldError name="name" />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('productCodeEAN13')}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <InputText
                      {...register('code')}
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
                      icon={
                        <RefreshCw
                          className={isGeneratingCode ? 'animate-spin' : ''}
                          style={{ width: '0.875rem', height: '0.875rem' }}
                        />
                      }
                      tooltip={t('generateNewUniqueCode')}
                      tooltipOptions={{ position: 'top' }}
                    />
                  </div>
                  <FieldError name="code" />
                </div>
              </div>

              <div className="p-field">
                <label className="p-label">{t('description')}</label>
                <InputTextarea
                  {...register('description')}
                  rows={3}
                  autoResize
                  placeholder={t('enterProductDescription')}
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>
            </div>

            {/* Sale Pricing */}
            <div style={panel} className="product-panel">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={iconBox('#ecfdf5')}>
                  <ShoppingCart style={{ width: '1rem', height: '1rem', color: '#10b981' }} />
                </div>
                <div>
                  <h3
                    style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}
                  >
                    {t('salePrice')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                    Price shown to customers
                  </p>
                </div>
              </div>

              <div className="product-pricing-grid">
                <div className="p-field">
                  <label className="p-label">
                    {t('price')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <Controller
                    name="price"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        value={field.value}
                        onValueChange={(e) => field.onChange(e.value ?? null)}
                        onBlur={field.onBlur}
                        mode="decimal"
                        minFractionDigits={2}
                        maxFractionDigits={2}
                        min={0}
                        suffix={` ${currency}`}
                        placeholder="0.00"
                        className={fieldClass('price')}
                        inputStyle={{ width: '100%' }}
                        style={{ width: '100%' }}
                      />
                    )}
                  />
                  <FieldError name="price" />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('unit')}</label>
                  <Controller
                    name="saleUnitId"
                    control={control}
                    render={({ field }) => (
                      <Dropdown
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}
                        onBlur={field.onBlur}
                        options={uomOptions}
                        placeholder={t('selectUnit')}
                        style={{ width: '100%' }}
                        showClear
                      />
                    )}
                  />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('tax')}</label>
                  <Controller
                    name="saleTaxId"
                    control={control}
                    render={({ field }) => (
                      <Dropdown
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}
                        onBlur={field.onBlur}
                        options={taxOptions}
                        placeholder="0%"
                        style={{ width: '100%' }}
                      />
                    )}
                  />
                </div>
              </div>

              {priceWithTax != null && saleTaxRate > 0 && (
                <div
                  style={{
                    marginTop: '0.875rem',
                    padding: '0.625rem 0.875rem',
                    background: '#f0fdf4',
                    borderRadius: '0.5rem',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', color: '#166534' }}>
                    {t('priceWithTax')}:{' '}
                    <strong>
                      {formatAmount(priceWithTax, 2)} {currency}
                    </strong>
                  </span>
                </div>
              )}

              <div style={{ marginTop: '1.25rem' }} className="p-field">
                <label className="p-label">{t('minPrice')}</label>
                <Controller
                  name="minPrice"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      value={field.value ?? null}
                      onValueChange={(e) => field.onChange(e.value ?? null)}
                      onBlur={field.onBlur}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      min={0}
                      suffix={` ${currency}`}
                      placeholder="0.00"
                      inputStyle={{ width: '100%' }}
                      style={{ maxWidth: '16rem', width: '100%', display: 'block' }}
                    />
                  )}
                />
              </div>
            </div>

            {/* Cost Pricing */}
            <div style={panel} className="product-panel">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={iconBox('#eff6ff')}>
                  <TrendingUp style={{ width: '1rem', height: '1rem', color: '#235ae4' }} />
                </div>
                <div>
                  <h3
                    style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}
                  >
                    {t('costPrice')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Purchase cost</p>
                </div>
              </div>

              <div className="product-pricing-grid">
                <div className="p-field">
                  <label className="p-label">{t('costPrice')}</label>
                  <Controller
                    name="cost"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        value={field.value ?? null}
                        onValueChange={(e) => field.onChange(e.value ?? null)}
                        onBlur={field.onBlur}
                        mode="decimal"
                        minFractionDigits={2}
                        maxFractionDigits={2}
                        min={0}
                        suffix={` ${currency}`}
                        placeholder="0.00"
                        inputStyle={{ width: '100%' }}
                        style={{ width: '100%' }}
                      />
                    )}
                  />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('unit')}</label>
                  <Controller
                    name="purchaseUnitId"
                    control={control}
                    render={({ field }) => (
                      <Dropdown
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}
                        onBlur={field.onBlur}
                        options={uomOptions}
                        placeholder={t('selectUnit')}
                        style={{ width: '100%' }}
                        showClear
                      />
                    )}
                  />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('tax')}</label>
                  <Controller
                    name="purchaseTaxId"
                    control={control}
                    render={({ field }) => (
                      <Dropdown
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}
                        onBlur={field.onBlur}
                        options={taxOptions}
                        placeholder="0%"
                        style={{ width: '100%' }}
                      />
                    )}
                  />
                </div>
              </div>

              {margin != null && (
                <div
                  style={{
                    marginTop: '1.25rem',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 0.75rem',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                    }}
                  >
                    Margin Analysis
                  </p>
                  <div className="margin-grid-3">
                    {[
                      {
                        label: t('marginAmount'),
                        value: `${formatAmount(margin, 2)} ${currency}`,
                        color: margin >= 0 ? '#0f172a' : '#ef4444',
                        border: '#f1f5f9',
                      },
                      {
                        label: t('marginPercent'),
                        value: `${marginPct?.toFixed(1) ?? '—'}%`,
                        color: '#16a34a',
                        border: '#dcfce7',
                      },
                      {
                        label: t('markupPercent'),
                        value: `${markupPct?.toFixed(1) ?? '—'}%`,
                        color: '#2563eb',
                        border: '#dbeafe',
                      },
                    ].map(({ label, value, color, border }) => (
                      <div
                        key={label}
                        style={{
                          background: 'white',
                          borderRadius: '0.625rem',
                          padding: '0.75rem 0.5rem',
                          textAlign: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          border: `1px solid ${border}`,
                        }}
                      >
                        <p
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: '#94a3b8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            margin: '0 0 0.375rem',
                          }}
                        >
                          {label}
                        </p>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700, color, margin: 0 }}>
                          {value}
                        </p>
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
            <div style={panel} className="product-panel">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={iconBox('#f5f3ff')}>
                  <SlidersHorizontal style={{ width: '1rem', height: '1rem', color: '#7c3aed' }} />
                </div>
                <div>
                  <h3
                    style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}
                  >
                    Settings
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                    Product behavior options
                  </p>
                </div>
              </div>

              {(
                [
                  {
                    key: 'isService' as const,
                    label: t('isService'),
                    desc: t('serviceDescription'),
                  },
                  { key: 'isEnabled' as const, label: t('enabled'), desc: t('enabledDescription') },
                  {
                    key: 'isPriceChangeAllowed' as const,
                    label: t('allowPriceChange'),
                    desc: t('allowPriceChangeDescription'),
                  },
                ] as const
              ).map(({ key, label, desc }, i, arr) => (
                <Controller
                  key={key}
                  name={key}
                  control={control}
                  render={({ field }) => (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem 0',
                        borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            color: '#0f172a',
                            margin: 0,
                          }}
                        >
                          {label}
                        </p>
                        <p
                          style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.125rem 0 0' }}
                        >
                          {desc}
                        </p>
                      </div>
                      <InputSwitch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.value ?? false)}
                      />
                    </div>
                  )}
                />
              ))}
            </div>

            {/* Organization */}
            <div style={panel} className="product-panel">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={iconBox('#fff7ed')}>
                  <Building2 style={{ width: '1rem', height: '1rem', color: '#ea580c' }} />
                </div>
                <div>
                  <h3
                    style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}
                  >
                    {t('classification')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                    Warehouse and categories
                  </p>
                </div>
              </div>

              <div className="p-field" style={{ marginBottom: '1rem' }}>
                <label className="p-label">
                  {t('warehouse')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <Controller
                  name="warehouseId"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      onBlur={field.onBlur}
                      options={warehouseOptions}
                      placeholder={t('selectOrSearchWarehouse')}
                      filter
                      filterPlaceholder={t('search')}
                      className={fieldClass('warehouseId')}
                      style={{ width: '100%' }}
                    />
                  )}
                />
                <FieldError name="warehouseId" />
              </div>

              <div className="p-field">
                <label className="p-label">{t('categories')}</label>
                <Controller
                  name="categoryIds"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      onBlur={field.onBlur}
                      options={categoryOptions}
                      placeholder={t('typeToSearchCategories')}
                      filter
                      display="chip"
                      style={{ width: '100%' }}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
