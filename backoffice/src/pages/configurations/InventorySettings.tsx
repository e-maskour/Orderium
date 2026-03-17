import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Loader2, Save, AlertCircle, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toastUpdated, toastError } from '../../services/toast.service';
import { apiClient, API_ROUTES } from '../../common';
import { warehousesService } from '../../modules/warehouses/warehouses.service';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';

interface InventoryConfigValues {
    defaultWarehouseId: number | null;
    incrementStockOnInvoiceAchat: boolean;
    decrementStockOnInvoiceVente: boolean;
    incrementStockOnOrderAchat: boolean;
    decrementStockOnOrderVente: boolean;
}

interface InventoryConfig {
    id: number;
    entity: string;
    values: InventoryConfigValues;
}

type IncrementTrigger = null | 'invoice' | 'order';
type DecrementTrigger = null | 'invoice' | 'order';

const DEFAULT_VALUES: InventoryConfigValues = {
    defaultWarehouseId: null,
    incrementStockOnInvoiceAchat: false,
    decrementStockOnInvoiceVente: false,
    incrementStockOnOrderAchat: false,
    decrementStockOnOrderVente: false,
};

function valuestoTriggers(v: InventoryConfigValues): { inc: IncrementTrigger; dec: DecrementTrigger } {
    return {
        inc: v.incrementStockOnInvoiceAchat ? 'invoice' : v.incrementStockOnOrderAchat ? 'order' : null,
        dec: v.decrementStockOnInvoiceVente ? 'invoice' : v.decrementStockOnOrderVente ? 'order' : null,
    };
}

function triggersToValues(
    warehouseId: number | null,
    inc: IncrementTrigger,
    dec: DecrementTrigger,
): InventoryConfigValues {
    return {
        defaultWarehouseId: warehouseId,
        incrementStockOnInvoiceAchat: inc === 'invoice',
        incrementStockOnOrderAchat: inc === 'order',
        decrementStockOnInvoiceVente: dec === 'invoice',
        decrementStockOnOrderVente: dec === 'order',
    };
}

const OPTION_CARD_BASE: React.CSSProperties = {
    flex: 1,
    padding: '1rem',
    borderRadius: '0.5rem',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background-color 0.15s',
    userSelect: 'none',
};

