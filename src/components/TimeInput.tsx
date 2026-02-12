import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function TimeInput({ 
  value, 
  onChange, 
  className = '', 
  placeholder = "--:--",
  disabled = false 
}: TimeInputProps) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Ensure value is HH:MM (take first 5 chars if longer)
    setInputValue(value ? value.slice(0, 5) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value.replace(/[^0-9]/g, ''); // Remove non-digits
    
    if (newValue.length > 4) {
      newValue = newValue.slice(0, 4);
    }

    if (newValue.length >= 2) {
      newValue = newValue.slice(0, 2) + ':' + newValue.slice(2);
    }

    setInputValue(newValue);

    // Only trigger onChange if it's a valid time or empty
    if (newValue === '' || (newValue.length === 5 && isValidTime(newValue))) {
      onChange(newValue);
    }
  };

  const isValidTime = (timeStr: string) => {
    if (timeStr.length !== 5) return false;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  };

  const handleBlur = () => {
    if (inputValue.length === 5 && !isValidTime(inputValue)) {
      setInputValue(''); // Reset if invalid on blur
      onChange('');
    } else if (inputValue.length > 0 && inputValue.length < 5) {
       // Partial input, maybe try to fix or clear?
       // For now, let's clear if incomplete
       setInputValue('');
       onChange('');
    } else if (inputValue === '') {
        onChange('');
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        maxLength={5}
      />
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <Clock size={14} />
      </div>
    </div>
  );
}
