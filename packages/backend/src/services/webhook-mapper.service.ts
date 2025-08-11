import { pool } from "../config/database";

interface FieldMapping {
  heyflowField: string;
  databaseField: string;
  transform?: (value: any) => any;
  required?: boolean;
}

interface FormConfiguration {
  id: string;
  formId: string;
  formName: string;
  formType: string;
  fieldMappings: { [key: string]: string };
  autoDetected?: boolean;
}

export class WebhookMapperService {
  private static instance: WebhookMapperService;
  private formConfigs: Map<string, FormConfiguration> = new Map();

  // Common field patterns for auto-detection
  private fieldPatterns = {
    firstName: [/first.*name/i, /nombre/i, /fname/i, /firstname/i],
    lastName: [/last.*name/i, /apellido/i, /lname/i, /lastname/i],
    email: [/email/i, /correo/i, /e-mail/i],
    phone: [/phone/i, /telefono/i, /mobile/i, /cell/i, /PhoneNumber/i],
    dateOfBirth: [/birth/i, /nacimiento/i, /dob/i, /birthday/i, /date.*birth/i],
    weight: [/weight/i, /peso/i, /lbs/i, /pounds/i, /starting.*weight/i],
    height: [/height/i, /altura/i, /feet/i, /inches/i],
    gender: [/gender/i, /sex/i, /genero/i, /sexo/i],
    consent: [/consent/i, /agree/i, /accept/i, /consentimiento/i],
  };

  private constructor() {
    this.loadConfigurations();
  }

  static getInstance(): WebhookMapperService {
    if (!WebhookMapperService.instance) {
      WebhookMapperService.instance = new WebhookMapperService();
    }
    return WebhookMapperService.instance;
  }

  /**
   * Load form configurations from database
   */
  private async loadConfigurations() {
    try {
      const result = await pool.query(`
        SELECT * FROM form_configurations WHERE is_active = true
      `);

      result.rows.forEach((config) => {
        this.formConfigs.set(config.heyflow_form_id, {
          id: config.id,
          formId: config.heyflow_form_id,
          formName: config.form_name,
          formType: config.form_type,
          fieldMappings: config.field_mappings || {},
        });
      });
    } catch (error) {
      console.error("Failed to load form configurations:", error);
    }
  }

  /**
   * Auto-detect field mappings from webhook payload
   */
  async autoDetectFields(webhookPayload: any): Promise<FieldMapping[]> {
    const fields = this.extractFields(webhookPayload);
    const detectedMappings: FieldMapping[] = [];

    for (const field of fields) {
      const fieldName = field.variable || field.name || field.id;

      // Try to match against known patterns
      for (const [dbField, patterns] of Object.entries(this.fieldPatterns)) {
        if (patterns.some((pattern) => pattern.test(fieldName))) {
          detectedMappings.push({
            heyflowField: fieldName,
            databaseField: this.getDatabaseFieldName(dbField),
            required: this.isRequiredField(dbField),
          });
          break;
        }
      }
    }

    // Log unmatched fields for manual review
    const unmatchedFields = fields.filter(
      (f) =>
        !detectedMappings.find(
          (m) => m.heyflowField === (f.variable || f.name),
        ),
    );

    if (unmatchedFields.length > 0) {
      await this.logUnmatchedFields(webhookPayload.form?.id, unmatchedFields);
    }

    return detectedMappings;
  }

  /**
   * Map webhook data to patient data using configuration
   */
  async mapWebhookToPatient(webhookPayload: any): Promise<any> {
    const formId = webhookPayload.form?.id || webhookPayload.flowID;
    let config = this.formConfigs.get(formId);

    // If no configuration exists, try auto-detection
    if (!config) {
      console.log(
        `No configuration found for form ${formId}, attempting auto-detection...`,
      );
      const autoMappings = await this.autoDetectFields(webhookPayload);
      config = await this.createAutoConfiguration(
        formId,
        webhookPayload,
        autoMappings,
      );
    }

    // Extract fields from webhook
    const fields = this.extractFields(webhookPayload);
    const mappedData: any = {};

    // Apply mappings
    for (const [heyflowField, dbField] of Object.entries(
      config.fieldMappings,
    )) {
      const field = fields.find(
        (f) => (f.variable || f.name || f.id) === heyflowField,
      );

      if (field) {
        const value = this.extractFieldValue(field);
        mappedData[dbField] = this.transformValue(dbField, value);
      }
    }

    // Add metadata
    mappedData.heyflow_submission_id =
      webhookPayload.id || webhookPayload.webhookId;
    mappedData.form_type = config.formType;
    mappedData.submitted_at = new Date(webhookPayload.createdAt || Date.now());

    // Calculate derived fields
    if (mappedData.height_feet && mappedData.height_inches) {
      mappedData.height_inches =
        mappedData.height_feet * 12 + mappedData.height_inches;
    }

    if (mappedData.height_inches && mappedData.weight_lbs) {
      mappedData.bmi = this.calculateBMI(
        mappedData.height_inches,
        mappedData.weight_lbs,
      );
    }

    return mappedData;
  }

  /**
   * Extract fields from various webhook payload formats
   */
  private extractFields(payload: any): any[] {
    // HeyFlow format 1: fields array
    if (payload.fields && Array.isArray(payload.fields)) {
      return payload.fields;
    }

    // HeyFlow format 2: submission.fields object
    if (payload.submission?.fields) {
      return Object.entries(payload.submission.fields).map(([key, value]) => ({
        variable: key,
        values: [{ answer: value }],
      }));
    }

    // HeyFlow format 3: direct data object
    if (payload.data) {
      return Object.entries(payload.data).map(([key, value]) => ({
        variable: key,
        values: [{ answer: value }],
      }));
    }

    return [];
  }

