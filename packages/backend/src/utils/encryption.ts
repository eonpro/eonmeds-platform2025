/**
 * PHI Encryption Service
 * HIPAA-compliant encryption for Protected Health Information
 */

import crypto from 'crypto';
import { logger } from './logger';

export class PHIEncryption {
  private static algorithm = 'aes-256-gcm';
  private static keyDerivationSalt = process.env.PHI_KEY_SALT || 'default-salt-change-in-production';
  
  /**
   * Get or derive encryption key from environment
   */
  private static getKey(): Buffer {
    const masterKey = process.env.PHI_ENCRYPTION_KEY;
    
    if (!masterKey) {
      logger.error('PHI_ENCRYPTION_KEY not configured - PHI encryption disabled');
      throw new Error('PHI encryption key not configured');
    }
    
    // Derive key using PBKDF2 for added security
    return crypto.pbkdf2Sync(masterKey, this.keyDerivationSalt, 100000, 32, 'sha256');
  }
  
  /**
   * Encrypt sensitive PHI data
   */
  static encrypt(text: string | null | undefined): { encrypted: string; iv: string; tag: string } | null {
    if (!text) return null;
    
    try {
      const key = this.getKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv) as crypto.CipherGCM;
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: cipher.getAuthTag().toString('hex')
      };
    } catch (error) {
      logger.error('PHI encryption failed', error);
      throw new Error('Failed to encrypt PHI data');
    }
  }
  
  /**
   * Decrypt PHI data
   */
  static decrypt(data: { encrypted: string; iv: string; tag: string } | null): string | null {
    if (!data) return null;
    
    try {
      const key = this.getKey();
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        key, 
        Buffer.from(data.iv, 'hex')
      ) as crypto.DecipherGCM;
      decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
      
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('PHI decryption failed', error);
      throw new Error('Failed to decrypt PHI data');
    }
  }
  
  /**
   * Hash sensitive data for searching (one-way)
   */
  static hash(text: string): string {
    const salt = process.env.PHI_HASH_SALT || 'default-hash-salt';
    return crypto
      .createHash('sha256')
      .update(text + salt)
      .digest('hex');
  }
  
  /**
   * Encrypt multiple fields in an object
   */
  static encryptObject<T extends Record<string, any>>(
    obj: T, 
    fieldsToEncrypt: (keyof T)[]
  ): T {
    const encrypted = { ...obj };
    
    for (const field of fieldsToEncrypt) {
      const value = obj[field];
      if (value && typeof value === 'string') {
        const encryptedData = this.encrypt(value);
        if (encryptedData) {
          (encrypted as any)[`${String(field)}_encrypted`] = encryptedData;
          delete encrypted[field];
        }
      }
    }
    
    return encrypted;
  }
  
  /**
   * Decrypt multiple fields in an object
   */
  static decryptObject<T extends Record<string, any>>(
    obj: T, 
    fieldsToDecrypt: string[]
  ): T {
    const decrypted = { ...obj };
    
    for (const field of fieldsToDecrypt) {
      const encryptedField = `${field}_encrypted`;
      const encryptedData = (obj as any)[encryptedField];
      
      if (encryptedData) {
        const decryptedValue = this.decrypt(encryptedData);
        if (decryptedValue) {
          (decrypted as any)[field] = decryptedValue;
          delete (decrypted as any)[encryptedField];
        }
      }
    }
    
    return decrypted;
  }
  
  /**
   * Generate a secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Validate encryption configuration
   */
  static validateConfiguration(): boolean {
    try {
      const testData = 'test-phi-data';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted!);
      
      if (decrypted !== testData) {
        logger.error('PHI encryption validation failed');
        return false;
      }
      
      logger.info('PHI encryption validated successfully');
      return true;
    } catch (error) {
      logger.error('PHI encryption configuration invalid', error);
      return false;
    }
  }
}

// Fields that contain PHI and should be encrypted
// Note: date_of_birth is NOT encrypted per requirements
export const PHI_FIELDS = [
  'ssn',
  'social_security_number',
  'medical_record_number',
  'insurance_id',
  'driver_license',
  'passport_number'
];

// Export for use in other modules
export default PHIEncryption;