function OptionCard({
    label,
    sublabel,
    selected,
    onClick,
    accentColor,
}: {
    label: string;
    sublabel?: string;
    selected: boolean;
    onClick: () => void;
    accentColor: string;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                ...OPTION_CARD_BASE,
                borderColor: selected ? accentColor : '#e2e8f0',
                backgroundColor: selected ? `${accentColor}10` : '#f8fafc',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                    width: '1rem',
                    height: '1rem',
                    borderRadius: '50%',
                    border: `2px solid ${selected ? accentColor : '#94a3b8'}`,
                    backgroundColor: selected ? accentColor : 'transparent',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {selected && <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', backgroundColor: '#fff' }} />}
                </div>
                <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: selected ? 600 : 500, color: selected ? '#1e293b' : '#475569' }}>
                        {label}
                    </div>
                    {sublabel && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                            {sublabel}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function InventorySettings() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [warehouseId, setWarehouseId] = useState<number | null>(null);
    const [incTrigger, setIncTrigger] = useState<IncrementTrigger>(null);
    const [decTrigger, setDecTrigger] = useState<DecrementTrigger>(null);

    const { data: config, isLoading: configLoading } = useQuery<InventoryConfig>({
        queryKey: ['configurations', 'inventory'],
        queryFn: async () => {
            const response = await apiClient.get<InventoryConfig>(
                API_ROUTES.CONFIGURATIONS.BY_ENTITY('inventory'),
            );
            return response.data;
        },
    });

    const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
        queryKey: ['warehouses'],
        queryFn: () => warehousesService.getAll(),
    });

    useEffect(() => {
        if (config?.values) {
            const vals = { ...DEFAULT_VALUES, ...config.values };
            const { inc, dec } = valuestoTriggers(vals);
            setWarehouseId(vals.defaultWarehouseId);
            setIncTrigger(inc);
            setDecTrigger(dec);
        }
    }, [config]);

    const updateMutation = useMutation({
        mutationFn: (values: InventoryConfigValues) =>
            apiClient.put(API_ROUTES.CONFIGURATIONS.UPDATE(config!.id), { values }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configurations', 'inventory'] });
            toastUpdated(t('inventorySettingsSaved'));
        },
        onError: (error: Error) => {
            toastError(error.message || t('errorSaving'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (config) {
            updateMutation.mutate(triggersToValues(warehouseId, incTrigger, decTrigger));
        }
    };

    const isLoading = configLoading || warehousesLoading;

    if (isLoading) {
        return (
            <AdminLayout>
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
                    <Loader2 style={{ width: '2rem', height: '2rem', color: '#6366f1' }} className="animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    const warehouseOptions = warehouses.map(wh => ({ label: wh.name, value: wh.id }));
    const anyMovementEnabled = incTrigger !== null || decTrigger !== null;
    const noWarehouseSelected = !warehouseId;

    return (
        <AdminLayout>
            <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
            <PageHeader
                icon={Package}
                title={t('inventorySettings')}
                subtitle={t('inventorySettingsSubtitle')}
                actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Button
                            onClick={() => { if (config) updateMutation.mutate(triggersToValues(warehouseId, incTrigger, decTrigger)); }}
                            icon={updateMutation.isPending ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Save style={{ width: 16, height: 16 }} />}
                            label={t('save')}
                            disabled={updateMutation.isPending || !config}
                            size="small"
                        />
                    </div>
                }
            />

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Default Warehouse */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                            {t('defaultWarehouse')}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                {t('defaultWarehouse')}
                            </label>
                            <Dropdown
                                value={warehouseId}
                                options={warehouseOptions}
                                onChange={e => setWarehouseId(e.value ?? null)}
                                placeholder={t('selectDefaultWarehouse')}
                                showClear
                                style={{ width: '100%', maxWidth: '24rem' }}
                            />
                        </div>

                        {anyMovementEnabled && noWarehouseSelected && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#fef9c3', borderRadius: '0.375rem', border: '1px solid #fde047' }}>
                                <AlertCircle style={{ width: '1rem', height: '1rem', color: '#854d0e', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.875rem', color: '#854d0e' }}>
                                    {t('noWarehouseConfigured')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Stock Movement Automation */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem' }}>
                            {t('stockMovementAutomation')}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {/* Increment group */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <TrendingUp style={{ width: '1rem', height: '1rem', color: '#22c55e' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534' }}>
                                        {t('incrementStock') || 'Increment Stock'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <OptionCard
                                        label={t('incrementOnInvoiceAchat')}
                                        sublabel="Facture Achat"
                                        selected={incTrigger === 'invoice'}
                                        onClick={() => setIncTrigger('invoice')}
                                        accentColor="#22c55e"
                                    />
                                    <OptionCard
                                        label={t('incrementOnOrderAchat')}
                                        sublabel="Bon d'achat"
                                        selected={incTrigger === 'order'}
                                        onClick={() => setIncTrigger('order')}
                                        accentColor="#22c55e"
                                    />
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #f1f5f9' }} />

                            {/* Decrement group */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <TrendingDown style={{ width: '1rem', height: '1rem', color: '#ef4444' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#991b1b' }}>
                                        {t('decrementStock') || 'Decrement Stock'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <OptionCard
                                        label={t('decrementOnInvoiceVente')}
                                        sublabel="Facture Vente"
                                        selected={decTrigger === 'invoice'}
                                        onClick={() => setDecTrigger('invoice')}
                                        accentColor="#ef4444"
                                    />
                                    <OptionCard
                                        label={t('decrementOnOrderVente')}
                                        sublabel="Bon de livraison"
                                        selected={decTrigger === 'order'}
                                        onClick={() => setDecTrigger('order')}
                                        accentColor="#ef4444"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </form>
            </div>
        </AdminLayout>
    );
}