  /**
   * Extract value from field object
   */
  private extractFieldValue(field: any): any {
    // Format 1: values array with answer property
    if (field.values && Array.isArray(field.values)) {
      return field.values[0]?.answer;
    }

    // Format 2: direct value property
    if (field.value !== undefined) {
      return field.value;
    }

    // Format 3: answer property
    if (field.answer !== undefined) {
      return field.answer;
    }

    // Format 4: the field itself might be the value
    return field;
  }

  /**
   * Transform values based on database field type
   */
  private transformValue(dbField: string, value: any): any {
    if (value === null || value === undefined) return null;

    // Boolean fields
    if (dbField.includes("consent") || dbField.includes("condition")) {
      return (
        value === true || value === "yes" || value === "true" || value === 1
      );
    }

    // Date fields
    if (dbField.includes("date") || dbField === "date_of_birth") {
      return value ? new Date(value) : null;
    }

    // Number fields
    if (
      dbField.includes("weight") ||
      dbField.includes("height") ||
      dbField.includes("inches")
    ) {
      return parseFloat(value) || 0;
    }

    // Array fields
    if (
      dbField.includes("conditions") ||
      dbField.includes("medications") ||
      dbField.includes("allergies")
    ) {
      if (Array.isArray(value)) return value;
      if (typeof value === "string")
        return value.split(",").map((v) => v.trim());
      return [];
    }

    return value;
  }

  /**
   * Get database field name from pattern key
   */
  private getDatabaseFieldName(key: string): string {
    const mapping: { [key: string]: string } = {
      firstName: "first_name",
      lastName: "last_name",
      email: "email",
      phone: "phone",
      dateOfBirth: "date_of_birth",
      weight: "weight_lbs",
      height: "height_inches",
      gender: "gender",
      consent: "consent_treatment",
    };

    return mapping[key] || key;
  }

  /**
   * Check if field is required
   */
  private isRequiredField(field: string): boolean {
    const requiredFields = ["firstName", "lastName", "email"];
    return requiredFields.includes(field);
  }

  /**
   * Calculate BMI
   */
  private calculateBMI(heightInches: number, weightLbs: number): number {
    if (!heightInches || !weightLbs) return 0;
    return Number(
      ((weightLbs / (heightInches * heightInches)) * 703).toFixed(1),
    );
  }

  /**
   * Create auto-detected configuration
   */
  private async createAutoConfiguration(
    formId: string,
    payload: any,
    mappings: FieldMapping[],
  ): Promise<FormConfiguration> {
    const config: FormConfiguration = {
      id: crypto.randomUUID(),
      formId: formId,
      formName: payload.form?.name || "Unknown Form",
      formType: this.detectFormType(payload),
      fieldMappings: {},
      autoDetected: true,
    };

    // Convert mappings to object format
    mappings.forEach((mapping) => {
      config.fieldMappings[mapping.heyflowField] = mapping.databaseField;
    });

    // Save to database
    await this.saveConfiguration(config);

    // Cache it
    this.formConfigs.set(formId, config);

    return config;
  }

  /**
   * Detect form type from payload
   */
  private detectFormType(payload: any): string {
    const formName = (payload.form?.name || "").toLowerCase();
    const formId = (payload.form?.id || "").toLowerCase();

    if (formName.includes("weight") || formId.includes("weight")) {
      return "weight_loss";
    }
    if (formName.includes("testosterone") || formId.includes("testosterone")) {
      return "testosterone";
    }
    if (formName.includes("diabetes") || formId.includes("diabetes")) {
      return "diabetes";
    }

    return "general";
  }

  /**
   * Save configuration to database
   */
  private async saveConfiguration(config: FormConfiguration): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO form_configurations (
          id, heyflow_form_id, form_name, form_type, 
          field_mappings, auto_detected, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (heyflow_form_id) 
        DO UPDATE SET 
          field_mappings = EXCLUDED.field_mappings,
          updated_at = NOW()
      `,
        [
          config.id,
          config.formId,
          config.formName,
          config.formType,
          JSON.stringify(config.fieldMappings),
          config.autoDetected,
        ],
      );
    } catch (error) {
      console.error("Failed to save form configuration:", error);
    }
  }

  /**
   * Log unmatched fields for manual review
   */
  private async logUnmatchedFields(
    formId: string,
    fields: any[],
  ): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO unmapped_fields (
          form_id, field_names, sample_values, created_at
        ) VALUES ($1, $2, $3, NOW())
      `,
        [
          formId,
          fields.map((f) => f.variable || f.name),
          fields.map((f) => ({
            field: f.variable || f.name,
            sample: this.extractFieldValue(f),
          })),
        ],
      );
    } catch (error) {
      console.error("Failed to log unmapped fields:", error);
    }
  }

  /**
   * Get form configuration
   */
  async getFormConfiguration(
    formId: string,
  ): Promise<FormConfiguration | null> {
    return this.formConfigs.get(formId) || null;
  }

  /**
   * Update field mapping
   */
  async updateFieldMapping(
    formId: string,
    heyflowField: string,
    databaseField: string,
  ): Promise<void> {
    const config = this.formConfigs.get(formId);
    if (!config) {
      throw new Error(`No configuration found for form ${formId}`);
    }

    config.fieldMappings[heyflowField] = databaseField;
    await this.saveConfiguration(config);
  }
}
