import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useUnsavedChanges(isDirty: boolean, message?: string) {
    const msg = message ?? 'You have unsaved changes. Are you sure you want to leave?';
    const navigate = useNavigate();

    // Block browser close/refresh
    useEffect(() => {
        if (!isDirty) return;

        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = msg;
        };

        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty, msg]);

    // Block back/forward browser navigation
    useEffect(() => {
        if (!isDirty) return;

        const handler = (e: PopStateEvent) => {
            if (!window.confirm(msg)) {
                // Re-push current state to cancel the navigation
                window.history.pushState(e.state, '');
            }
        };

        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, [isDirty, msg, navigate]);
}
