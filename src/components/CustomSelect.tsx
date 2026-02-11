import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type SelectOption = {
 value: string;
  label: string;
  id?: string;
  email?: string;
  avatarUrl?: string | null;
  color?: string;
  icon?: React.ElementType;
};
type CustomSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  renderTrigger?: (selectedOption: SelectOption | undefined) => React.ReactNode;
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
};

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  triggerClassName = '',
  renderTrigger,
  renderOption
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between gap-2 rounded-md border transition-colors text-left ${
          triggerClassName 
            ? triggerClassName 
            : 'border-transparent hover:bg-[var(--muted-bg)] hover:border-[var(--panel-border)] px-2 py-1'
        }`}
      >
        {renderTrigger ? (
          renderTrigger(selectedOption)
        ) : (
          <div className="flex items-center gap-2 truncate text-sm">
            {selectedOption?.icon && (
              <selectedOption.icon size={14} className={selectedOption.color} />
            )}
            <span
              className={`truncate ${
                selectedOption ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
              } ${selectedOption?.color || ''}`}
            >
              {selectedOption?.label || placeholder}
            </span>
          </div>
        )}
        <ChevronDown
          size={14}
          className={`text-[var(--text-secondary)] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full min-w-[200px] overflow-auto rounded-lg border border-[var(--panel-border)] bg-[#1e1e1e] p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          {options.length > 0 ? (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.id || option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--muted-bg)]'
                  }`}
                >
                  {renderOption ? (
                    renderOption(option, isSelected)
                  ) : (
                    <>
                      {option.avatarUrl ? (
                         <img src={option.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : option.id && option.label ? (
                         <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                           {option.label.charAt(0).toUpperCase()}
                         </div>
                      ) : option.icon ? (
                        <option.icon
                          size={14}
                          className={option.color || 'text-[var(--text-secondary)]'}
                        />
                      ) : null}
                      {option.color && !option.icon && (
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: option.color }} />
                      )}
                      <div className="flex-1 min-w-0 flex flex-col items-start">
                        <span className="truncate text-left w-full">{option.label}</span>
                        {option.email && (
                          <span className="text-xs text-[var(--text-secondary)] truncate w-full">
                            {option.email}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={14} />}
                    </>
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-2 py-2 text-center text-xs text-[var(--text-muted)]">
              No options
            </div>
          )}
        </div>
      )}
    </div>
  );
}
