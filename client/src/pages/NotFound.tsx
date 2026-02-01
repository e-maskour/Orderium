import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-6xl sm:text-7xl md:text-8xl font-bold text-primary">404</h1>
        <p className="mb-6 text-lg sm:text-xl md:text-2xl text-muted-foreground">{t('oopsPageNotFound')}</p>
        <a 
          href="/" 
          className="inline-block px-6 py-3 text-base sm:text-lg font-semibold text-primary underline hover:text-primary/90 transition-colors"
        >
          {t('returnToHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
