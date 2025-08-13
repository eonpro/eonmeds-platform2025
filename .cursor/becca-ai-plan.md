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
- ✅ OpenAI SDK installed
- ✅ Database schema created (soap_notes, becca_chat_history, ai_audit_log)
- ✅ AI service base implementation
- ✅ SOAP note generation endpoint created
- ✅ AI routes registered
- ✅ SOAP prompt template implemented

### In Progress

- 🔄 Testing SOAP note generation (needs API key)
- 🔄 Implementing middleware for auth

### Pending

- ⏳ Chat interface development
- ⏳ Approval workflow UI
- ⏳ Search capabilities
- ⏳ Frontend components

## Executor's Feedback or Assistance Requests

### Current Status

Successfully implemented:

1. Database tables for BECCA AI
2. Base AI service with OpenAI integration
3. SOAP note generation API endpoint
4. Full SOAP note prompt template

### Blockers

1. Need OpenAI API key to test SOAP generation
2. Need to fix auth middleware import issue

### Next Steps

1. Fix auth middleware imports
2. Test SOAP generation with API key
3. Begin frontend BECCA UI components
