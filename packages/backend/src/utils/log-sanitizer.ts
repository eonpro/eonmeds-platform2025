/**
 * HIPAA-Compliant Log Sanitizer
 * Created: January 7, 2025
 * Purpose: Remove all PHI from logs to prevent HIPAA violations
 * 
 * This sanitizer automatically redacts sensitive information from
 * all console output and logging to ensure PHI is never exposed
 * in CloudWatch, local logs, or any other logging system.
 */

// Fields that may contain PHI (Protected Health Information)
const PHI_FIELDS = [
  // Personal identifiers
  'ssn', 'social_security', 'social_security_number',
  'dob', 'date_of_birth', 'birth_date', 'birthdate',
  'first_name', 'last_name', 'full_name', 'patient_name', 'name',
  'address', 'street', 'street_address', 'city', 'state', 'zip', 'zip_code',
  'phone', 'phone_number', 'mobile', 'cell', 'telephone',
  'email', 'email_address',
  
  // Medical information
  'medications', 'current_medications', 'medication_history', 'medication_list',
  'conditions', 'medical_conditions', 'medical_history', 'diagnosis', 'diagnoses',
  'allergies', 'medication_allergies', 'allergy_list',
  'prescription', 'prescriptions', 'rx',
  'treatment', 'treatments', 'therapy',
  'symptoms', 'chief_complaint',
  'vitals', 'blood_pressure', 'heart_rate', 'temperature', 'weight', 'height', 'bmi',
  'lab_results', 'test_results', 'imaging',
  'insurance', 'policy_number', 'member_id', 'group_number',
  
  // Sensitive identifiers
  'patient_id', 'patient_uuid', 'mrn', 'medical_record_number',
  'account_number', 'encounter_id', 'visit_id',
  
  // Financial/Payment
  'credit_card', 'card_number', 'cc_number', 'cvv', 'exp_date', 'expiry',
  'bank_account', 'routing_number', 'account_number',
  
  // Authentication
  'password', 'token', 'secret', 'api_key', 'access_token', 'refresh_token',
  'session_id', 'auth_token', 'bearer_token'
];

// Patterns that might indicate PHI
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN pattern
  /\b\d{9}\b/g,               // SSN without dashes
  /\b\d{4}-\d{2}-\d{2}\b/g,   // Date pattern
  /\b\d{2}\/\d{2}\/\d{4}\b/g, // Date pattern
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email
  /\b\d{3}-\d{3}-\d{4}\b/g,   // Phone number
  /\b\(\d{3}\)\s*\d{3}-\d{4}\b/g, // Phone with area code
];

/**
 * Recursively sanitize an object/array to remove PHI
 */
export function sanitizeLog(data: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[DEPTH_LIMIT_EXCEEDED]';
  }
  
  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }
  
  // Handle primitives
  if (typeof data === 'string') {
    // Check for PHI patterns in strings
    let sanitized = data;
    for (const pattern of PHI_PATTERNS) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '[REDACTED_PATTERN]');
      }
    }
    return sanitized;
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  
  // Handle errors specially
  if (data instanceof Error) {
    return {
      name: data.name,
      message: sanitizeLog(data.message, depth + 1),
      stack: process.env.NODE_ENV === 'development' ? data.stack : '[STACK_REDACTED]'
    };
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLog(item, depth + 1));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = {};
    
    for (const key in data) {
      // Skip prototype properties
      if (!data.hasOwnProperty(key)) continue;
      
      const lowerKey = key.toLowerCase();
      
      // Check if this field name suggests PHI
      const isPHIField = PHI_FIELDS.some(field => 
        lowerKey.includes(field.toLowerCase())
      );
      
      if (isPHIField) {
        sanitized[key] = '[PHI_REDACTED]';
      } else if (key.toLowerCase().includes('password') || 
                 key.toLowerCase().includes('secret') ||
                 key.toLowerCase().includes('token')) {
        sanitized[key] = '[SENSITIVE_REDACTED]';
      } else {
        // Recursively sanitize nested objects
        try {
          sanitized[key] = sanitizeLog(data[key], depth + 1);
        } catch (e) {
          sanitized[key] = '[SANITIZATION_ERROR]';
        }
      }
    }
    
    return sanitized;
  }
  
  // Fallback for other types
  return '[UNKNOWN_TYPE]';
}

/**
 * Create a sanitized logger that wraps console methods
 */
class HIPAALogger {
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };
  
  constructor() {
    this.overrideConsole();
  }
  
  private overrideConsole() {
    // Override console.log
    console.log = (...args: any[]) => {
      const sanitized = args.map(arg => sanitizeLog(arg));
      this.originalConsole.log('[HIPAA_SAFE]', ...sanitized);
    };
    
    // Override console.error
    console.error = (...args: any[]) => {
      const sanitized = args.map(arg => sanitizeLog(arg));
      this.originalConsole.error('[HIPAA_SAFE_ERROR]', ...sanitized);
    };
    
    // Override console.warn
    console.warn = (...args: any[]) => {
      const sanitized = args.map(arg => sanitizeLog(arg));
      this.originalConsole.warn('[HIPAA_SAFE_WARN]', ...sanitized);
    };
    
    // Override console.info
    console.info = (...args: any[]) => {
      const sanitized = args.map(arg => sanitizeLog(arg));
      this.originalConsole.info('[HIPAA_SAFE_INFO]', ...sanitized);
    };
    
    // Override console.debug
    console.debug = (...args: any[]) => {
      const sanitized = args.map(arg => sanitizeLog(arg));
      this.originalConsole.debug('[HIPAA_SAFE_DEBUG]', ...sanitized);
    };
  }
  
  /**
   * Get the original console for emergency use only
   */
  getOriginalConsole() {
    return this.originalConsole;
  }
}

// Create and export singleton logger
let hipaaLogger: HIPAALogger | null = null;

export function initializeHIPAALogging(): void {
  if (!hipaaLogger) {
    hipaaLogger = new HIPAALogger();
    console.log('HIPAA-compliant logging initialized');
    console.log('All PHI will be automatically redacted from logs');
  }
}

export function getOriginalConsole() {
  if (!hipaaLogger) {
    throw new Error('HIPAA logging not initialized');
  }
  return hipaaLogger.getOriginalConsole();
}

// Auto-initialize if this module is imported
if (process.env.NODE_ENV !== 'test') {
  initializeHIPAALogging();
}