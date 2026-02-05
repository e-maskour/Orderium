import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { NotificationBellPro } from './NotificationBellPro';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onMenuToggle?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const Header = ({ isSidebarOpen = false, onMenuToggle }: HeaderProps) => {
  const { admin, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    const iOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(iOS);

    if (isStandalone) {
      setCanInstall(false);
      return;
    }

    if (iOS) {
      setCanInstall(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      if (isIOS) {
        window.alert('To install on iOS, tap Share and choose “Add to Home Screen”.');
      }
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstall(false);
        setInstallPrompt(null);
      }
    } catch {
      setCanInstall(false);
      setInstallPrompt(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-10 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 transition-colors"
        title="Toggle menu"
      >
        {isSidebarOpen ? (
          <X className="w-5 h-5 text-slate-600" />
        ) : (
          <Menu className="w-5 h-5 text-slate-600" />
        )}
      </button>

      {/* Left Section - Page Title or Breadcrumb */}
      <div className={`flex items-center gap-2 sm:gap-3 flex-1 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-base sm:text-lg font-semibold text-slate-800 truncate">
          {t('adminBackoffice')}
        </h1>
      </div>

      {/* Right Section - Actions */}
      <div className={`flex items-center gap-2 sm:gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        {canInstall && (
          <button
            onClick={handleInstallClick}
            className="text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 px-2.5 sm:px-3 py-1.5 rounded-md"
          >
            Install
          </button>
        )}
        {/* Notification Bell */}
        <NotificationBellPro />

        {/* Language Toggle */}
        <LanguageToggle />

        {/* User Info & Logout */}
        <div className={`flex items-center gap-2 sm:gap-3 border-slate-200 ${language === 'ar' ? 'flex-row-reverse border-r pl-2 sm:pl-3 md:pl-4 pr-0 border-l-0' : 'border-l pl-2 sm:pl-3 md:pl-4'} ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-1 sm:gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center relative overflow-hidden flex-shrink-0" style={{background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)'}}>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white relative z-10" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs sm:text-sm font-medium text-slate-700 truncate">
                {admin?.phoneNumber || 'Admin'}
              </p>
              <p className="text-xs text-slate-500 hidden md:block">{t('adminBackoffice')}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            title={t('logout')}
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">{t('logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
