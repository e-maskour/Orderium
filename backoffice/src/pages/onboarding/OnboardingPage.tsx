import { useState } from 'react';
import orderiumLogo from '../../assets/logo-backoffice.svg';
import { toastSuccess, toastError } from '../../services/toast.service';
import {
  submitCompanyProfile,
  submitAdminAccount,
  completeOnboarding,
  invalidateOnboardingStatus,
} from '../../api/onboarding';
import type { CreateAdminPayload } from '../../api/onboarding';
import type { ICompany } from '../../modules/company/company.interface';
import WelcomeScreen from './WelcomeScreen';
import CompanyStep from './CompanyStep';
import AdminStep from './AdminStep';
import SuccessScreen from './SuccessScreen';

type WizardStep = 'welcome' | 'company' | 'admin' | 'success';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'company', label: 'Company Profile' },
  { key: 'admin', label: 'Admin Account' },
];

function ProgressBar({ current }: { current: WizardStep }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  if (idx === -1) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((step, i) => {
          const isDone = i < idx;
          const isActive = i === idx;
          return (
            <div
              key={step.key}
              style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}
            >
              {/* Circle */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <div
                  style={{
                    width: '1.75rem',
                    height: '1.75rem',
                    borderRadius: '50%',
                    background: isDone ? '#235ae4' : isActive ? '#235ae4' : '#e2e8f0',
                    border: isActive ? '2px solid #235ae4' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="#fff"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: isActive ? '#fff' : '#94a3b8',
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#235ae4' : isDone ? '#235ae4' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    background: isDone ? '#235ae4' : '#e2e8f0',
                    margin: '0 0.5rem',
                    marginBottom: '1.25rem',
                    transition: 'background 0.3s',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [companyData, setCompanyData] = useState<ICompany | null>(null);

  const handleCompanySubmit = async (data: ICompany) => {
    try {
      await submitCompanyProfile(data);
      setCompanyData(data);
      setStep('admin');
    } catch (err: any) {
      const msg: string = err?.message ?? 'Failed to save company profile';
      if (msg.includes('already exists') || err?.status === 409) {
        // Company already exists → move forward
        setCompanyData(data);
        setStep('admin');
      } else {
        toastError(msg);
      }
    }
  };

  const handleAdminSubmit = async (data: CreateAdminPayload) => {
    try {
      const result = await submitAdminAccount(data);

      // Auto-login: persist token and user (mirror AuthContext behaviour)
      if (result?.token) {
        localStorage.setItem('adminToken', result.token);
      }
      if (result?.user) {
        localStorage.setItem('admin', JSON.stringify(result.user));
      }

      // Mark onboarding complete
      try {
        await completeOnboarding();
        invalidateOnboardingStatus(); // clear cache so dashboard re-fetches fresh status
      } catch {
        // Non-critical — continue to success screen
      }

      toastSuccess('Admin account created successfully!');
      setStep('success');
    } catch (err: any) {
      const msg: string = err?.message ?? 'Failed to create admin account';
      toastError(msg);
    }
  };

  const handleDashboard = () => {
    // Full page reload so AuthContext reads the newly stored token
    window.location.href = '/dashboard';
  };

  const stepTitles: Record<WizardStep, { title: string; subtitle: string }> = {
    welcome: { title: '', subtitle: '' },
    company: {
      title: 'Company Profile',
      subtitle: 'Step 1 of 2 — Basic business information',
    },
    admin: {
      title: 'Admin Account',
      subtitle: 'Step 2 of 2 — Your administrator credentials',
    },
    success: { title: '', subtitle: '' },
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #f0fdf4 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '2rem 1rem',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#fff',
          borderRadius: '1.25rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
          border: '1px solid #e8edf5',
          padding: '2.5rem',
          marginTop: step === 'welcome' ? '4rem' : '2rem',
          transition: 'margin-top 0.3s',
        }}
      >
        {/* Header (non-welcome/success) */}
        {step !== 'welcome' && step !== 'success' && (
          <>
            {/* Logo row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <img
                src={orderiumLogo}
                alt="Morocom"
                style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0 }}
              />
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Morocom</span>
            </div>

            <ProgressBar current={step} />

            <div style={{ marginBottom: '1.5rem' }}>
              <h2
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 0.25rem',
                }}
              >
                {stepTitles[step].title}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                {stepTitles[step].subtitle}
              </p>
            </div>
          </>
        )}

        {/* Step content */}
        {step === 'welcome' && <WelcomeScreen onStart={() => setStep('company')} />}
        {step === 'company' && <CompanyStep onNext={handleCompanySubmit} />}
        {step === 'admin' && (
          <AdminStep onNext={handleAdminSubmit} onBack={() => setStep('company')} />
        )}
        {step === 'success' && (
          <SuccessScreen
            companyName={companyData?.companyName ?? 'Your Company'}
            companyLogo={companyData?.logo}
          />
        )}
      </div>
    </div>
  );
}
