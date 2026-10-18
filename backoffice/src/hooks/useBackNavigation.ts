import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReturnToState } from '../lib/entityRoutes';

/**
 * Back behaviour for detail pages.
 * Opened through a RefLink → go back to the page the user came from.
 * Opened directly (menu, URL, list) → go to `fallback` (usually the list).
 */
export function useBackNavigation(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as ReturnToState | null)?.from;

  const goBack = useCallback(() => {
    // history.state.idx is set by react-router; 0 means there is nothing to pop
    const canPop = (window.history.state?.idx ?? 0) > 0;
    if (from && canPop) navigate(-1);
    else if (from) navigate(from.path);
    else navigate(fallback);
  }, [from, fallback, navigate]);

  return { goBack, from };
}
