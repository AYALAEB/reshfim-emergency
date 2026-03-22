/**
 * Normalize a phone number to digits only, Israeli format.
 * Examples:
 *   050-1234567   → 0501234567
 *   +972-50-123-4567 → 0501234567
 *   972501234567  → 0501234567
 *   05012345678   → 05012345678  (kept as-is if doesn't match)
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  let digits = phone.replace(/\D/g, "");

  // Remove country code 972 → replace with 0
  if (digits.startsWith("972")) {
    digits = "0" + digits.slice(3);
  }

  return digits;
}

/**
 * Returns true if two phone numbers refer to the same number
 */
export function phonesMatch(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}
