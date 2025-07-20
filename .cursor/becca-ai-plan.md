# BECCA AI Assistant - Project Plan

## Background and Motivation

BECCA AI is the flagship feature of the EONMeds platform - an intelligent assistant that will:
- Automatically generate SOAP notes from patient intake forms
- Provide instant answers to staff questions about patients, orders, and platform data
- Help representatives, admins, and doctors streamline their workflow
- Act as a comprehensive knowledge base for the entire platform

The primary goal is to reduce documentation time and improve care quality by automating the creation of professional SOAP notes that doctors can review and approve.

## Key Challenges and Analysis

### 1. **Medical Documentation Accuracy**
- SOAP notes must follow medical standards and be clinically accurate
- Must extract relevant information from unstructured intake form data
- Need to maintain professional medical language and terminology
- Use the exact SOAP format provided by the user

### 2. **HIPAA Compliance & Security**
- All patient data must be handled securely
- API communications must be encrypted
- Audit trail for all AI-generated content
- Secure storage of OpenAI API keys (CRITICAL: Previous key was exposed)

### 3. **Integration Complexity**
- Access data from multiple sources (patients, orders, tracking, etc.)
- Real-time data retrieval for chat functionality
- Seamless integration with existing patient profiles
- Search capabilities across all platform data

### 4. **Approval Workflow**
- Clear distinction between AI-generated and doctor-approved content
- Efficient review process for providers
- Version control for edited SOAP notes
- Status indicators: "Pending Provider Approval" or "Approved by: [Provider Credentials]"

## High-level Task Breakdown

### Phase 1: Infrastructure Setup
- [ ] Install OpenAI package (@openai/sdk)
- [ ] Configure secure API key storage in environment variables
- [ ] Create AI service structure (ai.service.ts)
- [ ] Set up error handling and logging
- [ ] Test OpenAI connection

### Phase 2: Database Schema
- [ ] Create soap_notes table with fields:
  - id, patient_id, content, status, created_by, approved_by
  - created_at, updated_at, approved_at
  - version, original_content
- [ ] Add indexes for performance
- [ ] Create becca_chat_history table
- [ ] Set up audit trail for all AI interactions

### Phase 3: SOAP Note Generation
- [ ] Create POST /api/v1/ai/generate-soap endpoint
- [ ] Implement intake form data extraction
- [ ] Create prompt template using provided SOAP format
- [ ] Format with proper medical terminology and ICD-10 codes
- [ ] Add to patient profile with "Pending" status

### Phase 4: Chat Interface
- [ ] Build BECCA chat component in React
- [ ] Create WebSocket connection for real-time chat
- [ ] Implement context-aware responses
- [ ] Add search functionality for:
  - Patient phone numbers
  - Dates of birth
  - Starting weights
  - Tracking numbers
  - Any platform data

### Phase 5: Approval System
- [ ] Build provider approval interface
- [ ] Add approve/reject buttons for doctors
- [ ] Implement notification system
- [ ] Track approval history
- [ ] Allow editing before approval

### Phase 6: Access Control
- [ ] Restrict BECCA access (no clients at beginning)
- [ ] Representatives: View and chat
- [ ] Admins: Full access
- [ ] Doctors: Approval rights

## Technical Specifications

