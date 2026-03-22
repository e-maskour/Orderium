import { useState } from 'react';
import { UserCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { CreateAdminPayload } from '../../api/onboarding';

interface AdminStepProps {
    onNext: (data: CreateAdminPayload) => Promise<void>;
    onBack: () => void;
}

function getPasswordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
    if (password.length === 0) return { level: 0, label: '', color: '#e2e8f0' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 3) return { level: 2, label: 'Medium', color: '#f59e0b' };
    return { level: 3, label: 'Strong', color: '#10b981' };
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    fontSize: '0.9375rem',
    color: '#0f172a',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.375rem',
};

export default function AdminStep({ onNext, onBack }: AdminStepProps) {
    const [form, setForm] = useState<CreateAdminPayload>({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
    });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const strength = getPasswordStrength(form.password);

    const set = (field: keyof CreateAdminPayload, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!form.fullName.trim()) errs.fullName = 'Full name is required';
        if (!form.email.trim()) errs.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
        const normalizedPhone = form.phoneNumber.replace(/[\s\-().]/g, '');
        if (!normalizedPhone) errs.phoneNumber = 'Phone number is required';
        else if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) errs.phoneNumber = 'Use digits only, e.g. +212600000000';
        if (!form.password) errs.password = 'Password is required';
        else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
        if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
        else if (form.password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        try {
            // Normalize phone: strip spaces, dashes, parens so backend validation passes
            await onNext({
                ...form,
                phoneNumber: form.phoneNumber.replace(/[\s\-().]/g, ''),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const focusStyle = (field: string): React.CSSProperties => ({
        ...inputStyle,
        borderColor: errors[field] ? '#ef4444' : undefined,
        paddingRight: field === 'password' || field === 'confirmPassword' ? '2.75rem' : undefined,
    });

    return (
        <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div
                    style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        background: '#f0f4ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <UserCircle size={20} style={{ color: '#235ae4' }} />
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                    Create your super-admin account. This will be your login to manage the platform.
                </p>
            </div>

            {/* Full Name */}
            <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                    style={focusStyle('fullName')}
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                    placeholder="Ahmed Benali"
                    autoComplete="name"
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                    onBlur={(e) =>
                        (e.currentTarget.style.borderColor = errors.fullName ? '#ef4444' : '#e2e8f0')
                    }
                />
                {errors.fullName && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.fullName}</span>
                )}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                    style={focusStyle('email')}
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="ahmed@company.com"
                    type="email"
                    autoComplete="email"
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                    onBlur={(e) =>
                        (e.currentTarget.style.borderColor = errors.email ? '#ef4444' : '#e2e8f0')
                    }
                />
                {errors.email && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.email}</span>
                )}
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>
                    Phone Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                    style={focusStyle('phoneNumber')}
                    value={form.phoneNumber}
                    onChange={(e) => set('phoneNumber', e.target.value)}
                    placeholder="+212600000000"
                    type="tel"
                    autoComplete="tel"
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                    onBlur={(e) =>
                        (e.currentTarget.style.borderColor = errors.phoneNumber ? '#ef4444' : '#e2e8f0')
                    }
                />
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    This will be your login username
                </div>
                {errors.phoneNumber && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.phoneNumber}</span>
                )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>
                    Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                    <input
                        style={focusStyle('password')}
                        value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                        placeholder="At least 8 characters"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                        onBlur={(e) =>
                            (e.currentTarget.style.borderColor = errors.password ? '#ef4444' : '#e2e8f0')
                        }
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        style={{
                            position: 'absolute',
                            right: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: 0,
                            display: 'flex',
                        }}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                {/* Strength bar */}
                {form.password.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: '0.25rem',
                                        borderRadius: '9999px',
                                        background: strength.level >= i ? strength.color : '#e2e8f0',
                                        transition: 'background 0.2s',
                                    }}
                                />
                            ))}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600 }}>
                            {strength.label}
                        </span>
                    </div>
                )}
                {errors.password && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>
                        {errors.password}
                    </span>
                )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>
                    Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                    <input
                        style={{
                            ...inputStyle,
                            paddingRight: '2.75rem',
                            borderColor: errors.confirmPassword ? '#ef4444' : undefined,
                        }}
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: '' }));
                        }}
                        placeholder="Re-enter your password"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                        onBlur={(e) =>
                            (e.currentTarget.style.borderColor = errors.confirmPassword ? '#ef4444' : '#e2e8f0')
                        }
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        style={{
                            position: 'absolute',
                            right: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: 0,
                            display: 'flex',
                        }}
                    >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
                {errors.confirmPassword && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.confirmPassword}</span>
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isLoading}
                    style={{
                        flex: '0 0 auto',
                        padding: '0.875rem 1.25rem',
                        borderRadius: '0.75rem',
                        background: '#f1f5f9',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        border: '1px solid #e2e8f0',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                >
                    ← Back
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '0.875rem',
                        borderRadius: '0.75rem',
                        background: isLoading
                            ? '#94a3b8'
                            : 'linear-gradient(135deg, #235ae4 0%, #1a47b8 100%)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '1rem',
                        border: 'none',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                    }}
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            Creating account...
                        </>
                    ) : (
                        'Create Admin Account →'
                    )}
                </button>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </form>
    );
}
