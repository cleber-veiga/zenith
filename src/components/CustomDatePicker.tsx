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
  nextMonday, 
  addWeeks, 
  isValid, 
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

type DateRange = {
  startDate: string | null;
  endDate: string | null;
};

type CustomDatePickerProps = {
  startDate?: string | null;
  endDate?: string | null;
  onChange: (range: DateRange) => void;
  className?: string;
  placeholder?: string;
};

export function CustomDatePicker({ 
  startDate, 
  endDate, 
  onChange,
  className = "",
  placeholder = "Set dates"
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'start' | 'end'>('end'); // Default to setting due date as it's most common
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const width = 500; // Popup width
      let left = rect.left + window.scrollX;
      
      // Basic collision detection
      if (rect.left + width > window.innerWidth) {
        left = (rect.right + window.scrollX) - width;
      }
      
      setPosition({
        top: rect.bottom + window.scrollY + 5,
        left: Math.max(10, left)
      });
    }
  }, [isOpen]);

  // Close on click outside
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

  const handleQuickSelect = (option: string) => {
    const today = startOfDay(new Date());
    let newStart = startDate ? parseISO(startDate) : null;
    let newEnd = endDate ? parseISO(endDate) : null;

    // If we are strictly setting a due date (end date)
    switch (option) {
      case 'today':
        newEnd = today;
        break;
      case 'tomorrow':
        newEnd = addDays(today, 1);
        break;
      case 'weekend':
        // Find next Saturday
        const dayOfWeek = today.getDay();
        const daysToSaturday = 6 - dayOfWeek + (dayOfWeek === 6 ? 7 : 0); // If today is Sat, next Sat is +7
        newEnd = addDays(today, daysToSaturday);
        break;
      case 'next-week':
        newEnd = nextMonday(today);
        break;
      case '2-weeks':
        newEnd = addWeeks(today, 2);
        break;
      case '4-weeks':
        newEnd = addWeeks(today, 4);
        break;
    }

    if (newEnd) {
        // If we have a start date and the new end date is before it, push start date or clear it?
        // Usually logical to just set the end date. If invalid, maybe clear start.
        if (newStart && isBefore(newEnd, newStart)) {
             newStart = null; // or set to same as end
        }
        
        onChange({
            startDate: newStart ? format(newStart, 'yyyy-MM-dd') : null,
            endDate: format(newEnd, 'yyyy-MM-dd')
        });
        setIsOpen(false);
    }
  };

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let newStart = startDate;
    let newEnd = endDate;

    if (selecting === 'start') {
        newStart = dateStr;
        // If new start is after current end, clear end or set end to start
        if (newEnd && isAfter(date, parseISO(newEnd))) {
            newEnd = null;
        }
        setSelecting('end'); // Auto switch to end date selection
    } else {
        newEnd = dateStr;
        // If new end is before current start, update start to match
        if (newStart && isBefore(date, parseISO(newStart))) {
            newStart = dateStr;
        }
    }

    onChange({ startDate: newStart || null, endDate: newEnd || null });
    
    // Only close if we were selecting end date and we have both or just end
    if (selecting === 'end') {
        // Optional: keep open to allow further edits or close? 
        // User behavior: usually select date and done.
        // But since we have two dates, maybe keep open? 
        // Let's keep open to allow verifying the range.
    }
  };

  const clearDate = (type: 'start' | 'end', e: React.MouseEvent) => {
      e.stopPropagation();
      if (type === 'start') {
          onChange({ startDate: null, endDate: endDate || null });
      } else {
          onChange({ startDate: startDate || null, endDate: null });
      }
  };

  const nextMonth = () => setCurrentMonth(addDays(endOfMonth(currentMonth), 1));
  const prevMonth = () => setCurrentMonth(addDays(startOfMonth(currentMonth), -1));

  // Calendar Grid Generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDateGrid = startOfWeek(monthStart);
  const endDateGrid = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDateGrid,
    end: endDateGrid,
  });

  const formatDateDisplay = (dateStr: string | null | undefined) => {
      if (!dateStr) return null;
      const date = parseISO(dateStr);
      if (!isValid(date)) return null;
      return format(date, 'MMM d');
  };

  const isSelected = (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return startDate === dateStr || endDate === dateStr;
  };

  const isInRange = (date: Date) => {
      if (!startDate || !endDate) return false;
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return isAfter(date, start) && isBefore(date, end);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--muted-bg)] cursor-pointer transition text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[32px]"
      >
        <CalendarIcon size={14} className={endDate ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"} />
        <div className="flex items-center gap-1">
            {startDate ? (
                <>
                    <span className="font-medium text-[var(--text-primary)]">{formatDateDisplay(startDate)}</span>
                    <span className="text-[var(--text-muted)]">-</span>
                </>
            ) : null}
            {endDate ? (
                <span className={`font-medium ${!startDate ? '' : 'text-[var(--text-primary)]'}`}>
                    {formatDateDisplay(endDate)}
                </span>
            ) : (
                <span className="text-[var(--text-muted)]">{placeholder}</span>
            )}
        </div>
      </div>

      {/* Popover (Portal) */}
      {isOpen && createPortal(
        <div 
            ref={popupRef}
            id="datepicker-popup"
            style={{ top: position.top, left: position.left }}
            className="absolute z-[9999] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl shadow-2xl w-[500px] flex flex-col animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            
            {/* Header: Start/Due Inputs */}
            <div className="flex items-center border-b border-[var(--panel-border)] bg-[var(--muted-bg)]/30">
                <div 
                    className={`flex-1 p-2 cursor-pointer transition-colors ${selecting === 'start' ? 'bg-[var(--panel-bg)] shadow-sm border-r border-[var(--panel-border)]' : 'hover:bg-[var(--muted-bg)]'}`}
                    onClick={() => setSelecting('start')}
                >
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Start Date</div>
                    <div className="flex items-center justify-between h-5">
                        <span className={`text-sm ${startDate ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)] italic'}`}>
                            {startDate ? format(parseISO(startDate), 'MMM d, yyyy') : 'Set start date'}
                        </span>
                        {startDate && (
                            <button onClick={(e) => clearDate('start', e)} className="text-[var(--text-muted)] hover:text-rose-500">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <div 
                    className={`flex-1 p-2 cursor-pointer transition-colors ${selecting === 'end' ? 'bg-[var(--panel-bg)] shadow-sm border-l border-[var(--panel-border)]' : 'hover:bg-[var(--muted-bg)]'}`}
                    onClick={() => setSelecting('end')}
                >
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Due Date</div>
                    <div className="flex items-center justify-between h-5">
                        <span className={`text-sm ${endDate ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)] italic'}`}>
                            {endDate ? format(parseISO(endDate), 'MMM d, yyyy') : 'Set due date'}
                        </span>
                        {endDate && (
                            <button onClick={(e) => clearDate('end', e)} className="text-[var(--text-muted)] hover:text-rose-500">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex h-[280px]">
                {/* Sidebar - Quick Options */}
                <div className="w-32 border-r border-[var(--panel-border)] p-1 bg-[var(--muted-bg)]/10 flex flex-col gap-0.5 overflow-y-auto">
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)]">Quick Select</div>
                    {[
                        { label: 'Today', value: 'today' },
                        { label: 'Tomorrow', value: 'tomorrow' },
                        { label: 'This weekend', value: 'weekend' },
                        { label: 'Next week', value: 'next-week' },
                        { label: '2 weeks', value: '2-weeks' },
                        { label: '4 weeks', value: '4-weeks' },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => handleQuickSelect(opt.value)}
                            className="text-left px-2 py-1.5 rounded text-[11px] text-[var(--text-secondary)] hover:bg-[var(--muted-bg)] hover:text-[var(--text-primary)] transition flex items-center justify-between group"
                        >
                            {opt.label}
                            {opt.value === 'today' && <span className="text-[9px] text-[var(--text-muted)]">{format(new Date(), 'EEE')}</span>}
                            {opt.value === 'tomorrow' && <span className="text-[9px] text-[var(--text-muted)]">{format(addDays(new Date(), 1), 'EEE')}</span>}
                        </button>
                    ))}
                    
                    <div className="mt-auto border-t border-[var(--panel-border)] pt-1">
                         <button className="w-full text-left px-2 py-1.5 rounded text-[11px] text-[var(--text-secondary)] hover:bg-[var(--muted-bg)] hover:text-[var(--text-primary)] transition flex items-center gap-2">
                            <Clock size={12} />
                            Set Recurring
                         </button>
                    </div>
                </div>

                {/* Main Calendar Area */}
                <div className="flex-1 p-3 flex flex-col">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h3>
                        <div className="flex items-center gap-1">
                            <button onClick={prevMonth} className="p-1 rounded hover:bg-[var(--muted-bg)] text-[var(--text-secondary)] transition">
                                <ChevronLeft size={14} />
                            </button>
                            <button onClick={() => setCurrentMonth(new Date())} className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-[var(--muted-bg)] text-[var(--text-secondary)] transition">
                                Today
                            </button>
                            <button onClick={nextMonth} className="p-1 rounded hover:bg-[var(--muted-bg)] text-[var(--text-secondary)] transition">
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Week Days */}
                    <div className="grid grid-cols-7 mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center text-[10px] font-medium text-[var(--text-muted)] py-0.5">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-y-0.5 flex-1 content-start">
                        {calendarDays.map((day, dayIdx) => {
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isSelectedDay = isSelected(day);
                            const isRangeDay = isInRange(day);
                            const isTodayDay = isToday(day);
                            
                            const isStart = startDate && isSameDay(day, parseISO(startDate));
                            const isEnd = endDate && isSameDay(day, parseISO(endDate));

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={() => handleDateClick(day)}
                                    style={isRangeDay ? { backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' } : undefined}
                                    className={`
                                        h-7 w-full flex items-center justify-center text-xs relative transition-colors
                                        ${!isCurrentMonth ? 'text-[var(--text-muted)] opacity-30' : 'text-[var(--text-primary)]'}
                                        ${isStart && isEnd ? 'bg-[var(--accent)] text-white font-bold rounded-md z-10' : ''}
                                        ${isStart && !isEnd ? 'bg-[var(--accent)] text-white font-bold rounded-l-md z-10' : ''}
                                        ${!isStart && isEnd ? 'bg-[var(--accent)] text-white font-bold rounded-r-md z-10' : ''}
                                        ${!isSelectedDay && !isRangeDay && isTodayDay ? 'text-[var(--accent)] font-bold' : ''}
                                        ${!isSelectedDay && !isRangeDay ? 'hover:bg-[var(--muted-bg)] rounded-md' : ''}
                                    `}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}
