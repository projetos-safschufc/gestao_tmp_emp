import React from 'react';

const variants = {
  primary: 'bg-[#145D50] text-white hover:bg-[#124a44]',
  secondary: 'bg-green text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  ghost: 'bg-transparent text-slate-900 hover:bg-slate-100',
};

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  disabled = false,  
  onClick,
}) {
  const base = 'inline-flex items-left  justify-center rounded-lg px-3 py-2 text-sm font-medium transition';
  const v = variants[variant] || variants.primary;
  const disabledClass = disabled ? 'cursor-not-allowed opacity-60' : '';

  return (
    <button
      type={type}
      className={`${base} ${v} ${disabledClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

