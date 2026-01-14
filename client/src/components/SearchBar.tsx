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
      <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
      <Input
        ref={inputRef}
        type="text"
        placeholder={t('searchPlaceholder')}
        value={value}
        onChange={handleInput}
        className={`w-full ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
      />
    </div>
  );
};
