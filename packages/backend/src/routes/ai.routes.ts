import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { checkJwt, checkRole } from '../middleware/auth0';
import { pool } from '../config/database';

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
      
      return res.json({
        success: true,
        soapNote: result.data
      });
    } catch (error) {
      console.error('Error generating SOAP note:', error);
      return res.status(500).json({
        error: 'Failed to generate SOAP note',
        details: error instanceof Error ? error.message : 'Unknown error'
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
      
      let query = 'SELECT * FROM soap_notes WHERE patient_id = $1';
      const params: any[] = [patientId];
      
      if (status) {
        query += ' AND status = $2';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await pool.query(query, params);
      
      return res.json({
        success: true,
        soapNotes: result.rows
      });
    } catch (error) {
      console.error('Error fetching SOAP notes:', error);
      return res.status(500).json({
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
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { soapNoteId } = req.params;
      const { status, content } = req.body;
      const auth = (req as any).auth;
      
      // Validate status
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be "approved" or "rejected"'
        });
      }
      
      // Begin transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Get user details
        const userResult = await client.query(
          'SELECT id, first_name, last_name FROM users WHERE auth0_id = $1',
          [auth.sub]
        );
        
        if (userResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        // Update SOAP note
        const updateResult = await client.query(
          `UPDATE soap_notes 
           SET status = $1, 
               content = COALESCE($2, content),
               approved_by = $3,
               approved_by_name = $4,
               approved_at = NOW(),
               updated_at = NOW()
           WHERE id = $5
           RETURNING *`,
          [
            status,
            content,
            user.id,
            `${user.first_name} ${user.last_name}`,
            soapNoteId
          ]
        );
        
        if (updateResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'SOAP note not found' });
        }
        
        // Log the action
        await client.query(
          `INSERT INTO ai_audit_log (
            action_type, performed_by, user_role, patient_id,
            action_details, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            `soap_note_${status}`,
            user.id,
            'doctor',
            updateResult.rows[0].patient_id,
            JSON.stringify({ soap_note_id: soapNoteId, status })
          ]
        );
        
        await client.query('COMMIT');
        
        return res.json({
          success: true,
          soapNote: updateResult.rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating SOAP note status:', error);
      return res.status(500).json({
        error: 'Failed to update SOAP note status'
      });
    }
  }
);

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
        return res.status(404).json({ error: 'SOAP note not found' });
      }
      
      if (checkResult.rows[0].status === 'approved') {
        return res.status(403).json({ 
          error: 'Cannot delete approved SOAP notes' 
        });
      }
      
      // Delete the SOAP note
      await pool.query('DELETE FROM soap_notes WHERE id = $1', [soapNoteId]);
      
      return res.json({
        success: true,
        message: 'SOAP note deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting SOAP note:', error);
      return res.status(500).json({
        error: 'Failed to delete SOAP note'
      });
    }
  }
);

export default router; 