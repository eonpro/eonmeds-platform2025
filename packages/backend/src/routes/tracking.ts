import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Simple authentication for Google Apps Script
const TRACKING_API_KEY = process.env.TRACKING_API_KEY || 'your-secure-api-key';

const authenticateTracking = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (apiKey !== TRACKING_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// Endpoint for Google Apps Script to send tracking data
router.post('/import', 
  authenticateTracking,
  [
    body('tracking_number').notEmpty().trim(),
    body('carrier').isIn(['FedEx', 'UPS']).trim(),
    body('recipient_name').notEmpty().trim(),
    body('delivery_address').optional().trim(),
    body('delivery_date').optional().isISO8601(),
    body('ship_date').optional().isISO8601(),
    body('weight').optional().trim(),
    body('service').optional().trim(),
    body('status').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if tracking number already exists
      const existingResult = await pool.query(
        'SELECT id FROM patient_tracking WHERE tracking_number = $1',
        [req.body.tracking_number]
      );

      if (existingResult.rows.length > 0) {
        // Update existing record
        await pool.query(`
          UPDATE patient_tracking 
          SET status = $2, 
              delivery_date = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE tracking_number = $1
        `, [
          req.body.tracking_number,
          req.body.status || 'In Transit',
          req.body.delivery_date
        ]);
        
        return res.json({ 
          message: 'Tracking updated',
          tracking_number: req.body.tracking_number 
        });
      }

      // Insert new tracking record
      const result = await pool.query(`
        INSERT INTO patient_tracking (
          tracking_number, carrier, recipient_name, delivery_address,
          delivery_date, ship_date, weight, service_type, status,
          tracking_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        req.body.tracking_number,
        req.body.carrier,
        req.body.recipient_name,
        req.body.delivery_address,
        req.body.delivery_date,
        req.body.ship_date,
        req.body.weight,
        req.body.service,
        req.body.status || 'In Transit',
        req.body.carrier === 'FedEx' 
          ? `https://www.fedex.com/fedextrack/?trknbr=${req.body.tracking_number}`
          : `https://www.ups.com/track?tracknum=${req.body.tracking_number}`
      ]);

      res.status(201).json({ 
        message: 'Tracking created',
        id: result.rows[0].id,
        tracking_number: req.body.tracking_number 
      });

    } catch (error) {
      console.error('Tracking import error:', error);
      res.status(500).json({ error: 'Failed to import tracking data' });
    }
  }
);

// Search endpoint for your dashboard
router.get('/search',
  authenticateToken,
  [
    query('q').optional().trim(),
    query('carrier').optional().isIn(['FedEx', 'UPS']),
    query('status').optional().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { q, carrier, status, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramCount = 0;

      if (q) {
        paramCount++;
        whereClause += ` AND (
          tracking_number ILIKE $${paramCount} OR 
          recipient_name ILIKE $${paramCount} OR 
          delivery_address ILIKE $${paramCount}
        )`;
        params.push(`%${q}%`);
      }

      if (carrier) {
        paramCount++;
        whereClause += ` AND carrier = $${paramCount}`;
        params.push(carrier);
      }

      if (status) {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM patient_tracking ${whereClause}`,
        params
      );

      // Get paginated results
      paramCount++;
      params.push(limit);
      paramCount++;
      params.push(offset);
      
      const results = await pool.query(`
        SELECT 
          id, patient_id, tracking_number, carrier, recipient_name,
          delivery_address, delivery_date, ship_date, weight,
          service_type, status, tracking_url, created_at
        FROM patient_tracking 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount - 1} OFFSET $${paramCount}
      `, params);

      res.json({
        data: results.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Tracking search error:', error);
      res.status(500).json({ error: 'Failed to search tracking data' });
    }
  }
);

// Get tracking for specific patient
router.get('/patient/:patientId',
  authenticateToken,
  [
    param('patientId').isInt().toInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const results = await pool.query(`
        SELECT 
          id, tracking_number, carrier, recipient_name,
          delivery_date, status, tracking_url, created_at
        FROM patient_tracking 
        WHERE patient_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [req.params.patientId]);

      res.json(results.rows);

    } catch (error) {
      console.error('Patient tracking error:', error);
      res.status(500).json({ error: 'Failed to get patient tracking' });
    }
  }
);

export default router;
