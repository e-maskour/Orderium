import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { NotificationBellPro } from './NotificationBellPro';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { LogOut, User, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toastInfo } from '../services/toast.service';

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
        toastInfo(t('iosInstallHint'));
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
    <header
      className="flex align-items-center justify-content-between"
      style={{
        height: '4rem',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 1rem',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        direction: language === 'ar' ? 'rtl' : 'ltr',
      }}
    >
      {/* Mobile Menu Button */}
      <Button
        text
        rounded
        onClick={onMenuToggle}
        className="lg:hidden"
        icon={isSidebarOpen ? <X style={{ width: '1.25rem', height: '1.25rem', color: '#475569' }} /> : <Menu style={{ width: '1.25rem', height: '1.25rem', color: '#475569' }} />}
        aria-label="Toggle menu"
      />

      {/* Title */}
      <div className="flex align-items-center gap-2 flex-1">
        <h1 className="font-semibold" style={{ fontSize: '1.125rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t('adminBackoffice')}
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex align-items-center gap-2 sm:gap-3">
        {canInstall && (
          <Button
            label="Install"
            size="small"
            onClick={handleInstallClick}
            style={{ background: '#d97706', borderColor: '#d97706' }}
          />
        )}
        <NotificationBellPro />
        <LanguageToggle />

        {/* User Info & Logout */}
        <div className="flex align-items-center gap-2" style={{ borderInlineStart: '1px solid #e2e8f0', paddingInlineStart: '0.75rem' }}>
          <div className="flex align-items-center gap-2">
            <div
              className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
              style={{ width: '2rem', height: '2rem', background: 'linear-gradient(135deg, #235ae4, #1a47b8)' }}
            >
              <User style={{ width: '1rem', height: '1rem', color: '#fff' }} />
            </div>
            <div className="hidden sm:block">
              <p className="font-medium" style={{ fontSize: '0.875rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {admin?.phoneNumber || 'Admin'}
              </p>
              <p className="hidden md:block" style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('adminBackoffice')}</p>
            </div>
          </div>

          <Button
            text
            severity="danger"
            size="small"
            onClick={handleLogout}
            tooltip={t('logout')}
            tooltipOptions={{ position: 'bottom' }}
            className="flex-shrink-0"
          >
            <LogOut style={{ width: '1rem', height: '1rem' }} />
            <span className="hidden md:inline ml-1">{t('logout')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
