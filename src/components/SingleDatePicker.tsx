import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  isValid, 
  parse,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { ptBR } from 'date-fns/locale';

type SingleDatePickerProps = {
  value?: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
};

export function SingleDatePicker({ 
  value, 
  onChange, 
  placeholder = "DD/MM/AAAA",
  disabled = false,
  className = "",
  inputClassName = ""
}: SingleDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [inputValue, setInputValue] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const parseValue = (dateValue: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return parse(dateValue, 'yyyy-MM-dd', new Date());
    }
    return parseISO(dateValue);
  };

  // Initialize input value from prop
  useEffect(() => {
    if (value) {
      const date = parseValue(value);
      if (isValid(date)) {
        setInputValue(format(date, 'dd/MM/yyyy'));
        setCurrentMonth(date);
      } else {
        setInputValue(value); // Fallback if not parseable
      }
    } else {
      setInputValue('');
    }
  }, [value]);

  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const width = 280; // Popup width
      let left = rect.left + window.scrollX;
      
      if (rect.left + width > window.innerWidth) {
        left = (rect.right + window.scrollX) - width;
      }
      
      setPosition({
        top: rect.bottom + window.scrollY + 5,
        left: Math.max(10, left)
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Masking logic: Allow only numbers and slashes
    const cleaned = newValue.replace(/[^0-9/]/g, '');
    setInputValue(cleaned);

    // Try to parse if it looks complete
    if (cleaned.length === 10) {
      const parsed = parse(cleaned, 'dd/MM/yyyy', new Date());
      if (isValid(parsed)) {
        onChange(format(parsed, 'yyyy-MM-dd'));
        setCurrentMonth(parsed);
      }
    } else if (cleaned === '') {
        onChange('');
    }
  };

  const handleInputBlur = () => {
    // Validate on blur
    if (inputValue.length === 10) {
       const parsed = parse(inputValue, 'dd/MM/yyyy', new Date());
       if (!isValid(parsed)) {
           // Reset to previous valid value if invalid? 
           // Or just leave it? Let's reset to prop value if invalid
           if (value) {
               const date = parseValue(value);
               if (isValid(date)) setInputValue(format(date, 'dd/MM/yyyy'));
           } else {
               setInputValue('');
           }
       }
    } else if (value) {
        // If incomplete and we have a value, revert
         const date = parseValue(value);
         if (isValid(date)) setInputValue(format(date, 'dd/MM/yyyy'));
    } else {
        setInputValue('');
    }
  };

  const handleDateClick = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
    setInputValue(format(date, 'dd/MM/yyyy'));
  };

  const nextMonth = () => setCurrentMonth(addDays(endOfMonth(currentMonth), 1));
  const prevMonth = () => setCurrentMonth(addDays(startOfMonth(currentMonth), -1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDateGrid = startOfWeek(monthStart);
  const endDateGrid = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDateGrid,
    end: endDateGrid,
  });

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative group">
        <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={() => !disabled && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={10}
            className={inputClassName || `w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-muted)] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      {isOpen && !disabled && createPortal(
        <div 
            ref={popupRef}
            style={{ top: position.top, left: position.left }}
            className="absolute z-[9999] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl shadow-2xl w-[280px] p-3 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-[var(--muted-bg)] text-[var(--text-secondary)] transition">
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-[var(--muted-bg)] text-[var(--text-secondary)] transition">
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => (
                    <div key={day} className="text-center text-[10px] font-medium text-[var(--text-muted)] py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelectedDay = value && isSameDay(day, parseValue(value));
                    const isTodayDay = isToday(day);
                    
                    return (
                        <button
                            key={day.toString()}
                            onClick={() => handleDateClick(day)}
                            className={`
                                h-8 w-full flex items-center justify-center text-xs rounded-md transition-all
                                ${!isCurrentMonth ? 'text-[var(--text-muted)] opacity-30' : 'text-[var(--text-primary)]'}
                                ${isSelectedDay ? 'bg-[var(--accent)] text-white font-bold shadow-sm' : 'hover:bg-[var(--muted-bg)]'}
                                ${!isSelectedDay && isTodayDay ? 'text-[var(--accent)] font-bold border border-[var(--accent)]/30' : ''}
                            `}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
            
            <div className="mt-3 pt-2 border-t border-[var(--panel-border)] flex justify-between">
                <button 
                    onClick={() => {
                        onChange('');
                        setInputValue('');
                        setIsOpen(false);
                    }}
                    className="text-xs text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                >
                    Limpar
                </button>
                <button 
                    onClick={() => {
                        const today = new Date();
                        onChange(format(today, 'yyyy-MM-dd'));
                        setInputValue(format(today, 'dd/MM/yyyy'));
                        setCurrentMonth(today);
                        setIsOpen(false);
                    }}
                    className="text-xs text-[var(--accent)] font-medium hover:text-[var(--accent-hover)] transition-colors"
                >
                    Hoje
                </button>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}
