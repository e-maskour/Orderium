import { type ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                minHeight: '100dvh',
                background: '#f3f4f6',
                paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            }}
        >
            {children}
            <BottomNav />
        </div>
    );
}
