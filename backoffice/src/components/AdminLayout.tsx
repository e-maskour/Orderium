import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useLanguage } from '../context/LanguageContext';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar - Hidden on mobile, shown on lg+ */}
      <div className="hidden lg:block">
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </div>

      {/* Mobile Sidebar - Drawer overlay on small screens */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Sidebar Drawer */}
          <div className="absolute top-0 h-screen bg-white overflow-y-auto"
            style={{
              [language === 'ar' ? 'right' : 'left']: 0,
              width: '16rem'
            }}
          >
            <Sidebar isCollapsed={false} setIsCollapsed={() => setIsMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`
        transition-all duration-300 lg:transition-none
        ${isSidebarCollapsed 
          ? (language === 'ar' ? 'lg:mr-20' : 'lg:ml-20')
          : (language === 'ar' ? 'lg:mr-64' : 'lg:ml-64')
        }
      `}>
        {/* Header */}
        <Header 
          isSidebarOpen={isMobileSidebarOpen}
          onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Page Content */}
        <main className="p-3 sm:p-4 md:p-6 max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
