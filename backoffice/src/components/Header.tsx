import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { NotificationBell } from './NotificationBell';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

export const Header = () => {
  const { admin, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Left Section - Page Title or Breadcrumb */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-800">
          {t('adminBackoffice')}
        </h1>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Language Toggle */}
        <LanguageToggle />

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)'}}>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
              <User className="w-4 h-4 text-white relative z-10" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-700">
                {admin?.PhoneNumber || 'Admin'}
              </p>
              <p className="text-xs text-slate-500">{t('adminBackoffice')}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">{t('logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
