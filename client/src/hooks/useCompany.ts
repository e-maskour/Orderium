import { useEffect, useState } from 'react';
import { companyService } from '@/modules/company';
// The barrel's `Company` is the model class; the service returns plain objects.
import type { Company } from '@/modules/company/company.interface';

/**
 * Fetch-once loader for the public company details backing the support page.
 * Mirrors `useBrands`: never throws — a missing or unreachable configuration
 * degrades to `null`, which the page renders as an "unavailable" state instead
 * of blowing up the route.
 */
export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    companyService
      .get()
      .then((res) => {
        if (!cancelled) setCompany(res.company);
      })
      .catch(() => {
        if (!cancelled) setCompany(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { company, loading };
}
