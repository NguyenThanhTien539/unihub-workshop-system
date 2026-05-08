export function apiUrl(path: string) {
  // default to localhost:8080 when NEXT_PUBLIC_API_URL is not set
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  if (!path) return base;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${base.replace(/\/$/, '')}${path}`;
  return `${base.replace(/\/$/, '')}/${path}`;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  let url = typeof input === 'string' ? input : String(input);
  if (url.startsWith('/')) url = apiUrl(url);
  return fetch(url, init);
}
