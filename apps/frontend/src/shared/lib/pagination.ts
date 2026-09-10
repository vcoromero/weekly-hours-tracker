export const ALLOWED_PAGE_SIZES = [10, 20, 40, 52] as const;

export function parsePositiveInt(raw: string | null, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function parsePageSize(raw: string | null, fallback: number): number {
  const n = parsePositiveInt(raw, fallback);
  return (ALLOWED_PAGE_SIZES as readonly number[]).includes(n) ? n : fallback;
}
