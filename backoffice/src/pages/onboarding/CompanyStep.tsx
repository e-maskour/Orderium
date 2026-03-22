import { useState, useRef, useCallback } from 'react';
import {
    Building2,
    Phone,
    Mail,
    Globe,
    MapPin,
    FileText,
    Upload,
    X,
    Loader2,
} from 'lucide-react';
import type { ICompany } from '../../modules/company/company.interface';

interface CompanyStepProps {
    onNext: (data: ICompany) => Promise<void>;
}

const LEGAL_STRUCTURES = ['SARL', 'SA', 'SAS', 'SASU', 'SNC', 'Auto-Entrepreneur', 'Association', 'Other'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const COUNTRIES = [
    'Maroc', 'France', 'Belgique', 'Suisse', 'Espagne', 'Algérie', 'Tunisie',
    'Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Autre',
];

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    fontSize: '0.9375rem',
    color: '#0f172a',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.375rem',
};

const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '0.75rem 0 0.5rem',
    borderBottom: '1px solid #f1f5f9',
    marginBottom: '1rem',
};

function FormRow({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {children}
        </div>
    );
}

function FormField({
    label,
    children,
    required,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <div>
            <label style={labelStyle}>
                {label}
                {required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
            </label>
            {children}
        </div>
    );
}

export default function CompanyStep({ onNext }: CompanyStepProps) {
    const [form, setForm] = useState<ICompany>({
        companyName: '',
        professions: '',
        logo: '',
        phone: '',
        email: '',
        fax: '',
        website: '',
        address: '',
        zipCode: '',
        city: '',
        state: '',
        country: 'Maroc',
        vatNumber: '',
        ice: '',
        taxId: '',
        registrationNumber: '',
        legalStructure: '',
        capital: undefined,
        fiscalYearStartMonth: 1,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const set = (field: keyof ICompany, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!form.companyName.trim()) errs.companyName = 'Company name is required';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errs.email = 'Enter a valid email address';
        }
        if (
            form.website &&
            !/^https?:\/\//.test(form.website)
        ) {
            errs.website = 'URL must start with http:// or https://';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        try {
            await onNext(form);
        } finally {
            setIsLoading(false);
        }
    };

    const processFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            setErrors((prev) => ({ ...prev, logo: 'Only image files are supported' }));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setErrors((prev) => ({ ...prev, logo: 'Image must be smaller than 5MB' }));
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            setLogoPreview(base64);
            set('logo', base64);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        },
        [processFile],
    );

    const focusStyle = (field: string): React.CSSProperties => ({
        ...inputStyle,
        borderColor: errors[field] ? '#ef4444' : undefined,
    });

    return (
        <form onSubmit={handleSubmit} noValidate>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 0, marginBottom: '1.25rem' }}>
                Tell us about your business. You can update these details anytime in Settings.
            </p>

            {/* ── Basic Info ── */}
            <div style={sectionHeaderStyle}>
                <Building2
                    size={12}
                    style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.375rem' }}
                />
                Basic Information
            </div>

            <FormField label="Company Name" required>
                <input
                    style={focusStyle('companyName')}
                    value={form.companyName}
                    onChange={(e) => set('companyName', e.target.value)}
                    placeholder="e.g. Acme Distribution SARL"
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                    onBlur={(e) =>
                        (e.currentTarget.style.borderColor = errors.companyName ? '#ef4444' : '#e2e8f0')
                    }
                />
                {errors.companyName && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.companyName}</span>
                )}
            </FormField>

            <div style={{ marginTop: '0.75rem' }}>
                <FormField label="Business Type / Professions">
                    <input
                        style={inputStyle}
                        value={form.professions}
                        onChange={(e) => set('professions', e.target.value)}
                        placeholder="e.g. Wholesale Distribution, Construction"
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    />
                </FormField>
            </div>

            {/* Logo upload */}
            <div style={{ marginTop: '0.75rem' }}>
                <label style={labelStyle}>Company Logo</label>
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${isDragging ? '#235ae4' : errors.logo ? '#ef4444' : '#cbd5e1'}`,
                        borderRadius: '0.75rem',
                        padding: '1.25rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: isDragging ? '#eff6ff' : '#f8fafc',
                        transition: 'all 0.15s',
                        position: 'relative',
                    }}
                >
                    {logoPreview ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img
                                src={logoPreview}
                                alt="Logo preview"
                                style={{ height: '4rem', maxWidth: '12rem', objectFit: 'contain', borderRadius: '0.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLogoPreview(null);
                                    set('logo', '');
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '-0.5rem',
                                    right: '-0.5rem',
                                    background: '#ef4444',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '1.25rem',
                                    height: '1.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                    padding: 0,
                                }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload size={20} style={{ color: '#94a3b8', marginBottom: '0.375rem' }} />
                            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                <span style={{ fontWeight: 600, color: '#235ae4' }}>Click to upload</span> or drag and drop
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                PNG, JPG, SVG up to 5MB
                            </div>
                        </>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files?.[0]) processFile(e.target.files[0]);
                        }}
                    />
                </div>
                {errors.logo && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.logo}</span>
                )}
            </div>

            {/* ── Contact ── */}
            <div style={{ ...sectionHeaderStyle, marginTop: '1.5rem' }}>
                <Phone
                    size={12}
                    style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.375rem' }}
                />
                Contact
            </div>

            <FormRow>
                <FormField label="Phone">
                    <input
                        style={inputStyle}
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        placeholder="+212 6XX-XXXXXX"
                        type="tel"
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    />
                </FormField>
                <FormField label="Email">
                    <input
                        style={focusStyle('email')}
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        placeholder="contact@company.com"
                        type="email"
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                        onBlur={(e) =>
                            (e.currentTarget.style.borderColor = errors.email ? '#ef4444' : '#e2e8f0')
                        }
                    />
                    {errors.email && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.email}</span>
                    )}
                </FormField>
            </FormRow>

            <div style={{ marginTop: '0.75rem' }}>
                <FormRow>
                    <FormField label="Fax">
                        <input
                            style={inputStyle}
                            value={form.fax}
                            onChange={(e) => set('fax', e.target.value)}
                            placeholder="+212 5XX-XXXXXX"
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                        />
                    </FormField>
                    <FormField label="Website">
                        <input
                            style={focusStyle('website')}
                            value={form.website}
                            onChange={(e) => set('website', e.target.value)}
                            placeholder="https://company.com"
                            type="url"
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                            onBlur={(e) =>
                                (e.currentTarget.style.borderColor = errors.website ? '#ef4444' : '#e2e8f0')
                            }
                        />
                        {errors.website && (
                            <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{errors.website}</span>
                        )}
                    </FormField>
                </FormRow>
            </div>

            {/* ── Address ── */}
            <div style={{ ...sectionHeaderStyle, marginTop: '1.5rem' }}>
                <MapPin
                    size={12}
                    style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.375rem' }}
                />
                Address
            </div>

            <FormField label="Address">
                <input
                    style={inputStyle}
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="123 Avenue Mohammed V"
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
            </FormField>

            <div style={{ marginTop: '0.75rem' }}>
                <FormRow>
                    <FormField label="City">
                        <input
                            style={inputStyle}
                            value={form.city}
                            onChange={(e) => set('city', e.target.value)}
                            placeholder="Casablanca"
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                        />
                    </FormField>
                    <FormField label="Zip Code">
                        <input
                            style={inputStyle}
                            value={form.zipCode}
                            onChange={(e) => set('zipCode', e.target.value)}
                            placeholder="20000"
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                        />
                    </FormField>
                </FormRow>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
                <FormRow>
                    <FormField label="State / Province">
                        <input
                            style={inputStyle}
                            value={form.state}
                            onChange={(e) => set('state', e.target.value)}
                            placeholder="Casablanca-Settat"
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                        />
                    </FormField>
                    <FormField label="Country">
                        <select
                            style={{ ...inputStyle, appearance: 'auto' }}
                            value={form.country}
                            onChange={(e) => set('country', e.target.value)}
                        >
                            {COUNTRIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </FormField>
                </FormRow>
            </div>

            {/* ── Legal & Financial ── */}
            <div style={{ ...sectionHeaderStyle, marginTop: '1.5rem' }}>
                <FileText
                    size={12}
                    style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.375rem' }}
                />
                Legal & Financial
                <span
                    style={{ fontWeight: 400, fontSize: '0.6875rem', color: '#cbd5e1', marginLeft: '0.5rem', textTransform: 'none', letterSpacing: 0 }}
                >
                    (optional)
                </span>
            </div>

            <FormRow>
                <FormField label="VAT Number (TVA)">
                    <input
                        style={inputStyle}
                        value={form.vatNumber}
                        onChange={(e) => set('vatNumber', e.target.value)}
                        placeholder="MA12345678"
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    />
                </FormField>
                <FormField label="ICE Number">
                    <input
                        style={inputStyle}
                        value={form.ice}
                        onChange={(e) => set('ice', e.target.value)}
                        placeholder="000000000000000"
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    />
                </FormField>
            </FormRow>

            <div style={{ marginTop: '0.75rem' }}>
                <FormRow>
                    <FormField label="Tax ID (IF)">
                        <input
                            style={inputStyle}
                            value={form.taxId}
                            onChange={(e) => set('taxId', e.target.value)}
                            placeholder="12345678"
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                        />
                    </FormField>
                    <FormField label="Registration Number (RC)">
                        <input
                            style={inputStyle}
                            value={form.registrationNumber}
                            onChange={(e) => set('registrationNumber', e.target.value)}
                            placeholder="RC123456"
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                        />
                    </FormField>
                </FormRow>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
                <FormRow>
                    <FormField label="Legal Structure">
                        <select
                            style={{ ...inputStyle, appearance: 'auto' }}
                            value={form.legalStructure}
                            onChange={(e) => set('legalStructure', e.target.value)}
                        >
                            <option value="">Select...</option>
                            {LEGAL_STRUCTURES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <FormField label="Capital (MAD)">
                        <input
                            style={inputStyle}
                            value={form.capital ?? ''}
                            onChange={(e) =>
                                set('capital', e.target.value ? Number(e.target.value) : undefined)
                            }
                            placeholder="100000"
                            type="number"
                            min={0}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#235ae4')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                        />
                    </FormField>
                </FormRow>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
                <FormField label="Fiscal Year Start Month">
                    <select
                        style={{ ...inputStyle, appearance: 'auto' }}
                        value={form.fiscalYearStartMonth ?? 1}
                        onChange={(e) => set('fiscalYearStartMonth', Number(e.target.value))}
                    >
                        {MONTHS.map((m, i) => (
                            <option key={m} value={i + 1}>
                                {m}
                            </option>
                        ))}
                    </select>
                </FormField>
            </div>

            {/* Submit */}
            <div style={{ marginTop: '2rem' }}>
                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        width: '100%',
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
                        transition: 'background 0.15s',
                    }}
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            Saving...
                        </>
                    ) : (
                        'Continue to Admin Account →'
                    )}
                </button>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </form>
    );
}
