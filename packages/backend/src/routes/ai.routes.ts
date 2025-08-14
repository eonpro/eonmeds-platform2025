import { Router, Request, Response } from "express";
import { AIService } from "../services/ai.service";
import { checkJwt, checkRole } from "../middleware/auth0";
import { pool } from "../config/database";

const router = Router();

/**
 * Generate SOAP note for a patient
 * POST /api/v1/ai/generate-soap/:patientId
 */
router.post(
<<<<<<< HEAD
  '/generate-soap/:patientId',
=======
  "/generate-soap/:patientId",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
  checkJwt,
  checkRole(["admin", "doctor", "representative"]),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;

      // Check if OpenAI is configured
      if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not configured");
        return res.status(503).json({
<<<<<<< HEAD
          error: 'AI service not configured. Please add OPENAI_API_KEY to environment variables.',
=======
          error:
            "AI service not configured. Please add OPENAI_API_KEY to environment variables.",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
        });
      }

      // Generate SOAP note
      const result = await AIService.generateSOAPNote(patientId);

      if (!result.success) {
        return res.status(500).json({
<<<<<<< HEAD
          error: result.error || 'Failed to generate SOAP note',
=======
          error: result.error || "Failed to generate SOAP note",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
        });
      }

      return res.json(result);
    } catch (error) {
      console.error("Error generating SOAP note:", error);
      return res.status(500).json({
<<<<<<< HEAD
        error: 'Failed to generate SOAP note',
        details: error instanceof Error ? error.message : 'Unknown error',
=======
        error: "Failed to generate SOAP note",
        details: error instanceof Error ? error.message : "Unknown error",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
      });
    }
  },
);

/**
 * Get SOAP notes for a patient
 * GET /api/v1/ai/soap-notes/:patientId
 */
router.get(
<<<<<<< HEAD
  '/soap-notes/:patientId',
=======
  "/soap-notes/:patientId",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
  checkJwt,
  checkRole(["admin", "doctor", "representative"]),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { status } = req.query;

      // Debug log to confirm new code is deployed
<<<<<<< HEAD
      console.log(`Fetching SOAP notes for patient: ${patientId} (VARCHAR format)`);

      let query = 'SELECT * FROM soap_notes WHERE patient_id = $1';
=======
      console.log(
        `Fetching SOAP notes for patient: ${patientId} (VARCHAR format)`,
      );

      let query = "SELECT * FROM soap_notes WHERE patient_id = $1";
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
      const params: any[] = [patientId];

      if (status) {
        query += " AND status = $2";
        params.push(status);
      }

<<<<<<< HEAD
      query += ' ORDER BY created_at DESC';
=======
      query += " ORDER BY created_at DESC";
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        soapNotes: result.rows,
      });
    } catch (error) {
      console.error("Error fetching SOAP notes:", error);
      return res.status(500).json({
<<<<<<< HEAD
        error: 'Failed to fetch SOAP notes',
=======
        error: "Failed to fetch SOAP notes",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
      });
    }
  },
);

/**
 * Approve or reject a SOAP note
 * PUT /api/v1/ai/soap-notes/:soapNoteId/status
 */
router.put(
<<<<<<< HEAD
  '/soap-notes/:soapNoteId/status',
=======
  "/soap-notes/:soapNoteId/status",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
  checkJwt,
  checkRole(["doctor"]),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { soapNoteId } = req.params;
      const { status, content } = req.body;
      const auth = (req as any).auth;

      // Validate status
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be "approved" or "rejected"',
        });
      }

      // Begin transaction
      const client = await pool.connect();

      try {
<<<<<<< HEAD
        await client.query('BEGIN');
=======
        await client.query("BEGIN");
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33

        // Get user details
        const userResult = await client.query(
          "SELECT id, first_name, last_name FROM users WHERE auth0_id = $1",
          [auth.sub],
        );

        if (userResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "User not found" });
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
<<<<<<< HEAD
          [status, content, user.id, `${user.first_name} ${user.last_name}`, soapNoteId]
=======
          [
            status,
            content,
            user.id,
            `${user.first_name} ${user.last_name}`,
            soapNoteId,
          ],
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
        );

        if (updateResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "SOAP note not found" });
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
            "doctor",
            updateResult.rows[0].patient_id,
            JSON.stringify({ soap_note_id: soapNoteId, status }),
<<<<<<< HEAD
          ]
        );

        await client.query('COMMIT');
=======
          ],
        );

        await client.query("COMMIT");
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33

        return res.json({
          success: true,
          soapNote: updateResult.rows[0],
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating SOAP note status:", error);
      return res.status(500).json({
<<<<<<< HEAD
        error: 'Failed to update SOAP note status',
=======
        error: "Failed to update SOAP note status",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
      });
    }
  },
);

/**
 * Delete a SOAP note (only if not approved)
 * DELETE /api/v1/ai/soap-notes/:soapNoteId
 */
router.delete(
<<<<<<< HEAD
  '/soap-notes/:soapNoteId',
=======
  "/soap-notes/:soapNoteId",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
  checkJwt,
  checkRole(["admin", "doctor", "superadmin"]),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { soapNoteId } = req.params;

      // First check if the note exists and is not approved
<<<<<<< HEAD
      const checkResult = await pool.query('SELECT status FROM soap_notes WHERE id = $1', [
        soapNoteId,
      ]);
=======
      const checkResult = await pool.query(
        "SELECT status FROM soap_notes WHERE id = $1",
        [soapNoteId],
      );
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: "SOAP note not found" });
      }

<<<<<<< HEAD
      if (checkResult.rows[0].status === 'approved') {
        return res.status(403).json({
          error: 'Cannot delete approved SOAP notes',
=======
      if (checkResult.rows[0].status === "approved") {
        return res.status(403).json({
          error: "Cannot delete approved SOAP notes",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
        });
      }

      // Delete the SOAP note
<<<<<<< HEAD
      await pool.query('DELETE FROM soap_notes WHERE id = $1', [soapNoteId]);

      return res.json({
        success: true,
        message: 'SOAP note deleted successfully',
=======
      await pool.query("DELETE FROM soap_notes WHERE id = $1", [soapNoteId]);

      return res.json({
        success: true,
        message: "SOAP note deleted successfully",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
      });
    } catch (error) {
      console.error("Error deleting SOAP note:", error);
      return res.status(500).json({
<<<<<<< HEAD
        error: 'Failed to delete SOAP note',
=======
        error: "Failed to delete SOAP note",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
      });
    }
  },
);

export default router;
