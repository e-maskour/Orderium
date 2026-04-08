import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productsService } from '../modules/products';
import {
  productFormSchema,
  ProductFormValues,
} from '../modules/products/schemas/product-form.schema';
import { warehousesService } from '../modules/warehouses';
import { stockService } from '../modules/stock';
import { categoriesService } from '../modules/categories';
import { taxesService } from '../modules/taxes';
import { uomService } from '../modules/uom';
import { AdminLayout } from '../components/AdminLayout';
import { ImageUpload } from '../components/ImageUpload';
import {
  ArrowLeft,
  Save,
  Plus,
  ArrowRightLeft,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
  Building2,
  Tag as TagIcon,
  Package,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { toastSuccess, toastUpdated, toastDeleted, toastError } from '../services/toast.service';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';
import { useLanguage } from '../context/LanguageContext';
import { useApiErrors } from '../hooks/useApiErrors';
import { TranslationKey } from '../lib/langs';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Message } from 'primereact/message';

import { Tag as PTag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { RadioButton } from 'primereact/radiobutton';
import { formatAmount } from '@orderium/ui';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const currency = language === 'ar' ? 'د.م' : 'DH';

  const [showStockCorrection, setShowStockCorrection] = useState(false);
  const [showStockTransfer, setShowStockTransfer] = useState(false);

  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

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
    reset,
    formState: { errors },
  } = form;
  const { handleApiErrors } = useApiErrors(form);

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

  const { data: stockQuants = [] } = useQuery({
    queryKey: ['stock-quants', id],
    queryFn: () => stockService.getProductStock(Number(id)),
    enabled: !!id,
  });

  const taxRates = taxesConfig?.rates || [];

  const updateMutation = useMutation({
    mutationFn: (data: any) => productsService.updateProduct(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toastUpdated(t('productUpdatedSuccessfully'));
    },
    onError: (error: any) => {
      handleApiErrors(error);
    },
  });

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
      toastUpdated(t('stockCorrectedSuccessfully'));
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToCorrectStock'));
    },
  });

  const stockTransferMutation = useMutation({
    mutationFn: (data: any) =>
      stockService.internalTransfer({
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
    onError: (error: any) => {
      toastError(error.message || t('failedToTransferStock'));
    },
  });

  useEffect(() => {
    if (product) {
      const productCategories = (product as any).categories || [];
      const defaultUom =
        uoms.length > 0 ? uoms.find((u: any) => u.code === 'UNIT') || uoms[0] : null;
      reset({
        name: product.name,
        code: product.code || '',
        description: product.description || '',
        price: product.price,
        cost: product.cost,
        minPrice: product.minPrice,
        saleTaxId: taxRates.find((r: any) => r.rate === product.saleTax)?.name ?? null,
        purchaseTaxId: taxRates.find((r: any) => r.rate === product.purchaseTax)?.name ?? null,
        saleUnitId: (product as any).saleUnitOfMeasure?.id ?? defaultUom?.id ?? null,
        purchaseUnitId: (product as any).purchaseUnitOfMeasure?.id ?? defaultUom?.id ?? null,
        categoryIds: productCategories.map((c: any) => c.id),
        warehouseId: product.warehouseId ?? null,
        isService: product.isService,
        isEnabled: product.isEnabled,
        isPriceChangeAllowed: product.isPriceChangeAllowed,
      });
    }
  }, [product, taxRates.length, uoms.length]);

  // If uoms loaded after product, backfill missing unit defaults
  useEffect(() => {
    if (uoms.length > 0 && product) {
      const defaultUom = uoms.find((u: any) => u.code === 'UNIT') || uoms[0];
      const cur = form.getValues();
      if (!cur.saleUnitId) setValue('saleUnitId', defaultUom.id, { shouldDirty: false });
      if (!cur.purchaseUnitId) setValue('purchaseUnitId', defaultUom.id, { shouldDirty: false });
    }
  }, [uoms.length]);

  const handleRegenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const uniqueCode = await generateUniqueProductCode();
      setValue('code', uniqueCode);
      toastSuccess(t('newUniqueCodeGenerated'));
    } catch {
      toastError(t('failedToGenerateUniqueCode'));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const onSubmit = (data: ProductFormValues) => {
    const saleTaxRate = taxRates.find((r: any) => r.name === data.saleTaxId);
    const purchaseTaxRate = taxRates.find((r: any) => r.name === data.purchaseTaxId);
    updateMutation.mutate({
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

  const handleSave = rhfHandleSubmit(onSubmit, onInvalidSubmit);

  const handleStockCorrection = () => {
    stockCorrectionMutation.mutate(stockCorrectionData);
  };
  const handleStockTransfer = () => {
    stockTransferMutation.mutate(stockTransferData);
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
  const warehouseDropdownOptions = warehouses.map((w: any) => ({
    label: w.name,
    value: w.id.toString(),
  }));
  const destWarehouseOptions = warehouses
    .filter((wh: any) => wh.id.toString() !== stockTransferData.sourceWarehouseId)
    .map((wh: any) => ({ label: wh.name, value: wh.id.toString() }));

  const saleTaxId = watch('saleTaxId');
  const price = watch('price');
  const cost = watch('cost');
  const saleTaxRate = taxRates.find((r: any) => r.name === saleTaxId)?.rate ?? 0;
  const priceWithTax = price != null ? price * (1 + saleTaxRate / 100) : null;
  const margin = price != null && cost != null ? price - cost : null;
  const marginPct = margin != null && cost ? (margin / cost) * 100 : null;
  const markupPct = margin != null && price ? (margin / price) * 100 : null;
  const totalStock = stockQuants.reduce(
    (sum, sq) => sum + parseFloat(sq.quantity?.toString() || '0'),
    0,
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
          }}
        >
          <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#235ae4' }}></i>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <p style={{ color: '#64748b' }}>Product not found</p>
        </div>
      </AdminLayout>
    );
  }

  const fieldClass = (field: keyof ProductFormValues) => (errors[field] ? 'p-invalid' : '');

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

  const totalOnHand = stockQuants.reduce(
    (s, sq) => s + parseFloat(sq.quantity?.toString() || '0'),
    0,
  );
  const totalAvailable = stockQuants.reduce(
    (s, sq) => s + parseFloat(sq.availableQuantity?.toString() || '0'),
    0,
  );
  const totalReserved = stockQuants.reduce(
    (s, sq) => s + parseFloat(sq.reservedQuantity?.toString() || '0'),
    0,
  );
  const totalIncoming = stockQuants.reduce(
    (s, sq) => s + parseFloat(sq.incomingQuantity?.toString() || '0'),
    0,
  );
  const totalOutgoing = stockQuants.reduce(
    (s, sq) => s + parseFloat(sq.outgoingQuantity?.toString() || '0'),
    0,
  );

  return (
    <AdminLayout>
      <style>{`
        .prod-detail-hdr { display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap; position: relative; margin-bottom: 0.75rem; padding: 0.75rem 1.25rem; background: rgba(255,255,255,0.72); backdrop-filter: blur(8px); border-radius: 1rem; border: 1.5px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
        .prod-detail-hdr__icon { width: 2.75rem; height: 2.75rem; flex-shrink: 0; background: linear-gradient(135deg, #235ae4, #1a47b8); border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(35,90,228,0.4); }
        .prod-detail-hdr__body { flex: 1; min-width: 0; overflow: hidden; }
        .prod-detail-hdr__crumb { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.2rem; }
        .prod-detail-hdr__title { margin: 0; font-size: 1.125rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .prod-detail-hdr__actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; flex-wrap: nowrap; }
        @media (max-width: 767px) {
          .prod-detail-hdr { padding: 0.625rem 0.875rem; gap: 0.5rem; }
          .prod-detail-hdr__icon { display: none !important; }
          .prod-detail-hdr__title { font-size: 0.9375rem !important; font-weight: 700 !important; }
          .prod-detail-hdr__body { flex: 1; min-width: 0; }
          .prod-detail-hdr__crumb { display: none; }
          .prod-detail-hdr__actions { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; gap: 0.375rem; width: 100%; }
          .prod-detail-hdr__actions::-webkit-scrollbar { display: none; }
          .prod-detail-hdr .p-button, .prod-detail-hdr__actions .p-button { height: 2.25rem !important; min-height: 2.25rem !important; max-height: 2.25rem !important; padding-top: 0 !important; padding-bottom: 0 !important; font-size: 0.8125rem !important; white-space: nowrap; }
        }
        @media (max-width: 479px) {
          .prod-detail-hdr { padding: 0.5rem 0.75rem; border-radius: 0.875rem; }
        }
      `}</style>

      {/* ── Page Header ── */}
      <div className="prod-detail-hdr">
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
        <div className="prod-detail-hdr__icon">
          <Package style={{ width: '1.375rem', height: '1.375rem', color: '#fff' }} />
        </div>
        <div className="prod-detail-hdr__body">
          <div className="prod-detail-hdr__crumb">
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
              {product.code || product.name}
            </span>
          </div>
          <h1 className="prod-detail-hdr__title">{product.name}</h1>
        </div>
        <div className="prod-detail-hdr__actions">
          <PTag
            value={product.isEnabled ? t('active') : t('inactive')}
            severity={product.isEnabled ? 'success' : 'danger'}
            style={{ flexShrink: 0 }}
          />
          {product.isService && <PTag value="Service" severity="info" style={{ flexShrink: 0 }} />}
          <Button
            text
            onClick={() => navigate('/products')}
            label={t('cancel')}
            style={{ color: '#64748b', flexShrink: 0 }}
          />
          <Button
            onClick={handleSave}
            loading={updateMutation.isPending}
            icon={<Save style={{ width: '0.875rem', height: '0.875rem' }} />}
            label={t('saveChanges')}
            style={{ flexShrink: 0 }}
          />
        </div>
      </div>

      <TabView
        activeIndex={activeTabIndex}
        onTabChange={(e) => setActiveTabIndex(e.index)}
        pt={{
          root: { className: 'product-tabview' },
          panelContainer: { style: { padding: '0.75rem 0 0', background: 'transparent' } },
          nav: { style: { background: 'transparent' } },
        }}
      >
        <TabPanel header="Information">
          <div className="product-form-grid">
            {/* Left */}
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
                      style={{
                        margin: 0,
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      {t('basicInformation')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                      Name, barcode and description
                    </p>
                  </div>
                </div>

                {/* Image + fields */}
                <div
                  style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.25rem' }}
                  className="product-img-grid"
                >
                  <div>
                    {id && (
                      <ImageUpload
                        productId={Number(id)}
                        currentImage={(product as any)?.imageUrl}
                        onImageUpload={() => {
                          queryClient.invalidateQueries({ queryKey: ['product', id] });
                          toastUpdated(t('imageUpdatedSuccessfully'));
                        }}
                        onImageRemove={() => {
                          queryClient.invalidateQueries({ queryKey: ['product', id] });
                          toastDeleted(t('imageRemovedSuccessfully'));
                        }}
                        folder="products"
                        maxSizeMB={5}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                          placeholder={t('eanBarcodeePlaceholder')}
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
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Classification */}
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
                      style={{
                        margin: 0,
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      Classification
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
                    <SlidersHorizontal
                      style={{ width: '1rem', height: '1rem', color: '#7c3aed' }}
                    />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
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
                    {
                      key: 'isEnabled' as const,
                      label: t('enabled'),
                      desc: t('enabledDescription'),
                    },
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
                            style={{
                              fontSize: '0.75rem',
                              color: '#94a3b8',
                              margin: '0.125rem 0 0',
                            }}
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
            </div>
          </div>
        </TabPanel>
        <TabPanel header={t('pricing') || 'Tarification'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Sale Price */}
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
                        placeholder="Select unit"
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
                      style={{ maxWidth: '16rem', width: '100%' }}
                    />
                  )}
                />
              </div>
            </div>

            {/* Cost Price */}
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
                        placeholder="Select unit"
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
        </TabPanel>
        <TabPanel header={t('stock') || 'Stock'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* ── Summary KPI cards ── */}
            {(() => {
              const globalUomCode = (product as any)?.saleUnitOfMeasure?.code ?? '';
              const kpis: {
                label: string;
                value: number;
                Icon: React.ElementType;
                color: string;
                iconBg: string;
                accent: string;
              }[] = [
                {
                  label: t('onHand'),
                  value: totalOnHand,
                  Icon: Package,
                  color: '#0f172a',
                  iconBg: '#f1f5f9',
                  accent: '#94a3b8',
                },
                {
                  label: t('available'),
                  value: totalAvailable,
                  Icon: CheckCircle,
                  color: '#059669',
                  iconBg: '#ecfdf5',
                  accent: '#10b981',
                },
                {
                  label: t('reserved'),
                  value: totalReserved,
                  Icon: Lock,
                  color: '#d97706',
                  iconBg: '#fffbeb',
                  accent: '#f59e0b',
                },
                {
                  label: t('incoming'),
                  value: totalIncoming,
                  Icon: TrendingUp,
                  color: '#2563eb',
                  iconBg: '#eff6ff',
                  accent: '#3b82f6',
                },
                {
                  label: t('outgoing'),
                  value: totalOutgoing,
                  Icon: TrendingDown,
                  color: '#ea580c',
                  iconBg: '#fff7ed',
                  accent: '#f97316',
                },
              ];
              return (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '0.875rem',
                    }}
                  >
                    {kpis.map(({ label, value, Icon, color, iconBg, accent }) => (
                      <div
                        key={label}
                        style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.875rem',
                          padding: '1.25rem',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: accent,
                            borderRadius: '0.875rem 0.875rem 0 0',
                          }}
                        />
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            marginBottom: '0.875rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: '#94a3b8',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}
                          >
                            {label}
                          </span>
                          <div
                            style={{
                              width: '2rem',
                              height: '2rem',
                              borderRadius: '0.5rem',
                              background: iconBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={14} color={color} />
                          </div>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            color,
                            lineHeight: 1,
                            letterSpacing: '-0.025em',
                          }}
                        >
                          {value.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {globalUomCode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                        Unité de mesure :
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.1875rem 0.625rem',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '9999px',
                          color: '#475569',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {globalUomCode}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── Stock table panel ── */}
            <div
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid #f1f5f9',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '0.625rem',
                      background: 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
                      border: '1px solid #86efac',
                      flexShrink: 0,
                    }}
                  >
                    <Building2 style={{ width: '1rem', height: '1rem', color: '#16a34a' }} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      {t('stockManagement')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                      {stockQuants.length} {stockQuants.length === 1 ? 'entrepôt' : 'entrepôts'}
                    </p>
                  </div>
                </div>
                <div className="prod-stock-btns" style={{ display: 'flex', gap: '0.625rem' }}>
                  <Button
                    onClick={() => setShowStockCorrection(true)}
                    icon={<Plus style={{ width: '0.875rem', height: '0.875rem' }} />}
                    label={t('correctStock')}
                    size="small"
                    outlined
                  />
                  <Button
                    onClick={() => setShowStockTransfer(true)}
                    icon={<ArrowRightLeft style={{ width: '0.875rem', height: '0.875rem' }} />}
                    label={t('transferStock')}
                    size="small"
                    severity="help"
                    outlined
                  />
                </div>
              </div>

              {/* Warehouse cards */}
              {stockQuants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                  <Building2
                    style={{ width: 48, height: 48, margin: '0 auto 1rem', opacity: 0.25 }}
                  />
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>
                    {t('noStockRecordsFound')}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem',
                    padding: '1rem 1.25rem',
                  }}
                >
                  {stockQuants.map((row: any) => {
                    const onHand = parseFloat(row.quantity?.toString() || '0');
                    const available = parseFloat(row.availableQuantity?.toString() || '0');
                    const reserved = parseFloat(row.reservedQuantity?.toString() || '0');
                    const incoming = parseFloat(row.incomingQuantity?.toString() || '0');
                    const outgoing = parseFloat(row.outgoingQuantity?.toString() || '0');
                    const isInStock = available > 0;
                    const metrics = [
                      {
                        label: t('onHand'),
                        display: onHand.toFixed(2),
                        sign: '',
                        color: '#0f172a',
                        dimBg: 'transparent',
                      },
                      {
                        label: t('available'),
                        display: available.toFixed(2),
                        sign: '',
                        color: isInStock ? '#059669' : '#ef4444',
                        dimBg: isInStock ? '#f0fdf4' : '#fef2f2',
                      },
                      {
                        label: t('reserved'),
                        display: reserved > 0 ? reserved.toFixed(2) : '—',
                        sign: '',
                        color: reserved > 0 ? '#d97706' : '#cbd5e1',
                        dimBg: '#fffbeb',
                      },
                      {
                        label: t('incoming'),
                        display: incoming > 0 ? incoming.toFixed(2) : '—',
                        sign: incoming > 0 ? '+' : '',
                        color: incoming > 0 ? '#2563eb' : '#cbd5e1',
                        dimBg: '#eff6ff',
                      },
                      {
                        label: t('outgoing'),
                        display: outgoing > 0 ? outgoing.toFixed(2) : '—',
                        sign: outgoing > 0 ? '-' : '',
                        color: outgoing > 0 ? '#ea580c' : '#cbd5e1',
                        dimBg: '#fff7ed',
                      },
                    ];
                    return (
                      <div
                        key={row.id ?? row.warehouse?.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.875rem',
                          background: '#fff',
                          overflow: 'hidden',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        {/* card header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <span
                              style={{
                                width: '0.5rem',
                                height: '0.5rem',
                                borderRadius: '50%',
                                flexShrink: 0,
                                background: isInStock ? '#22c55e' : '#d1d5db',
                                display: 'inline-block',
                                boxShadow: isInStock ? '0 0 0 3px #dcfce7' : 'none',
                              }}
                            />
                            <span
                              style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}
                            >
                              {row.warehouse?.name || t('unknown')}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '0.1875rem 0.625rem',
                              borderRadius: '9999px',
                              background: isInStock ? '#dcfce7' : '#f1f5f9',
                              color: isInStock ? '#15803d' : '#64748b',
                              border: `1px solid ${isInStock ? '#bbf7d0' : '#e2e8f0'}`,
                            }}
                          >
                            {isInStock ? 'En stock' : 'Rupture'}
                          </span>
                        </div>
                        {/* metrics row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
                          {metrics.map(({ label, display, sign, color, dimBg }, i) => (
                            <div
                              key={label}
                              style={{
                                padding: '0.875rem 0.5rem',
                                background: dimBg,
                                borderRight: i < 4 ? '1px solid #f1f5f9' : 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.625rem',
                                  fontWeight: 700,
                                  color: '#94a3b8',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.07em',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {label}
                              </span>
                              <span
                                style={{
                                  fontSize: '1.0625rem',
                                  fontWeight: 800,
                                  color,
                                  lineHeight: 1,
                                }}
                              >
                                {sign}
                                {display}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabPanel>
      </TabView>

      {/* ── Stock Correction Dialog ── */}
      <Dialog
        visible={showStockCorrection}
        onHide={() => setShowStockCorrection(false)}
        header={t('correctStock')}
        style={{ width: '32rem' }}
        modal
        footer={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              outlined
              onClick={() => setShowStockCorrection(false)}
              label={t('cancel')}
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleStockCorrection}
              disabled={
                !stockCorrectionData.warehouseId ||
                !stockCorrectionData.quantity ||
                stockCorrectionMutation.isPending
              }
              loading={stockCorrectionMutation.isPending}
              label={t('validate')}
              style={{ flex: 1 }}
            />
          </div>
        }
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}
        >
          {warehouses.length === 0 && <Message severity="warn" text={t('noWarehouseCreateOne')} />}

          <div className="p-field">
            <label className="p-label">{t('warehouse')} *</label>
            <Dropdown
              value={stockCorrectionData.warehouseId}
              onChange={(e) =>
                setStockCorrectionData({ ...stockCorrectionData, warehouseId: e.value })
              }
              options={[
                { label: warehousesLoading ? t('loading') : t('selectWarehouse'), value: '' },
                ...warehouseDropdownOptions,
              ]}
              disabled={warehouses.length === 0}
              style={{ width: '100%' }}
            />
          </div>

          <div className="p-field">
            <label className="p-label">Operation *</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.375rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RadioButton
                  value="add"
                  checked={stockCorrectionData.operation === 'add'}
                  onChange={() =>
                    setStockCorrectionData({ ...stockCorrectionData, operation: 'add' })
                  }
                />
                <span style={{ fontSize: '0.875rem' }}>{t('add')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RadioButton
                  value="remove"
                  checked={stockCorrectionData.operation === 'remove'}
                  onChange={() =>
                    setStockCorrectionData({ ...stockCorrectionData, operation: 'remove' })
                  }
                />
                <span style={{ fontSize: '0.875rem' }}>{t('remove')}</span>
              </label>
            </div>
          </div>

          <div className="p-field">
            <label className="p-label">{t('quantity')} *</label>
            <InputText
              type="number"
              min="0"
              value={stockCorrectionData.quantity}
              onChange={(e) =>
                setStockCorrectionData({ ...stockCorrectionData, quantity: e.target.value })
              }
              style={{ width: '100%' }}
            />
          </div>

          <div className="p-field">
            <label className="p-label">{t('unitPrice')}</label>
            <InputText
              type="number"
              step="0.01"
              min="0"
              value={stockCorrectionData.unitPrice}
              onChange={(e) =>
                setStockCorrectionData({ ...stockCorrectionData, unitPrice: e.target.value })
              }
              style={{ width: '100%' }}
            />
          </div>

          <div className="p-field">
            <label className="p-label">{t('notes')}</label>
            <InputText
              value={stockCorrectionData.notes}
              onChange={(e) =>
                setStockCorrectionData({ ...stockCorrectionData, notes: e.target.value })
              }
              placeholder={`Stock correction — ${product.code || product.name}`}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Dialog>

      {/* ── Stock Transfer Dialog ── */}
      <Dialog
        visible={showStockTransfer}
        onHide={() => setShowStockTransfer(false)}
        header={t('transferStock')}
        style={{ width: '32rem' }}
        modal
        footer={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              outlined
              onClick={() => setShowStockTransfer(false)}
              label={t('cancel')}
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleStockTransfer}
              disabled={
                !stockTransferData.sourceWarehouseId ||
                !stockTransferData.destWarehouseId ||
                !stockTransferData.quantity ||
                stockTransferMutation.isPending
              }
              loading={stockTransferMutation.isPending}
              label={t('transfer')}
              style={{ flex: 1 }}
            />
          </div>
        }
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}
        >
          {warehouses.length === 0 && <Message severity="warn" text={t('noWarehouseCreateOne')} />}

          <div className="p-field">
            <label className="p-label">Source warehouse *</label>
            <Dropdown
              value={stockTransferData.sourceWarehouseId}
              onChange={(e) =>
                setStockTransferData({ ...stockTransferData, sourceWarehouseId: e.value })
              }
              options={[
                { label: warehousesLoading ? t('loading') : t('selectSourceWarehouse'), value: '' },
                ...warehouseDropdownOptions,
              ]}
              disabled={warehouses.length === 0}
              style={{ width: '100%' }}
            />
          </div>

          <div className="p-field">
            <label className="p-label">Destination warehouse *</label>
            <Dropdown
              value={stockTransferData.destWarehouseId}
              onChange={(e) =>
                setStockTransferData({ ...stockTransferData, destWarehouseId: e.value })
              }
              options={[
                {
                  label: warehousesLoading ? t('loading') : t('selectDestinationWarehouse'),
                  value: '',
                },
                ...destWarehouseOptions,
              ]}
              disabled={warehouses.length === 0}
              style={{ width: '100%' }}
            />
          </div>

          <div className="p-field">
            <label className="p-label">{t('quantity')} *</label>
            <InputText
              type="number"
              min="0"
              value={stockTransferData.quantity}
              onChange={(e) =>
                setStockTransferData({ ...stockTransferData, quantity: e.target.value })
              }
              style={{ width: '100%' }}
            />
          </div>

          <div className="p-field">
            <label className="p-label">{t('notes')}</label>
            <InputText
              value={stockTransferData.notes}
              onChange={(e) =>
                setStockTransferData({ ...stockTransferData, notes: e.target.value })
              }
              placeholder={`Stock transfer — ${product.code || product.name}`}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Dialog>
    </AdminLayout>
  );
}
