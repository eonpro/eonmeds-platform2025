import { Request, Response } from 'express';
import { query } from '../config/database';
import { auditAction } from '../middleware/audit';

// Auth0 provides authentication, but we need to sync users with our database
interface Auth0User {
  sub: string; // Auth0 user ID
  email: string;
  name?: string;
  picture?: string;
  'https://eonmeds.com/roles'?: string[];
  'https://eonmeds.com/language'?: string;
}

// Sync Auth0 user with local database
export const syncAuth0User = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth0User = (req as any).auth as Auth0User;

    if (!auth0User) {
      res.status(401).json({ error: 'No Auth0 user found' });
      return;
    }

    // Check if user exists in our database
    const existingUser = await query('SELECT id, auth0_id FROM users WHERE auth0_id = $1', [
      auth0User.sub,
    ]);

    let userId: string;

    if (existingUser.rows.length === 0) {
      // Create new user from Auth0 data
      const nameParts = (auth0User.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Get role from Auth0 token
      const auth0Roles = auth0User['https://eonmeds.com/roles'] || ['patient'];
      const roleCode = auth0Roles[0] || 'patient';

      // Get role ID from database
      const roleResult = await query('SELECT id FROM roles WHERE code = $1', [roleCode]);

      if (roleResult.rows.length === 0) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }

      // Create user in our database
      const createUserResult = await query(
        `INSERT INTO users 
         (auth0_id, email, first_name, last_name, role_id, is_active, email_verified) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [
          auth0User.sub,
          auth0User.email.toLowerCase(),
          firstName,
          lastName,
          roleResult.rows[0].id,
          true,
          true, // Auth0 handles email verification
        ]
      );

      userId = createUserResult.rows[0].id;

      // Log user creation
      await auditAction(req as any, 'USER_CREATED_FROM_AUTH0', 'user', userId, {
        auth0_id: auth0User.sub,
        email: auth0User.email,
      });
    } else {
      userId = existingUser.rows[0].id;

      // Update last login
      await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
    }

    // Get full user details
    const userResult = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              r.code as role_code, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    const user = userResult.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role_name,
      roleCode: user.role_code,
      permissions: user.permissions,
      language: auth0User['https://eonmeds.com/language'] || 'en',
    });
  } catch (error) {
    console.error('Sync Auth0 user error:', error);
    res.status(500).json({ error: 'Failed to sync user data' });
  }
};

// Get current user (from Auth0 token)
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth0User = (req as any).auth as Auth0User;

    if (!auth0User || !auth0User.sub) {
      res.status(401).json({ error: 'No authenticated user' });
      return;
    }

    // Get user from database using Auth0 ID
    const userResult = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              r.code as role_code, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.auth0_id = $1`,
      [auth0User.sub]
    );

    if (userResult.rows.length === 0) {
      // User not synced yet - call sync endpoint
      res.status(404).json({
        error: 'User not found in database',
        message: 'Please call /auth/sync endpoint first',
      });
      return;
    }

    const user = userResult.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role_name,
      roleCode: user.role_code,
      permissions: user.permissions,
      language: auth0User['https://eonmeds.com/language'] || 'en',
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth0User = (req as any).auth as Auth0User;
    const { firstName, lastName, phone } = req.body;

    if (!auth0User || !auth0User.sub) {
      res.status(401).json({ error: 'No authenticated user' });
      return;
    }

    // Update user in database
    const updateResult = await query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           updated_at = NOW()
       WHERE auth0_id = $4
       RETURNING id, email, first_name, last_name, phone`,
      [firstName, lastName, phone, auth0User.sub]
    );

    if (updateResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = updateResult.rows[0];

    // Log profile update
    await auditAction(req as any, 'USER_PROFILE_UPDATE', 'user', user.id, {
      fields_updated: Object.keys(req.body),
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Note: Login, logout, and password management are handled by Auth0
// These endpoints are no longer needed:
// - register (use Auth0 signup)
// - login (use Auth0 universal login)
// - logout (handled by Auth0)
// - refreshToken (Auth0 handles token refresh)
// - resetPassword (use Auth0 password reset flow)
