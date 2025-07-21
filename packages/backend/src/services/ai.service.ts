import OpenAI from 'openai';
import { pool } from '../config/database';

export class AIService {
  private static openai: OpenAI | null = null;

  /**
   * Initialize OpenAI client
   */
  private static getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
      }

      this.openai = new OpenAI({
        apiKey: apiKey
      });
    }
    
    return this.openai;
  }

  /**
   * Generate SOAP note from patient intake data
   */
  static async generateSOAPNote(patientId: string): Promise<{
    success: boolean;
    soapNote?: string;
    error?: string;
    usage?: any;
  }> {
    const startTime = Date.now();
    
    try {
      // Get patient data
      const patientData = await this.getPatientData(patientId);
      
      if (!patientData) {
        return {
          success: false,
          error: 'Patient not found'
        };
      }

      // Create the prompt
      const prompt = this.createSOAPPrompt(patientData);
      
      // Call OpenAI
      const client = this.getClient();
      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a medical professional creating SOAP notes for a weight loss clinic. Generate accurate, professional medical documentation based on patient intake forms.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const soapNote = completion.choices[0]?.message?.content;
      const responseTime = Date.now() - startTime;

      // Save to database
      if (soapNote) {
        await this.saveSOAPNote(patientId, soapNote, {
          model: 'gpt-4',
          responseTime,
          usage: completion.usage
        });
      }

      return {
        success: true,
        soapNote,
        usage: completion.usage
      };

    } catch (error) {
      console.error('Error generating SOAP note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get patient data for SOAP note generation
   */
  private static async getPatientData(patientId: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      // Get patient and webhook data
      const query = `
        SELECT 
          p.*,
          we.payload as webhook_data
        FROM patients p
        LEFT JOIN webhook_events we ON (
          p.heyflow_submission_id = we.webhook_id 
          OR p.heyflow_submission_id = we.payload->>'id'
        )
        WHERE p.patient_id = $1
        LIMIT 1
      `;
      
      const result = await client.query(query, [patientId]);
      return result.rows[0];
      
    } finally {
      client.release();
    }
  }

  /**
   * Create SOAP note prompt
   */
  private static createSOAPPrompt(patientData: any): string {
    const webhookData = patientData.webhook_data || {};
    const fields = webhookData.fields || {};
    
    // Format height
    const feet = fields.feet || fields.FEET || 0;
    const inches = fields.inches || fields.INCHES || 0;
    const heightDisplay = feet && inches ? `${feet}'${inches}"` : 'Not provided';
    
    // Get weight data
    const currentWeight = fields['starting weight'] || fields['STARTING WEIGHT'] || 
                         fields.starting_weight || fields.weight || patientData.weight_lbs || 'Not provided';
    const targetWeight = fields.idealweight || fields.IDEALWEIGHT || 
                        fields['ideal weight'] || fields['IDEAL WEIGHT'] || 
                        patientData.target_weight_lbs || 'Not provided';
    const bmi = fields.BMI || fields.bmi || patientData.bmi || 'Not calculated';
    
    // Get medical history
    const glp1History = fields['Are you currently taking, or have you ever taken, a GLP-1 medication?'] || 
                       fields['GLP-1 medication history'] || 'Not provided';
    const sideEffects = fields['Do you usually present side effects when starting a new medication?'] || 
                       fields['medication side effects'] || 'Not provided';
    const allergies = fields['medication allergies'] || fields.allergies || 'None reported';
    const pregnantStatus = fields['Are you pregnant or breast feeding?'] || 
                          fields.pregnant_breastfeeding || 'Not pregnant or breastfeeding';
    
    // Get goals and motivation
    const commitment = fields['HOW COMMITTED ARE YOU TO STARTING TREATMENT? (SCALE 1-5)'] || 
                      fields['commitment level'] || fields.commitment_level || 'Not provided';
    const lifeChange = fields['HOW WOULD YOUR LIFE CHANGE BY LOSING WEIGHT?'] || 
                      fields['Life Change'] || 'Not provided';
    
    // Get location info
    const city = patientData.city || fields.city || 'Not provided';
    const state = patientData.state || fields.state || 'Not provided';

    const prompt = `Generate a professional SOAP note for a weight loss clinic using the following patient data and format exactly:

PATIENT INFORMATION:
- Name: ${patientData.first_name} ${patientData.last_name}
- DOB: ${patientData.date_of_birth}
- Email: ${patientData.email}
- Phone: ${patientData.phone}
- Location: ${city}, ${state}
- Date of Intake: ${new Date().toLocaleDateString()}

PATIENT RESPONSES:
- Current Weight: ${currentWeight} lbs
- Target Weight: ${targetWeight} lbs
- Height: ${heightDisplay}
- BMI: ${bmi}
- Commitment Level: ${commitment}
- Life Change Goals: ${lifeChange}
- Previous GLP-1 Use: ${glp1History}
- Side Effects History: ${sideEffects}
- Allergies: ${allergies}
- Pregnant/Breastfeeding: ${pregnantStatus}

Please generate a SOAP note following this EXACT format:

SOAP NOTE – GLP-1 Weight Loss Program

Patient Name: [Full Name]
DOB: [Date]
Date of Intake Submission: [Today's Date]
Encounter Type: Telehealth
Provider: [Insert Provider Name]
Location: [City, State]
Email: [Email]
Phone: [Phone]

⸻

Subjective

Chief Complaint:
[Based on patient's weight loss goals and life change motivations]

Motivation:
[Include commitment rating and interpretation]

History of Present Illness:
• [GLP-1 medication history]
• [Medical contraindications assessment]
• [Side effects history]
• [Allergies]

Pregnancy/Breastfeeding Status:
[Status]

⸻

Objective
• Height: [Height]
• Weight: [Current Weight]
• BMI: [Calculate and classify]
• Target Weight: [Target Weight]
• Blood Pressure: Not available
• Allergies: [List or None reported]

⸻

Assessment

Diagnoses:
1. Obesity, Class [I/II/III] (ICD-10: E66.0X) – [BMI interpretation and health risks]
2. [Any additional relevant diagnoses based on history]

Medical Necessity for GLP-1 Therapy:
[Justify based on BMI criteria and absence of contraindications]

⸻

Medical Necessity for Compounded Semaglutide with B12
[Professional opinion on why compounded formulation is appropriate]

⸻

Plan
1. Initiate Treatment:
   • Start Semaglutide with B12 (compounded) at 0.25 mg weekly subcutaneously
   • Titrate upward based on tolerance and clinical response

2. Monitor:
   • Weekly follow-ups with weight loss coach
   • Monitor for side effects
   • Review treatment response every 4-6 weeks with provider

3. Supportive Measures:
   • Provide nutritional and lifestyle counseling
   • Encourage increased physical activity

4. Documentation:
   • Patient has electronically accepted all required consent forms
   • No contraindications noted

⸻

Provider`;

    return prompt;
  }

  /**
   * Save SOAP note to database
   */
  private static async saveSOAPNote(
    patientId: string, 
    content: string,
    metadata: any
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(`
        INSERT INTO soap_notes (
          patient_id,
          content,
          original_content,
          ai_model,
          ai_response_time_ms,
          prompt_tokens,
          completion_tokens,
          total_tokens
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        patientId,
        content,
        content,
        metadata.model,
        metadata.responseTime,
        metadata.usage?.prompt_tokens,
        metadata.usage?.completion_tokens,
        metadata.usage?.total_tokens
      ]);
    } finally {
      client.release();
    }
  }
} 