### SOAP Note Format Template
```
SOAP NOTE – GLP-1 Weight Loss Program

Patient Name: [Full Name]
DOB: [MM/DD/YYYY]
Date of Intake Submission: [MM/DD/YYYY]
Encounter Type: Telehealth
Provider: [To be filled by approving provider]
Location: [City, State]
Email: [Email]
Phone: [Phone]

⸻

Subjective
Chief Complaint:
[Extract from intake form goals and motivations]

Motivation:
[Commitment scale rating and interpretation]

History of Present Illness:
• [Previous medications]
• [Medical history]
• [Side effects]
• [Allergies]

Pregnancy/Breastfeeding Status:
[Status]

⸻

Objective
• Height: [X'Y"]
• Weight: [X lbs]
• BMI: [Calculated]
• Target Weight: [X lbs]
• Blood Pressure: [If available]
• Allergies: [List or None reported]

⸻

Assessment
Diagnoses:
1. Obesity, Class [I/II/III] (ICD-10: E66.0X) – [BMI interpretation]
2. [Additional relevant diagnoses]

Medical Necessity for GLP-1 Therapy:
[Justification based on BMI and medical history]

⸻

Medical Necessity for Compounded Semaglutide with B12
[Professional opinion on treatment appropriateness]

⸻

Plan
1. Initiate Treatment:
   • Start Semaglutide with B12 (compounded) at 0.25 mg weekly subcutaneously
   • Titrate upward based on tolerance and clinical response

2. Monitor:
   • Weekly follow-ups with weight loss coach
   • Monitor for side effects
   • Review treatment response every 4-6 weeks

3. Supportive Measures:
   • Nutritional and lifestyle counseling
   • Encourage increased physical activity

4. Documentation:
   • Patient consent status
   • Contraindications check
```

### OpenAI Integration Details
- Model: GPT-4 (for medical accuracy)
- Temperature: 0.3 (for consistency)
- Max tokens: 2000 per SOAP note
- System prompt: Medical professional generating clinical documentation

### Search Capabilities
BECCA should be able to answer:
- "What is this customer's phone number?"
- "What is this client's date of birth?"
- "What is this client's starting weight?"
- "What's the tracking number for order X?"
- Any searchable data in the platform

## Current Status / Progress Tracking

### Completed Tasks
- ✅ Project planning and requirements gathering
- ✅ SOAP note format template defined
- ✅ Access control requirements clarified

### In Progress
- 🔄 Waiting for new OpenAI API key (previous exposed)

### Pending
- ⏳ All implementation tasks

## Executor's Feedback or Assistance Requests

### Immediate Action Required
1. **CRITICAL**: The OpenAI API key was exposed in the chat. User must:
   - Go to OpenAI dashboard immediately
   - Revoke the exposed key
   - Generate a new API key
   - Store it securely in .env file

2. Ready to begin implementation once new API key is provided

### Implementation Plan
1. Set up OpenAI integration with new key
2. Create database schema for SOAP notes
3. Build generation endpoint
4. Test with sample patient data
5. Create chat interface
6. Implement approval workflow

## Lessons

### Security Best Practices
- **NEVER** share API keys in messages or code
- Always use environment variables (.env file)
- Add .env to .gitignore
- Use key rotation policies
- Implement rate limiting

### Medical Documentation Standards
- SOAP notes must follow exact format
- ICD-10 codes must be current and accurate
- Provider approval is legally required
- Maintain audit trail for compliance

### AI Prompt Engineering
- Use structured prompts for consistency
- Include examples in system prompts
- Validate output format
- Handle edge cases gracefully

### Platform Integration
- Leverage existing patient data structure
- Reuse authentication middleware
- Follow established API patterns
- Maintain consistent error handling

## Project Status Board

### TODO
- [ ] Get new OpenAI API key from user
- [ ] Install OpenAI SDK
- [ ] Create database schema
- [ ] Build AI service
- [ ] Create SOAP generation endpoint
- [ ] Build chat interface
- [ ] Implement approval workflow
- [ ] Add search capabilities
- [ ] Test with real data
- [ ] Deploy to production

### IN PROGRESS
- [ ] Waiting for secure API key

### COMPLETED
- [x] Project planning
- [x] Requirements gathering
- [x] SOAP format template
- [x] Technical architecture

## Next Steps for User

1. **Immediately revoke exposed OpenAI API key**
2. Generate new API key from OpenAI dashboard
3. Provide new key (securely, via environment variable)
4. Confirm ready to proceed with implementation

Once these steps are complete, we can begin building BECCA AI! 