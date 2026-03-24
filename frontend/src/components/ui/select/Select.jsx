import React from 'react';

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Selecione...',
  disabled = false,
  error = null,

  // 🔥 NOVAS PROPS
  size = 'md',        // sm | md | lg
  fullWidth = true,   // ocupa 100% ou não
  className = '',     // classes extras
}) {
  // 🎯 controle de tamanhos
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  // 🎯 largura
  const widthClass = fullWidth ? 'w-full' : 'w-full';

  // 🎯 estados visuais
  const baseClasses =
    'mt-1 rounded-lg border outline-none transition';

  const stateClasses = error
    ? 'border-red-300 focus:ring-2 focus:ring-red-200'
    : 'border-slate-200 focus:ring-2 focus:ring-slate-300';

  const disabledClasses = disabled
    ? 'cursor-not-allowed bg-slate-50 text-slate-500'
    : 'bg-white';

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <select
        className={[
          baseClasses,
          sizeClasses[size],
          widthClass,
          stateClasses,
          disabledClasses,
          className, // permite customização externa
        ].join(' ')}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {error && (
        <div className="mt-1 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}