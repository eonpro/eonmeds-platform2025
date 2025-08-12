/**
 * Format phone numbers for display
 * Formats US numbers as (###) ###-####
 * Returns original for non-US or invalid formats
 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '';

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if it's a US phone number (10 or 11 digits)
  if (cleaned.length === 10) {
    // Format as (###) ###-####
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US number with country code
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original for non-US formats
  return phone;
}
