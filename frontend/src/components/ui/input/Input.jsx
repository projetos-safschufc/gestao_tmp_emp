import React from 'react';

export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  disabled = false,
  error = null,
}) {
  return (
    <div>
      {label ? <label className="block text-sm font-medium text-slate-700">{label}</label> : null}
      <input
        className={[
          'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none',
          error ? 'border-red-300 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-slate-300',
          disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : 'bg-white',
        ].join(' ')}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {error ? <div className="mt-1 text-xs text-red-700">{error}</div> : null}
    </div>
  );
}

