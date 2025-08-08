/**
 * Normalizes a name by:
 * 1. Removing accents and diacritical marks
 * 2. Capitalizing the first letter of each word
 * 3. Making the rest lowercase
 * 4. Removing apostrophes and special characters
 */
export function normalizeName(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string') return name || null;
  
  // Remove accents and special characters
  const withoutAccents = name
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/ñ/gi, 'n') // Handle ñ specifically
    .replace(/[''´`]/g, ''); // Remove various apostrophes
  
  // Capitalize first letter of each word, lowercase the rest
  return withoutAccents
    .toLowerCase()
    .split(/\s+/) // Split by any whitespace
    .filter(word => word.length > 0) // Remove empty strings
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

/**
 * Normalizes both first and last names
 */
export function normalizePatientName(firstName: string | null | undefined, lastName: string | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  return {
    firstName: normalizeName(firstName),
    lastName: normalizeName(lastName)
  };
}
