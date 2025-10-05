import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
}

export default function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  placeholder = '○'
}: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null));

  // Update internal values when external value changes
  useEffect(() => {
    const newValues = value.split('').slice(0, length);
    while (newValues.length < length) {
      newValues.push('');
    }
    setValues(newValues);
  }, [value, length]);

  const focusInput = (index: number) => {
    const input = inputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  };

  const handleChange = (index: number, inputValue: string) => {
    // Only allow digits
    const sanitizedValue = inputValue.replace(/[^0-9]/g, '');
    
    if (sanitizedValue.length <= 1) {
      const newValues = [...values];
      newValues[index] = sanitizedValue;
      setValues(newValues);
      
      const newOtp = newValues.join('');
      onChange(newOtp);
      
      // Auto-focus next input
      if (sanitizedValue && index < length - 1) {
        setTimeout(() => focusInput(index + 1), 10);
      }
      
      // Call onComplete when all fields are filled
      if (newOtp.length === length && onComplete) {
        onComplete(newOtp);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        // If current field is empty, focus previous field
        setTimeout(() => focusInput(index - 1), 10);
      } else {
        // Clear current field
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
        onChange(newValues.join(''));
      }
    }
    // Handle arrow keys
    else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    }
    // Handle paste
    else if (e.key === 'Enter' && onComplete && value.length === length) {
      onComplete(value);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/[^0-9]/g, '');
    
    if (pastedData) {
      const pastedValues = pastedData.split('').slice(0, length);
      const newValues = [...Array(length).fill('')];
      
      pastedValues.forEach((digit, index) => {
        if (index < length) {
          newValues[index] = digit;
        }
      });
      
      setValues(newValues);
      const newOtp = newValues.join('');
      onChange(newOtp);
      
      // Focus the next empty field or the last field
      const nextIndex = Math.min(pastedValues.length, length - 1);
      setTimeout(() => focusInput(nextIndex), 10);
      
      // Call onComplete if pasted value fills all fields
      if (newOtp.length === length && onComplete) {
        onComplete(newOtp);
      }
    }
  };

  const handleFocus = (index: number) => {
    // Select all text on focus for better UX
    const input = inputRefs.current[index];
    if (input) {
      input.select();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1.5 sm:gap-2 lg:gap-3 mb-3">
        {values.map((digit, index) => (
          <input
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            placeholder={digit || placeholder}
            className={`
              w-8 h-10 sm:w-10 sm:h-12 lg:w-12 lg:h-14 text-center text-base sm:text-lg lg:text-xl font-bold 
              rounded-md sm:rounded-lg lg:rounded-xl border-2 transition-all duration-200 bg-white
              ${error 
                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
              }
              ${disabled 
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                : 'hover:border-gray-300'
              }
              ${digit 
                ? (error ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600 border-indigo-300') 
                : ''
              }
              focus:outline-none
              placeholder:text-gray-300
            `}
          />
        ))}
      </div>
      
      {/* Helper text */}
      <p className="text-sm text-gray-500 text-center">
        {error ? (
          <span className="text-red-500">Invalid OTP code</span>
        ) : (
          `Enter the ${length}-digit code sent to your phone`
        )}
      </p>
    </div>
  );
}
