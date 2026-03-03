import { ReactNode, useState } from 'react';
import { Sidebar as AppSidebar } from './Sidebar';
import { Header } from './Header';
import { Sidebar } from 'primereact/sidebar';
import { useLanguage } from '../context/LanguageContext';

interface AdminLayoutProps {
    children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const { language } = useLanguage();
    const dir = language === 'ar' ? 'rtl' : 'ltr';

    return (
        <div style={{ minHeight: '100vh', background: '#f3f4f6' }} dir={dir}>
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <AppSidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
            </div>

            {/* Mobile Sidebar Drawer */}
            <Sidebar
                visible={isMobileSidebarOpen}
                onHide={() => setIsMobileSidebarOpen(false)}
                position={language === 'ar' ? 'right' : 'left'}
                modal
                className="lg:hidden"
                style={{ width: '16.5rem', padding: 0 }}
                showCloseIcon={false}
            >
                <AppSidebar isCollapsed={false} setIsCollapsed={() => setIsMobileSidebarOpen(false)} />
            </Sidebar>

            {/* Main Content */}
            <div
                style={{
                    transition: 'margin 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(language === 'ar'
                        ? { marginRight: isSidebarCollapsed ? '4.5rem' : '16.5rem' }
                        : { marginLeft: isSidebarCollapsed ? '4.5rem' : '16.5rem' }),
                }}
                className="admin-main-content"
            >
                <Header
                    isSidebarOpen={isMobileSidebarOpen}
                    onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                />

                <main className="admin-main-area" style={{ maxWidth: '100%', minHeight: 'calc(100vh - 6.875rem)' }}>
                    {children}
                </main>
            </div>

            <style>{`
        @media (max-width: 991px) {
          .admin-main-content {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
        }
        .admin-main-area {
          padding: 1.25rem 1.5rem;
        }
        @media (max-width: 639px) {
          .admin-main-area {
            padding: 1rem 0.75rem;
          }
        }
        /* Shared page container — used on every page inside AdminLayout */
        .page-container {
          max-width: 1600px;
          margin: 0 auto;
          width: 100%;
        }
      `}</style>
        </div>
    );
};
