import { useLanguage } from '@/context/LanguageContext';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  const { t, dir } = useLanguage();

  return (
    <div className="relative w-full" dir={dir}>
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder={t('searchProducts')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ps-10 pe-10 h-12 rounded-xl bg-secondary border-0 text-base shadow-card placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary"
      />
      {value && (
        <Button
          variant="ghost"
          size="iconSm"
          className="absolute end-2 top-1/2 -translate-y-1/2"
          onClick={() => onChange('')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
