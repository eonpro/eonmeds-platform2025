import { Router } from 'express';
import pool from '../config/database';

const router = Router();

// Get all packages
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT * FROM service_packages 
      ORDER BY category, billing_period, price
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      packages: result.rows
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch packages' 
    });
  }
});

// Get active packages (for invoice creation)
router.get('/active', async (req, res) => {
  try {
    const query = `
      SELECT * FROM service_packages 
      WHERE is_active = true
      ORDER BY category, billing_period, price
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      packages: result.rows
    });
  } catch (error) {
    console.error('Error fetching active packages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch packages' 
    });
  }
});

// Create new package
router.post('/', async (req, res) => {
  try {
    const { name, category, billing_period, price, description, is_active } = req.body;
    
    const query = `
      INSERT INTO service_packages (
        name, category, billing_period, price, description, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [name, category, billing_period, price, description, is_active];
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      package: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create package' 
    });
  }
});

// Update package
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, billing_period, price, description, is_active } = req.body;
    
    const query = `
      UPDATE service_packages 
      SET name = $2, 
          category = $3, 
          billing_period = $4, 
          price = $5, 
          description = $6, 
          is_active = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, name, category, billing_period, price, description, is_active];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Package not found' 
      });
    }
    
    res.json({
      success: true,
      package: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update package' 
    });
  }
});

// Toggle package active status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    const query = `
      UPDATE service_packages 
      SET is_active = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, is_active];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Package not found' 
      });
    }
    
    res.json({
      success: true,
      package: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating package status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update package status' 
    });
  }
});

// Delete package
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if package is used in any invoices
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM invoice_items 
      WHERE service_package_id = $1
    `;
    
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete package that has been used in invoices' 
      });
    }
    
    const deleteQuery = `
      DELETE FROM service_packages 
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Package not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete package' 
    });
  }
});

export default router; 