export function isSofifa(url?: string | null) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === 'cdn.sofifa.net';
  } catch {
    return false;
  }
}
