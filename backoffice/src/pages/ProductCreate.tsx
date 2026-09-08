import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productsService } from '../modules/products';
import {
  productFormSchema,
  type ProductFormValues,
} from '../modules/products/schemas/product-form.schema';
import { warehousesService } from '../modules/warehouses';
import { taxesService } from '../modules/taxes';
import { categoriesService } from '../modules/categories';
import { brandsService } from '../modules/brands';
import { uomService } from '../modules/uom';
import { apiClient, API_ROUTES } from '../common';
import { AdminLayout } from '../components/AdminLayout';
import { DocPageHeader } from '../components/DocPageHeader';
import { useApiErrors } from '../hooks/useApiErrors';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import type { TranslationKey } from '../lib/i18n';
import { Package } from 'lucide-react';
import { Button } from 'primereact/button';
import { toastCreated, toastError, toastSuccess } from '../services/toast.service';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';
import { useLanguage } from '../context/LanguageContext';
import { ProductForm, FormErrorSummary, FIELD_IDS, type SummaryEntry } from '../components/product';

/** Only the part of the inventory configuration this page needs. */
interface InventoryConfigShape {
  values?: { defaultWarehouseId?: number | null };
}

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

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsService.getAll(),
  });

  const { data: uoms = [] } = useQuery({
    queryKey: ['uom'],
    queryFn: () => uomService.getAll(),
  });

  /** Inventory settings — shares the cache key used by the settings page. */
  const { data: inventoryConfig } = useQuery<InventoryConfigShape>({
    queryKey: ['configurations', 'inventory'],
    queryFn: async () => {
      const response = await apiClient.get<InventoryConfigShape>(
        API_ROUTES.CONFIGURATIONS.BY_ENTITY('inventory'),
      );
      return response.data;
    },
  });

  const taxRates = taxesConfig?.rates || [];

  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [summary, setSummary] = useState<SummaryEntry[]>([]);

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
      brandId: null,
      warehouseId: null,
      isService: false,
      isEnabled: true,
      isPriceChangeAllowed: true,
    },
  });

  const {
    handleSubmit: rhfHandleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = form;
  const { handleApiErrors } = useApiErrors(form);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (uoms.length > 0) {
      const defaultUom = uoms.find((u: any) => u.code === 'UNIT') || uoms[0];
      if (defaultUom) {
        setValue('saleUnitId', defaultUom.id, { shouldDirty: false });
        setValue('purchaseUnitId', defaultUom.id, { shouldDirty: false });
      }
    }
  }, [uoms, setValue]);

  /**
   * Preselect the warehouse: the one configured in Inventory settings if it
   * still exists, otherwise the first available. Never overrides a choice the
   * user has already made, and never marks the form dirty.
   */
  useEffect(() => {
    if (warehouses.length === 0) return;
    if (form.getValues().warehouseId != null) return;

    const configuredId = inventoryConfig?.values?.defaultWarehouseId ?? null;
    const configured = warehouses.find((w: any) => w.id === configuredId);
    const chosen = configured ?? warehouses[0];

    if (chosen) {
      setValue('warehouseId', chosen.id, { shouldDirty: false, shouldValidate: false });
    }
  }, [warehouses, inventoryConfig, form, setValue]);

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
    setSummary([]);
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
      brandId: data.brandId ?? null,
      isService: data.isService,
      isEnabled: data.isEnabled,
      isPriceChangeAllowed: data.isPriceChangeAllowed,
      saleUnitId: data.saleUnitId,
      purchaseUnitId: data.purchaseUnitId,
    });
  };

  /** Field labels for the error summary, keyed by form field name. */
  const fieldLabels = useMemo(
    () =>
      ({
        name: t('productName'),
        code: t('productCodeEAN13'),
        description: t('description'),
        price: t('price'),
        cost: t('costPrice'),
        minPrice: t('minPrice'),
        warehouseId: t('warehouse'),
      }) as Record<string, string>,
    [t],
  );

  const onInvalidSubmit = () => {
    setSummary(
      Object.entries(errors)
        .filter(([field]) => field in FIELD_IDS)
        .map(([field, e]) => ({
          fieldId: FIELD_IDS[field as keyof typeof FIELD_IDS],
          label: fieldLabels[field] ?? field,
          message: t((e as any)?.message as TranslationKey),
        })),
    );
    toastError(t('validationCheckFields'));
  };

  const saving = createMutation.isPending;

  return (
    <AdminLayout>
      <div className="pform-page">
        <DocPageHeader
          icon={<Package size={24} />}
          parentLabel={t('products')}
          currentLabel={t('createNewProduct')}
          title={t('newProductLabel')}
          onBack={() => navigate('/products')}
          backAriaLabel={t('backToProducts')}
        />

        <form onSubmit={rhfHandleSubmit(onSubmit, onInvalidSubmit)} noValidate>
          <FormErrorSummary entries={summary} />

          <ProductForm
            mode="create"
            form={form}
            options={{ warehouses, taxRates, categories, brands, uoms }}
            currency={currency}
            isGeneratingCode={isGeneratingCode}
            onRegenerateCode={handleRegenerateCode}
            saving={saving}
          />

          {/* ── Sticky action bar ── */}
          <div className="pform-actions">
            <Button
              type="button"
              outlined
              label={t('cancel')}
              disabled={saving}
              onClick={() => navigate('/products')}
            />
            <Button type="submit" label={t('createProduct')} loading={saving} disabled={saving} />
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
