function onlyDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D+/g, '');
}

// Validação estrutural + dígitos verificadores do CNPJ (sem pontuação).
function validateCnpj(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false; // todos iguais é inválido

  const calcCheckDigit = (baseDigits, weights) => {
    let sum = 0;
    for (let i = 0; i < baseDigits.length; i += 1) {
      sum += Number(baseDigits[i]) * weights[i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base12 = cnpj.slice(0, 12);
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcCheckDigit(base12, weights1);

  const base13 = cnpj.slice(0, 13);
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d2 = calcCheckDigit(base13, weights2);

  return Number(cnpj[12]) === d1 && Number(cnpj[13]) === d2;
}

function normalizeCnpj(value) {
  const d = onlyDigits(value);
  if (d.length === 14) return d;
  return null;
}

module.exports = { validateCnpj, normalizeCnpj };

