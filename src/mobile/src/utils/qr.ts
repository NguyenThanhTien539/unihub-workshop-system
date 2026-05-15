export function normalizeQrToken(raw: string) {
  return extractQrToken(raw);
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

export function extractQrToken(rawValue: string) {
  const value = rawValue.trim();
  if (!value) {
    return "";
  }

  const jsonToken = extractFromJson(value);
  if (jsonToken) {
    return jsonToken;
  }

  const urlToken = extractFromUrl(value);
  if (urlToken) {
    return urlToken;
  }

  return value;
}

function extractFromJson(value: string) {
  if (!value.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as {
      token?: unknown;
      qrToken?: unknown;
      payload?: unknown;
      data?: unknown;
    };
    const token =
      stringValue(parsed.token) ??
      stringValue(parsed.qrToken) ??
      stringValue(parsed.payload) ??
      stringValue(parsed.data);
    return token?.trim() || null;
  } catch {
    return null;
  }
}

function extractFromUrl(value: string) {
  if (!looksLikeUrl(value)) {
    return null;
  }

  try {
    const url = new URL(value.startsWith("www.") ? `https://${value}` : value);
    const token =
      url.searchParams.get("token") ??
      url.searchParams.get("qrToken") ??
      url.searchParams.get("payload");
    return token?.trim() || null;
  } catch {
    return null;
  }
}

function looksLikeUrl(value: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith("www.");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}
