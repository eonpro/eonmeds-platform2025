import { Router, Request, Response } from 'express';
import { pool } from '../config/database';

const router = Router();

// Get all packages
router.get('/', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const query = `
      SELECT * FROM service_packages 
      ORDER BY category, billing_period, price
    `;
    
    const result = await pool.query(query);
    
    return res.json({
      success: true,
      packages: result.rows
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch packages' 
    });
  }
});

// Get active packages (for invoice creation)
router.get('/active', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const query = `
      SELECT * FROM service_packages 
      WHERE is_active = true
      ORDER BY category, billing_period, price
    `;
    
    const result = await pool.query(query);
    
    return res.json({
      success: true,
      packages: result.rows
    });
  } catch (error) {
    console.error('Error fetching active packages:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch active packages' 
    });
  }
});

// Get packages by category
router.get('/category/:category', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { category } = req.params;
    
    const query = `
      SELECT * FROM service_packages 
      WHERE category = $1 AND is_active = true
      ORDER BY billing_period, price
    `;
    
    const result = await pool.query(query, [category]);
    
    return res.json({
      success: true,
      packages: result.rows
    });
  } catch (error) {
    console.error('Error fetching packages by category:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch packages' 
    });
  }
});

// Get a single package by ID
router.get('/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM service_packages WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Package not found'
      });
    }
    
    return res.json({
      success: true,
      package: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch package' 
    });
  }
});

// Create a new package (admin only)
router.post('/', async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      package_id,
      name,
      description,
      category,
      billing_period,
      price,
      stripe_price_id,
      is_active = true,
      features,
      metadata
    } = req.body;
    
    const query = `
      INSERT INTO service_packages (
        package_id, name, description, category, billing_period,
        price, stripe_price_id, is_active, features, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      package_id,
      name,
      description,
      category,
      billing_period,
      price,
      stripe_price_id,
      is_active,
      features || [],
      metadata || {}
    ];
    
    const result = await pool.query(query, values);
    
    return res.status(201).json({
      success: true,
      package: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating package:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create package' 
    });
  }
});

// Update a package (admin only)
router.put('/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE service_packages 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...values]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Package not found'
      });
    }
    
    return res.json({
      success: true,
      package: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating package:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update package' 
    });
  }
});

// Deactivate a package (soft delete)
router.delete('/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    
    const query = `
      UPDATE service_packages 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Package not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Package deactivated successfully',
      package: result.rows[0]
    });
  } catch (error) {
    console.error('Error deactivating package:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to deactivate package' 
    });
  }
});

export default router; 