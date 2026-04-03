import { useState, useEffect } from 'react';
import { getOnboardingStatus, type OnboardingStatus } from '../api/onboarding';

interface UseOnboardingReturn {
  status: OnboardingStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOnboarding(): UseOnboardingReturn {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getOnboardingStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to check onboarding status');
      // Fail open — don't block the app
      setStatus({ is_onboarded: true, steps: { company_profile: true, super_admin: true } });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  return { status, isLoading, error, refetch: fetch };
}
