import { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from 'primereact/avatar';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { User, Phone, Lock, Shield, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiClient, API_ROUTES } from '../common';
import { toastSuccess, toastError } from '../services/toast.service';

export default function ProfilePage() {
    const { admin } = useAuth();
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';
    const fontFamily = isRTL ? 'var(--font-arabic)' : 'var(--font-latin)';

    const getInitials = () => {
        const name = admin?.fullName || admin?.name || '';
        if (name.trim()) {
            const parts = name.trim().split(/\s+/);
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return name.trim().slice(0, 2).toUpperCase();
        }
        return 'AD';
    };

    const [fullName, setFullName] = useState(admin?.name || admin?.fullName || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (newPassword && newPassword !== confirmPassword) {
            toastError(t('passwordsDoNotMatch'));
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, string> = {};
            if (fullName.trim()) payload.name = fullName.trim();
            if (newPassword) {
                payload.currentPassword = currentPassword;
                payload.newPassword = newPassword;
            }

            await apiClient.patch(API_ROUTES.USERS.UPDATE(admin!.id), payload);

            const stored = localStorage.getItem('admin');
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.name = fullName.trim();
                parsed.fullName = fullName.trim();
                localStorage.setItem('admin', JSON.stringify(parsed));
            }

            toastSuccess(t('profileUpdatedSuccess'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch {
            toastError(t('profileUpdateError'));
        } finally {
            setSaving(false);
        }
    };

    const card = (children: React.ReactNode) => (
        <div style={{
            background: 'white', borderRadius: '0.75rem',
            border: '1px solid rgba(35,90,228,0.1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            padding: '1.5rem',
        }}>
            {children}
        </div>
    );

    const sectionTitle = (icon: React.ReactNode, label: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {icon}
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: isRTL ? '0' : '0.08em', fontFamily }}>
                {label}
            </span>
        </div>
    );

    return (
        <AdminLayout>
            <div style={{ direction: isRTL ? 'rtl' : 'ltr', fontFamily }}>
                <PageHeader
                    icon={User}
                    title={t('myProfile')}
                    subtitle={t('profileAndAccount')}
                    actions={
                        <Button
                            label={saving ? t('saving') : t('save')}
                            loading={saving}
                            onClick={handleSave}
                            style={{
                                background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                                border: 'none', fontFamily, fontWeight: 600,
                                minWidth: '10rem',
                            }}
                        />
                    }
                />

                <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* ── Identity card ── */}
                    {card(
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <Avatar
                                label={getInitials()}
                                shape="circle"
                                style={{
                                    width: '5rem', height: '5rem', flexShrink: 0,
                                    background: 'linear-gradient(135deg,#0f172a,#1a2342)',
                                    color: '#ffffff', fontWeight: 700, fontSize: '1.5rem',
                                }}
                            />
                            <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', color: '#111827', fontFamily }}>
                                    {admin?.fullName || admin?.phoneNumber || 'Admin'}
                                </p>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: '#6b7280', fontFamily }}>
                                    {admin?.phoneNumber}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.375rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    <Shield style={{ width: '0.8125rem', height: '0.8125rem', color: '#10b981' }} strokeWidth={2} />
                                    <span style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: 600, padding: '0.1875rem 0.625rem', background: '#ecfdf5', borderRadius: '1rem', fontFamily }}>
                                        {admin?.isSuperAdmin ? 'Super Admin' : t('administrator')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Account Info ── */}
                    {card(
                        <>
                            {sectionTitle(
                                <User style={{ width: '0.875rem', height: '0.875rem', color: '#6366f1' }} strokeWidth={2} />,
                                t('accountInfo'),
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', textAlign: isRTL ? 'right' : 'left', fontFamily }}>
                                        {t('fullName')}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <User style={{ width: '1rem', height: '1rem', color: '#9ca3af', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: isRTL ? 'auto' : '0.75rem', right: isRTL ? '0.75rem' : 'auto', pointerEvents: 'none', zIndex: 1 }} />
                                        <InputText
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            placeholder={t('fullName')}
                                            dir={isRTL ? 'rtl' : 'ltr'}
                                            style={{ width: '100%', paddingLeft: isRTL ? '0.75rem' : '2.5rem', paddingRight: isRTL ? '2.5rem' : '0.75rem', fontFamily }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', textAlign: isRTL ? 'right' : 'left', fontFamily }}>
                                        {t('phoneNumber')}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone style={{ width: '1rem', height: '1rem', color: '#9ca3af', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: isRTL ? 'auto' : '0.75rem', right: isRTL ? '0.75rem' : 'auto', pointerEvents: 'none', zIndex: 1 }} />
                                        <InputText
                                            value={admin?.phoneNumber || ''}
                                            disabled
                                            dir="ltr"
                                            style={{ width: '100%', paddingLeft: isRTL ? '0.75rem' : '2.5rem', paddingRight: isRTL ? '2.5rem' : '0.75rem', background: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed', fontFamily }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Security ── */}
                    {card(
                        <>
                            {sectionTitle(
                                <Lock style={{ width: '0.875rem', height: '0.875rem', color: '#f59e0b' }} strokeWidth={2} />,
                                t('securitySection'),
                            )}
                            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#9ca3af', textAlign: isRTL ? 'right' : 'left', fontFamily }}>
                                {t('leaveBlankToKeep')}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', textAlign: isRTL ? 'right' : 'left', fontFamily }}>
                                        {t('currentPassword')}
                                    </label>
                                    <Password
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        feedback={false}
                                        toggleMask
                                        placeholder={t('currentPassword')}
                                        inputStyle={{ width: '100%', fontFamily }}
                                        style={{ width: '100%', display: 'block' }}
                                        pt={{ input: { dir: isRTL ? 'rtl' : 'ltr' } }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', textAlign: isRTL ? 'right' : 'left', fontFamily }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                                            <KeyRound style={{ width: '0.8125rem', height: '0.8125rem', color: '#6b7280' }} strokeWidth={2} />
                                            {t('newPassword')}
                                        </span>
                                    </label>
                                    <Password
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        feedback
                                        toggleMask
                                        placeholder={t('newPassword')}
                                        inputStyle={{ width: '100%', fontFamily }}
                                        style={{ width: '100%', display: 'block' }}
                                        pt={{ input: { dir: isRTL ? 'rtl' : 'ltr' } }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', textAlign: isRTL ? 'right' : 'left', fontFamily }}>
                                        {t('confirmPassword')}
                                    </label>
                                    <Password
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        feedback={false}
                                        toggleMask
                                        placeholder={t('confirmPassword')}
                                        inputStyle={{ width: '100%', fontFamily, borderColor: confirmPassword && newPassword !== confirmPassword ? '#ef4444' : undefined }}
                                        style={{ width: '100%', display: 'block' }}
                                        pt={{ input: { dir: isRTL ? 'rtl' : 'ltr' } }}
                                    />
                                    {confirmPassword && newPassword !== confirmPassword && (
                                        <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: '#ef4444', textAlign: isRTL ? 'right' : 'left', fontFamily }}>
                                            {t('passwordsDoNotMatch')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}


                </div>
            </div>
        </AdminLayout>
    );
}
