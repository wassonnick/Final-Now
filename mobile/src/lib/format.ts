export function formatLocation(parts: (string | number | null | undefined)[]) {
  const seen = new Set<string>();
  return parts
    .map((part) => String(part ?? '').trim())
    .filter((part) => {
      if (!part) return false;
      // Dedupe repeats like "Sector 99A · Sector 99A" (sector === locality in data).
      const normalized = part.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(' · ');
}

export function formatPrice(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return 'Price on request';
  const amount = Number(String(value).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return String(value);
  if (amount >= 10000000) return `₹${trimZeros(amount / 10000000)} Cr`;
  if (amount >= 100000) return `₹${trimZeros(amount / 100000)} Lakh`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatArea(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const area = Number(String(value).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(area) || area <= 0) return String(value);
  return `${Math.round(area).toLocaleString('en-IN')} sq.ft.`;
}

function trimZeros(value: number) {
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1');
}
