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
    <div style={{ minHeight: '100vh', background: '#f8fafc' }} dir={dir}>
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <AppSidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </div>

      {/* Mobile Sidebar - PrimeReact Sidebar drawer */}
      <Sidebar
        visible={isMobileSidebarOpen}
        onHide={() => setIsMobileSidebarOpen(false)}
        position={language === 'ar' ? 'right' : 'left'}
        modal
        className="lg:hidden"
        style={{ width: '16rem' }}
      >
        <AppSidebar isCollapsed={false} setIsCollapsed={() => setIsMobileSidebarOpen(false)} />
      </Sidebar>

      {/* Main Content Area */}
      <div
        style={{
          transition: 'margin 0.3s',
          ...(language === 'ar'
            ? { marginRight: isSidebarCollapsed ? '5rem' : '16rem' }
            : { marginLeft: isSidebarCollapsed ? '5rem' : '16rem' }),
        }}
      >
        <Header
          isSidebarOpen={isMobileSidebarOpen}
          onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="p-3 sm:p-4 md:p-5" style={{ maxWidth: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
