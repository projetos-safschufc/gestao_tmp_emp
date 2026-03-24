function extractMasterCode(cdMaterial) {
  if (cdMaterial === null || cdMaterial === undefined) return null;

  // Normaliza como string e remove espaços.
  const raw = String(cdMaterial).trim();
  if (!raw) return null;

  // Placeholder robusto:
  // Em implementações futuras, aqui entrará a regra exata para extrair o "master"
  // a partir do cd_material quando houver variações de formato.
  // Por enquanto, retornamos o valor normalizado.
  return raw;
}

module.exports = { extractMasterCode };

