import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { checkJwt, checkRole } from '../middleware/auth0';

const router = Router();

/**
 * Generate SOAP note for a patient
 * POST /api/v1/ai/generate-soap/:patientId
 */
router.post('/generate-soap/:patientId', 
  checkJwt,
  checkRole(['admin', 'doctor', 'representative']),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      
      // Check if OpenAI is configured
      if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not configured');
        return res.status(503).json({
          error: 'AI service not configured. Please add OPENAI_API_KEY to environment variables.'
        });
      }

      // Generate SOAP note
      const result = await AIService.generateSOAPNote(patientId);
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error || 'Failed to generate SOAP note'
        });
      }

      res.json({
        success: true,
        soapNote: result.soapNote,
        usage: result.usage
      });

    } catch (error) {
      console.error('Error in generate-soap endpoint:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

/**
 * Get SOAP notes for a patient
 * GET /api/v1/ai/soap-notes/:patientId
 */
router.get('/soap-notes/:patientId',
  checkJwt,
  checkRole(['admin', 'doctor', 'representative']),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { status } = req.query;

      // Query to get SOAP notes
      // First get the patient's UUID if needed
      const patientResult = await pool.query(
        'SELECT id FROM patients WHERE patient_id = $1 OR id::text = $1',
        [patientId]
      );
      
      if (patientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Patient not found'
        });
      }
      
      const patientUUID = patientResult.rows[0].id;
      
      let query = `
        SELECT 
          sn.*
        FROM soap_notes sn
        WHERE sn.patient_id = $1
      `;
      
      const params: any[] = [patientUUID];
      
      if (status) {
        query += ' AND sn.status = $2';
        params.push(status);
      }
      
      query += ' ORDER BY sn.created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        soapNotes: result.rows
      });

    } catch (error) {
      console.error('Error fetching SOAP notes:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        patientId: req.params.patientId
      });
      res.status(500).json({
        error: 'Failed to fetch SOAP notes',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Approve or reject a SOAP note
 * PUT /api/v1/ai/soap-notes/:soapNoteId/status
 */
router.put('/soap-notes/:soapNoteId/status',
  checkJwt,
  checkRole(['doctor']),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { soapNoteId } = req.params;
      const { status, content } = req.body;
      const auth = (req as any).auth;
      const userId = auth?.sub;
      const userFullName = auth?.name || 'Dr.';
      const userCredentials = 'MD';

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be approved or rejected.'
        });
      }

      const query = `
        UPDATE soap_notes
        SET 
          status = $2,
          content = COALESCE($3, content),
          approved_by = $4,
          approved_by_name = $5,
          approved_by_credentials = $6,
          approved_at = NOW(),
          version = version + 1
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [
        soapNoteId,
        status,
        content, // Allow editing before approval
        userId,
        userFullName,
        userCredentials
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'SOAP note not found'
        });
      }

      res.json({
        success: true,
        soapNote: result.rows[0]
      });

    } catch (error) {
      console.error('Error updating SOAP note status:', error);
      res.status(500).json({
        error: 'Failed to update SOAP note status'
      });
    }
  }
);

// Import pool
import { pool } from '../config/database';

/**
 * Delete a SOAP note (only if not approved)
 * DELETE /api/v1/ai/soap-notes/:soapNoteId
 */
router.delete('/soap-notes/:soapNoteId',
  checkJwt,
  checkRole(['admin', 'doctor', 'superadmin']),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { soapNoteId } = req.params;
      
      // First check if the note exists and is not approved
      const checkResult = await pool.query(
        'SELECT status FROM soap_notes WHERE id = $1',
        [soapNoteId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          error: 'SOAP note not found'
        });
      }
      
      if (checkResult.rows[0].status === 'approved') {
        return res.status(403).json({
          error: 'Cannot delete approved SOAP notes'
        });
      }
      
      // Delete the note
      await pool.query(
        'DELETE FROM soap_notes WHERE id = $1',
        [soapNoteId]
      );
      
      res.json({
        success: true,
        message: 'SOAP note deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting SOAP note:', error);
      res.status(500).json({
        error: 'Failed to delete SOAP note'
      });
    }
  }
);

export default router; 