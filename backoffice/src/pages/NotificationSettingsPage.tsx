import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { Bell, RefreshCw, Save } from 'lucide-react';
import {
    notificationTemplatesService,
    type NotificationTemplate,
    type UpdateNotificationTemplateDTO,
    CATEGORY_LABELS,
    CATEGORY_ICONS,
    type NotificationTemplateCategory,
} from '../modules/notification-templates';
import { toastSuccess, toastError } from '../services/toast.service';

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Basse',
    medium: 'Moyenne',
    high: 'Haute',
    urgent: 'Urgente',
};

const PRIORITY_SEVERITIES: Record<string, 'secondary' | 'info' | 'warning' | 'danger'> = {
    low: 'secondary',
    medium: 'info',
    high: 'warning',
    urgent: 'danger',
};

interface EditState {
    titleFr: string;
    bodyFr: string;
    titleAr: string;
    bodyAr: string;
    priority: string;
}

export default function NotificationSettingsPage() {
    const queryClient = useQueryClient();

    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
    const [editState, setEditState] = useState<EditState>({
        titleFr: '',
        bodyFr: '',
        titleAr: '',
        bodyAr: '',
        priority: 'medium',
    });
    const [confirmResetAll, setConfirmResetAll] = useState(false);

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['notification-templates'],
        queryFn: () => notificationTemplatesService.getAll(),
    });

    const toggleMutation = useMutation({
        mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
            notificationTemplatesService.toggle(key, enabled),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
        },
        onError: () => toastError('Erreur lors de la mise à jour du statut'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ key, dto }: { key: string; dto: UpdateNotificationTemplateDTO }) =>
            notificationTemplatesService.update(key, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
            setEditingTemplate(null);
            toastSuccess('Modèle de notification mis à jour');
        },
        onError: () => toastError('Erreur lors de la mise à jour du modèle'),
    });

    const resetOneMutation = useMutation({
        mutationFn: (key: string) => notificationTemplatesService.resetOne(key),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
            setEditingTemplate(null);
            toastSuccess('Modèle réinitialisé aux valeurs par défaut');
        },
        onError: () => toastError('Erreur lors de la réinitialisation'),
    });

    const resetAllMutation = useMutation({
        mutationFn: () => notificationTemplatesService.resetAll(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
            setConfirmResetAll(false);
            toastSuccess('Tous les modèles réinitialisés aux valeurs par défaut');
        },
        onError: () => toastError('Erreur lors de la réinitialisation globale'),
    });

    const grouped = useMemo(() => {
        const map: Partial<Record<NotificationTemplateCategory, NotificationTemplate[]>> = {};
        for (const tpl of templates) {
            if (!map[tpl.category]) map[tpl.category] = [];
            map[tpl.category]!.push(tpl);
        }
        return map;
    }, [templates]);

    const openEdit = (tpl: NotificationTemplate) => {
        setEditingTemplate(tpl);
        setEditState({
            titleFr: tpl.titleFr,
            bodyFr: tpl.bodyFr,
            titleAr: tpl.titleAr,
            bodyAr: tpl.bodyAr,
            priority: tpl.priority,
        });
    };

    const saveEdit = () => {
        if (!editingTemplate) return;
        updateMutation.mutate({ key: editingTemplate.key, dto: editState });
    };

    return (
        <AdminLayout>
            <PageHeader
                title="Paramètres des Notifications"
                subtitle="Configurez les modèles et activez/désactivez chaque type de notification"
                icon={<Bell className="w-6 h-6" />}
                actions={
                    <Button
                        label="Réinitialiser tout"
                        icon={<RefreshCw className="w-4 h-4 mr-2" />}
                        severity="secondary"
                        outlined
                        size="small"
                        onClick={() => setConfirmResetAll(true)}
                    />
                }
            />

            {isLoading ? (
                <div className="flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: 'var(--primary-color)' }} />
                </div>
            ) : (
                <div className="flex flex-column gap-4 pb-6">
                    {(Object.keys(CATEGORY_LABELS) as NotificationTemplateCategory[]).map((category) => {
                        const items = grouped[category];
                        if (!items || items.length === 0) return null;
                        return (
                            <div key={category} className="surface-card border-round shadow-1 overflow-hidden">
                                {/* Category Header */}
                                <div className="px-4 py-3 flex align-items-center gap-2 border-bottom-1 surface-border"
                                    style={{ background: 'var(--surface-50)' }}>
                                    <i className={`${CATEGORY_ICONS[category]} text-primary`} />
                                    <span className="font-semibold text-900">{CATEGORY_LABELS[category]}</span>
                                    <span className="text-500 text-sm ml-1">({items.length})</span>
                                </div>

                                {/* Template rows */}
                                <div>
                                    {items.map((tpl, idx) => (
                                        <div key={tpl.key}
                                            className={`px-4 py-3 flex align-items-center gap-3 ${idx < items.length - 1 ? 'border-bottom-1 surface-border' : ''}`}>
                                            {/* Toggle */}
                                            <InputSwitch
                                                checked={tpl.enabled}
                                                onChange={(e) =>
                                                    toggleMutation.mutate({ key: tpl.key, enabled: !!e.value })
                                                }
                                                disabled={toggleMutation.isPending}
                                            />

                                            {/* Description */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex align-items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-900 text-sm">
                                                        {tpl.titleFr}
                                                    </span>
                                                    <Tag
                                                        value={PRIORITY_LABELS[tpl.priority] || tpl.priority}
                                                        severity={PRIORITY_SEVERITIES[tpl.priority] || 'info'}
                                                        className="text-xs"
                                                    />
                                                    {!tpl.enabled && (
                                                        <Tag value="Désactivée" severity="secondary" className="text-xs" />
                                                    )}
                                                </div>
                                                {tpl.description && (
                                                    <p className="text-500 text-xs mt-1 mb-0 white-space-nowrap overflow-hidden text-overflow-ellipsis"
                                                        style={{ maxWidth: '480px' }}>
                                                        {tpl.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Edit button */}
                                            <Button
                                                icon="pi pi-pencil"
                                                rounded
                                                text
                                                severity="secondary"
                                                size="small"
                                                title="Modifier le modèle"
                                                onClick={() => openEdit(tpl)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Edit Template Modal */}
            <Modal
                isOpen={!!editingTemplate}
                onClose={() => setEditingTemplate(null)}
                title={`Modifier — ${editingTemplate?.description || editingTemplate?.key || ''}`}
                size="lg"
            >
                {editingTemplate && (
                    <div className="flex flex-column gap-4">
                        {/* FR Fields */}
                        <div className="flex flex-column gap-2">
                            <label className="font-medium text-sm text-700">Titre (Français)</label>
                            <InputText
                                value={editState.titleFr}
                                onChange={(e) => setEditState((s) => ({ ...s, titleFr: e.target.value }))}
                                maxLength={255}
                            />
                        </div>
                        <div className="flex flex-column gap-2">
                            <label className="font-medium text-sm text-700">Corps du message (Français)</label>
                            <InputTextarea
                                value={editState.bodyFr}
                                onChange={(e) => setEditState((s) => ({ ...s, bodyFr: e.target.value }))}
                                rows={3}
                                autoResize
                            />
                            <span className="text-xs text-500">
                                Variables disponibles : <code>{'{{clientName}}'}</code>, <code>{'{{orderNumber}}'}</code>, <code>{'{{driverName}}'}</code>, etc.
                            </span>
                        </div>

                        {/* AR Fields */}
                        <div className="flex flex-column gap-2">
                            <label className="font-medium text-sm text-700">العنوان (Arabe)</label>
                            <InputText
                                value={editState.titleAr}
                                onChange={(e) => setEditState((s) => ({ ...s, titleAr: e.target.value }))}
                                maxLength={255}
                                dir="rtl"
                            />
                        </div>
                        <div className="flex flex-column gap-2">
                            <label className="font-medium text-sm text-700">نص الرسالة (Arabe)</label>
                            <InputTextarea
                                value={editState.bodyAr}
                                onChange={(e) => setEditState((s) => ({ ...s, bodyAr: e.target.value }))}
                                rows={3}
                                autoResize
                                dir="rtl"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-content-between align-items-center pt-2 border-top-1 surface-border">
                            <Button
                                label="Réinitialiser par défaut"
                                icon={<RefreshCw className="w-4 h-4 mr-2" />}
                                severity="secondary"
                                outlined
                                size="small"
                                loading={resetOneMutation.isPending}
                                onClick={() => resetOneMutation.mutate(editingTemplate.key)}
                            />
                            <div className="flex gap-2">
                                <Button
                                    label="Annuler"
                                    severity="secondary"
                                    outlined
                                    size="small"
                                    onClick={() => setEditingTemplate(null)}
                                />
                                <Button
                                    label="Enregistrer"
                                    icon={<Save className="w-4 h-4 mr-2" />}
                                    size="small"
                                    loading={updateMutation.isPending}
                                    onClick={saveEdit}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Confirm Reset All Modal */}
            <Modal
                isOpen={confirmResetAll}
                onClose={() => setConfirmResetAll(false)}
                title="Confirmer la réinitialisation"
                size="sm"
            >
                <div className="flex flex-column gap-4">
                    <p className="text-700 m-0">
                        Cette action va réinitialiser <strong>tous</strong> les modèles de notification
                        à leurs valeurs d'usine. Les modifications que vous avez apportées seront perdues.
                    </p>
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Annuler"
                            severity="secondary"
                            outlined
                            onClick={() => setConfirmResetAll(false)}
                        />
                        <Button
                            label="Réinitialiser tout"
                            severity="danger"
                            loading={resetAllMutation.isPending}
                            onClick={() => resetAllMutation.mutate()}
                        />
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
