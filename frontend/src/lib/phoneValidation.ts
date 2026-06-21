export const INDIAN_MOBILE_ERROR =
  "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.";

export function cleanIndianMobileInput(value: unknown): string {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

export function normalizeIndianMobile(value: unknown): string {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export function isValidIndianMobile(value: unknown): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(value));
}
