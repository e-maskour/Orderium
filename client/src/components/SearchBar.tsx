import { useLanguage } from '@/context/LanguageContext';
import { InputText } from 'primereact/inputtext';
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const currentTime = Date.now();

    if (currentTime - lastInputTime < 50 && newValue.length > value.length) {
      barcodeBufferRef.current = newValue;
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
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

  return (
    <div className="w-full" dir={dir}>
      <span className="p-input-icon-left w-full">
        <i className="pi pi-search" />
        <InputText
          ref={inputRef}
          type="text"
          placeholder={t('searchPlaceholder')}
          value={value}
          onChange={handleInput}
          className="w-full"
        />
      </span>
    </div>
  );
};
