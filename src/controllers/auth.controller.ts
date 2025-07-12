import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { 
  generateToken, 
  generateRefreshToken, 
  hashPassword, 
  comparePassword,
  AuthRequest 
} from '../middleware/auth';
import { auditAction } from '../middleware/audit';

// Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, roleCode } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Get role (default to patient if not specified)
    const roleResult = await query(
      'SELECT id FROM roles WHERE code = $1',
      [roleCode || 'patient']
    );

    if (roleResult.rows.length === 0) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const createUserResult = await query(
      `INSERT INTO users 
       (email, password_hash, first_name, last_name, phone, role_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name`,
      [
        email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone || null,
        roleResult.rows[0].id
      ]
    );

    const newUser = createUserResult.rows[0];

    // Log registration
    await auditAction(
      req as AuthRequest,
      'USER_REGISTER',
      'user',
      newUser.id,
      { email: newUser.email, role: roleCode || 'patient' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    // Get user with role
    const userResult = await query(
      `SELECT u.*, r.code as role_code, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      res.status(401).json({ error: 'Account locked. Please try again later.' });
      return;
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed attempts
      await query(
        `UPDATE users 
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE 
               WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
               ELSE NULL
             END
         WHERE id = $1`,
        [user.id]
      );

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if user is active
    if (!user.is_active) {
      res.status(401).json({ error: 'Account deactivated' });
      return;
    }

    // Reset failed attempts and update last login
    await query(
      `UPDATE users 
       SET failed_login_attempts = 0,
           locked_until = NULL,
           last_login = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user.id);

    // Log successful login
    await auditAction(
      req as AuthRequest,
      'USER_LOGIN',
      'auth',
      user.id,
      { email: user.email }
    );

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name,
        roleCode: user.role_code
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!);
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    // Get user with role
    const userResult = await query(
      `SELECT u.*, r.code as role_code, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

// Logout
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Log logout
    await auditAction(
      req,
      'USER_LOGOUT',
      'auth',
      req.user?.id
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Get current user
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userResult = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              r.code as role_code, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
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
      permissions: user.permissions
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
}; 