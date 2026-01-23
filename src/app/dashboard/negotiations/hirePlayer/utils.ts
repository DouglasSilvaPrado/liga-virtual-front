export function parsePriceToNumber(priceText: string | null | undefined): number | null {
  if (!priceText) return null;

  // tenta lidar com "1.2M", "850K", "1000000", "R$ 1.000.000" etc.
  const raw = priceText.toString().trim().toUpperCase();

  const normalized = raw
    .replaceAll('R$', '')
    .replaceAll('.', '')
    .replaceAll(' ', '')
    .replaceAll(',', '.');

  const mult = normalized.endsWith('M') ? 1_000_000 : normalized.endsWith('K') ? 1_000 : 1;

  const numericPart = normalized.replace(/[MK]$/g, '');
  const n = Number(numericPart);

  if (!Number.isFinite(n)) return null;
  return Math.round(n * mult);
}

export function formatMoneyBR(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n);
}
