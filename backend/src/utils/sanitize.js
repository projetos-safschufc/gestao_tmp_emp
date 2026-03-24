function sanitizeString(value, { maxLength = 2000 } = {}) {
  if (value === null || value === undefined) return value;
  const str = String(value).trim();
  // Mantém controle de tamanho para evitar payloads gigantes.
  if (str.length > maxLength) return str.slice(0, maxLength);
  // Remove caracteres de controle comuns.
  return str.replace(/[\u0000-\u001F\u007F]/g, '');
}

function sanitizeOptionalString(value, options) {
  if (value === null || value === undefined || value === '') return undefined;
  return sanitizeString(value, options);
}

function digitsOnly(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D+/g, '');
}

// Normaliza CNPJ removendo não dígitos. Validação estrutural fica para uma camada de validação (ex: zod).
function sanitizeCnpj(value, { maxLength = 14 } = {}) {
  const d = digitsOnly(value);
  if (!d) return undefined;
  return d.slice(0, maxLength);
}

function sanitizeInteger(value) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

module.exports = {
  sanitizeString,
  sanitizeOptionalString,
  sanitizeCnpj,
  sanitizeInteger,
};

