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
  async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      
      // Check if OpenAI is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          error: 'AI service not configured. Please contact administrator.'
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
  async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const { status } = req.query;

      // Query to get SOAP notes
      let query = `
        SELECT 
          sn.*,
          u.full_name as approver_name
        FROM soap_notes sn
        LEFT JOIN users u ON sn.approved_by = u.id
        WHERE sn.patient_id = $1
      `;
      
      const params: any[] = [patientId];
      
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
      res.status(500).json({
        error: 'Failed to fetch SOAP notes'
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
  async (req: Request, res: Response) => {
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

export default router; 