import { pool } from '../config/database';

export interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  status: string;
  created_at: Date;
  last_activity?: Date;
  form_type?: string;
  // Medical info
  height_inches?: number;
  weight_lbs?: number;
  bmi?: number;
  medical_conditions?: string[];
  current_medications?: string[];
  allergies?: string[];
}

export interface PatientListItem {
  id: string;
  patient_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  created_at: Date;
  last_activity?: Date;
  status: string;
}

export class PatientService {
  /**
   * Get all patients for list view
   */
  static async getPatientList(
    limit: number = 100,
    offset: number = 0,
    search?: string,
    status?: string
  ): Promise<{ patients: PatientListItem[]; total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      // Add search filter
      if (search) {
        paramCount++;
        whereClause += ` AND (
          LOWER(first_name || ' ' || last_name) LIKE LOWER($${paramCount}) OR
          LOWER(email) LIKE LOWER($${paramCount}) OR
          phone LIKE $${paramCount} OR
          patient_id LIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Add status filter
      if (status) {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM patients 
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get patients
      paramCount++;
      const limitParam = paramCount;
      paramCount++;
      const offsetParam = paramCount;

      const query = `
        SELECT 
          id,
          patient_id,
          first_name || ' ' || last_name as name,
          email,
          phone,
          date_of_birth,
          created_at,
          updated_at as last_activity,
          status
        FROM patients
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;

      params.push(limit, offset);
      const result = await pool.query(query, params);

      return {
        patients: result.rows,
        total,
      };
    } catch (error) {
      console.error('Error in getPatientList:', error);
      throw error;
    }
  }

  /**
   * Get patient details by ID
   */
  static async getPatientById(patientId: string): Promise<Patient | null> {
    try {
      const query = `
        SELECT 
          id,
          patient_id,
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          gender,
          status,
          created_at,
          updated_at as last_activity,
          form_type,
          height_inches,
          weight_lbs,
          bmi,
          medical_conditions,
          current_medications,
          allergies
        FROM patients
        WHERE patient_id = $1 OR id::text = $1
      `;

      const result = await pool.query(query, [patientId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in getPatientById:', error);
      throw error;
    }
  }

  /**
   * Get patient intake form data
   */
  static async getPatientIntakeData(patientId: string): Promise<any> {
    const client = await pool.connect();

    try {
      // Get the original webhook data for complete intake form
      const query = `
        SELECT 
          we.payload,
          we.created_at,
          p.form_type
        FROM webhook_events we
        JOIN patients p ON p.heyflow_submission_id = we.webhook_id
        WHERE p.patient_id = $1 OR p.id::text = $1
        ORDER BY we.created_at DESC
        LIMIT 1
      `;

      const result = await client.query(query, [patientId]);

      if (result.rows.length === 0) {
        return null;
      }

      const webhookData = result.rows[0];
      const fields = webhookData.payload.fields || [];

      // Transform fields into readable format
      const intakeData: any = {
        form_type: webhookData.form_type,
        submitted_at: webhookData.created_at,
        responses: {},
      };

      // Group fields by category
      fields.forEach((field: any) => {
        if (field.label && field.values?.[0]?.answer) {
          intakeData.responses[field.label] = field.values[0].answer;
        }
      });

      return intakeData;
    } finally {
      client.release();
    }
  }

  /**
   * Update patient status
   */
  static async updatePatientStatus(
    patientId: string,
    status: string,
    reviewedBy?: string
  ): Promise<boolean> {
    const client = await pool.connect();

    try {
      const query = `
        UPDATE patients 
        SET 
          status = $2,
          reviewed_by = $3,
          reviewed_at = CASE WHEN $3 IS NOT NULL THEN NOW() ELSE reviewed_at END,
          updated_at = NOW()
        WHERE patient_id = $1 OR id = $1
      `;

      const result = await client.query(query, [patientId, status, reviewedBy]);

      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
}

// Default export
export default PatientService;
