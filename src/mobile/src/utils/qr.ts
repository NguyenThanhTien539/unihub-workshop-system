export function normalizeQrToken(raw: string) {
  return raw.trim();
}

export function isPlausibleQrToken(raw: string) {
  const value = normalizeQrToken(raw);
  return value.length > 0 && value.length <= 4096;
}

export function getQrPreview(raw: string) {
  const value = normalizeQrToken(raw);
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
