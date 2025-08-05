import { ManagementClient } from 'auth0';
import { Request } from 'express';

interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
}

export class Auth0Service {
  private management: ManagementClient;
  private config: Auth0Config;

  constructor() {
    this.config = {
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      audience: process.env.AUTH0_AUDIENCE!
    };

    if (!this.config.domain || !this.config.clientId || !this.config.clientSecret) {
      throw new Error('Auth0 configuration is incomplete. Please set all required environment variables.');
    }

    // Use client credentials grant
    this.management = new ManagementClient({
      domain: this.config.domain,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      audience: `https://${this.config.domain}/api/v2/`,
      scope: 'read:users update:users create:users delete:users read:roles create:roles update:roles delete:roles'
    });
  }

  /**
   * Get user from Auth0 by ID
   */
  async getUser(userId: string) {
    try {
      return await this.management.users.get({ id: userId });
    } catch (error) {
      console.error('Error fetching user from Auth0:', error);
      throw error;
    }
  }

  /**
   * Create a new user in Auth0
   */
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    connection?: string;
    user_metadata?: any;
    app_metadata?: any;
  }) {
    try {
      const user = await this.management.users.create({
        ...userData,
        connection: userData.connection || 'Username-Password-Authentication'
      });
      
      return user;
    } catch (error) {
      console.error('Error creating user in Auth0:', error);
      throw error;
    }
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(userId: string, metadata: any) {
    try {
      return await this.management.users.update({ id: userId }, { user_metadata: metadata });
    } catch (error) {
      console.error('Error updating user metadata:', error);
      throw error;
    }
  }

  /**
   * Assign roles to user
   */
  async assignRolesToUser(userId: string, roleIds: string[]) {
    try {
      await this.management.users.assignRoles({ id: userId }, { roles: roleIds });
    } catch (error) {
      console.error('Error assigning roles to user:', error);
      throw error;
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string) {
    try {
      return await this.management.users.getRoles({ id: userId });
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw error;
    }
  }

  /**
   * Extract user info from request
   */
  getUserFromRequest(req: Request): {
    id: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
  } | null {
    const auth = (req as any).auth;
    if (!auth) return null;

    return {
      id: auth.sub,
      email: auth.email,
      roles: auth['https://eonmeds.com/roles'] || auth.roles || [],
      permissions: auth.permissions || []
    };
  }

  /**
   * Verify user has required role
   */
  userHasRole(req: Request, role: string): boolean {
    const user = this.getUserFromRequest(req);
    if (!user) return false;
    
    return user.roles?.includes(role) || false;
  }

  /**
   * Verify user has required permission
   */
  userHasPermission(req: Request, permission: string): boolean {
    const user = this.getUserFromRequest(req);
    if (!user) return false;
    
    return user.permissions?.includes(permission) || false;
  }

  /**
   * Create or get Auth0 user for a patient
   */
  async createPatientAuth0User(patientData: {
    email: string;
    firstName: string;
    lastName: string;
    patientId: string;
  }) {
    try {
      // Check if user already exists
      const existingUsersResponse = await this.management.usersByEmail.getByEmail({ email: patientData.email });
      const existingUsers = existingUsersResponse.data || [];
      
      if (existingUsers.length > 0) {
        // Update existing user with patient metadata
        const user = existingUsers[0];
        await this.updateUserMetadata(user.user_id!, {
          patient_id: patientData.patientId,
          first_name: patientData.firstName,
          last_name: patientData.lastName
        });
        return user;
      }

      // Create new user
      const user = await this.createUser({
        email: patientData.email,
        password: this.generateTemporaryPassword(),
        name: `${patientData.firstName} ${patientData.lastName}`,
        user_metadata: {
          patient_id: patientData.patientId,
          first_name: patientData.firstName,
          last_name: patientData.lastName
        },
        app_metadata: {
          role: 'patient'
        }
      });

      // TODO: Send password reset email
      
      return user;
    } catch (error) {
      console.error('Error creating patient Auth0 user:', error);
      throw error;
    }
  }

  /**
   * Generate a temporary password
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
} 