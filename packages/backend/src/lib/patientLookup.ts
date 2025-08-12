import { pool } from '../config/database';

/**
 * Find a patient by email address
 * @param email - Email address to search for
 * @param client - Optional database client for transaction support
 * @returns Patient object with id, email, name, and other fields, or null if not found
 */
export async function findPatientByEmail(
  email: string,
  client?: any
): Promise<{
  id: string;
  patient_id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  stripe_customer_id?: string;
} | null> {
  if (!email) {
    return null;
  }

  // Normalize input: trim and lowercase
  const normalizedEmail = email.trim().toLowerCase();

  // Use provided client or pool
  const queryClient = client || pool;

  try {
    const result = await queryClient.query(
      `SELECT 
        id,
        patient_id, 
        email,
        first_name,
        last_name,
        stripe_customer_id,
        (first_name || ' ' || last_name) as name 
      FROM patients 
      WHERE lower(email) = $1 
      LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error finding patient by email:', error);
    throw error;
  }
}
