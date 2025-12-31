import { useLanguage } from '@/context/LanguageContext';
import { Search, X, Barcode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  const { t, dir } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastInputTime, setLastInputTime] = useState(0);
  const barcodeBufferRef = useRef<string>('');
  const barcodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Barcode scanner detection
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const currentTime = Date.now();
    
    // Detect rapid input (barcode scanner)
    if (currentTime - lastInputTime < 50 && newValue.length > value.length) {
      barcodeBufferRef.current = newValue;
      
      // Clear existing timer
      if (barcodeTimerRef.current) {
        clearTimeout(barcodeTimerRef.current);
      }
      
      // Set timer to detect end of barcode scan
      barcodeTimerRef.current = setTimeout(() => {
        if (barcodeBufferRef.current) {
          onChange(barcodeBufferRef.current);
          barcodeBufferRef.current = '';
        }
      }, 100);
    } else {
      onChange(newValue);
    }
    
    setLastInputTime(currentTime);
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full" dir={dir}>
      <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={t('searchPlaceholder')}
        value={value}
        onChange={handleInput}
        className="ps-12 pe-12 h-12 rounded-xl bg-white border border-gray-300 text-base shadow-sm hover:border-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400 transition-all"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute end-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-gray-100"
          onClick={handleClear}
        >
          <X className="h-4 w-4 text-gray-500" />
        </Button>
      )}
      {!value && (
        <Barcode className="absolute end-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
      )}
    </div>
  );
};
