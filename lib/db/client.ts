/**
 * DB helper utilities.
 *
 * The project now uses Prisma for all database access.
 * These helpers are kept for response formatting and legacy conversions.
 */

export function numberFromCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value, 10);
  return Number(value);
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
