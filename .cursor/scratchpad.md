# EONMeds Platform - Project Scratchpad

## Background and Motivation

The user is building EONMeds, a HIPAA- and SOC 2-compliant telehealth platform specifically designed for the Hispanic community. The platform focuses on weight loss treatments and other medical services, requiring comprehensive features for patient management, prescription tracking, and multi-channel communication.

**Core Business Requirements:**
1. Handle patient intake through HeyFlow.com forms (8 different treatment types)
2. Process and track prescriptions with pharmacy email integration
3. Generate Spanish-language documentation automatically
4. Support subscription-based revenue model with Stripe
5. Enable real-time shipment tracking with patient notifications
6. Maintain HIPAA compliance throughout all systems
7. **NEW**: Visual hashtag system for patient profiles (#activemember, #qualified, #paused, #cancelled)
8. **NEW**: One-click membership management buttons (pause, cancel, reactivate)
9. **NEW**: Comprehensive documentation and SOPs for all features and training

**Becca AI - Intelligent Assistant Platform:**
The user requires a sophisticated AI-powered assistant called "Becca AI" that functions like Siri/Alexa for the medical platform. This assistant must:
- Provide conversational interface for employees to query patient data, tracking info, SOAP notes, and payments
- Analyze intake forms and generate SOAP notes with doctor approval workflows
- Create custom financial and demographic reports
- Support voice interactions with wake word detection
- Implement strict role-based access control with 5 user levels:
  - Superadmin: Full system access
  - Management/Admin: Financial and operational access
  - Doctor/Provider: Patient care focused access
  - Sales Rep: Revenue and conversion metrics
  - Patient Portal: Self-service limited access

**Hashtag & Membership Management Requirements:**
- Visual hashtags to instantly identify patient subscription status
- Color-coded badges with icons for each status type
- Quick action buttons for subscription management per profile
- Automated hashtag updates based on payment events
- Search and filter capabilities by hashtag combinations
- Complete audit trail of all membership status changes

**Documentation & Training Requirements:**
- Comprehensive software documentation for all features
- Standard Operating Procedures (SOPs) for daily operations
- Developer documentation for API endpoints and integrations
- User training materials with screenshots and videos
- Role-specific training guides for each portal
- Troubleshooting guides for common issues
- Compliance documentation for HIPAA procedures

## Key Challenges and Analysis

### 1. HIPAA Compliance Throughout
- All data must be encrypted at rest and in transit
- PHI access must be logged and auditable
- Role-based access must be strictly enforced
- Data retention policies must comply with 7-year requirements

### 2. Multi-language Support
- Spanish as primary language for patient-facing content
- Bilingual support in AI responses
- PDF generation with proper Spanish formatting
- Voice interface supporting both English and Spanish

### 3. Real-time Data Processing
- Webhook processing must acknowledge within 200ms
- Email parsing must handle multiple pharmacy formats
- Push notifications must reach all patient devices
- AI responses must be generated within acceptable latency

### 4. Scalability Requirements
- Handle 1000+ form submissions per hour
- Support concurrent AI queries from multiple users
- Process analytics on large datasets efficiently
- Maintain performance with growing patient base

### 5. Integration Complexity
- HeyFlow webhook security and idempotency
- Multiple pharmacy email formats
- Stripe subscription management
- AWS Bedrock for AI generation
- Twilio/Firebase for notifications

### 6. Becca AI Specific Challenges
- **Natural Language Understanding**: Must accurately interpret medical queries while maintaining HIPAA compliance
- **Context Management**: Track conversation history while respecting role-based data access limits
- **Voice Privacy**: Wake word detection must run on-device to prevent constant audio streaming
- **Approval Workflows**: AI-generated SOAP notes require provider review before becoming official
- **Performance at Scale**: Vector search and AI inference must remain fast with millions of documents

### 7. Hashtag System & Membership Management Challenges
- **Real-time Status Updates**: Hashtags must reflect current subscription status instantly
- **Stripe Synchronization**: Keep local membership status in sync with Stripe subscriptions
- **Bulk Operations**: Handle pause/cancel/reactivate for multiple patients efficiently
- **Visual Consistency**: Maintain clear color coding and icons across all interfaces
- **Permission Control**: Ensure only authorized users can modify subscriptions
- **Automation Rules**: Define clear triggers for automatic hashtag application

### 8. Documentation & Training Challenges
- **Living Documentation**: Keep docs updated as features evolve
- **Multi-audience Writing**: Create content for technical and non-technical users
- **Version Control**: Track documentation changes alongside code changes
- **Multimedia Content**: Include screenshots, videos, and interactive guides
- **Language Considerations**: Provide documentation in English and Spanish
- **Searchability**: Make documentation easily searchable and well-indexed
- **Compliance Requirements**: Document all HIPAA-related procedures thoroughly

## High-level Task Breakdown

### Phase 1: Core Infrastructure & RBAC System
1. Set up project structure with TypeScript, Node.js, and PostgreSQL
2. Implement comprehensive RBAC system with 5 user roles
3. Create role permissions and user-patient assignment tables
4. Build authentication and authorization middleware
5. Set up audit logging for all data access
6. **Document**: Create developer setup guide and RBAC architecture docs

### Phase 2: Hashtag System & Membership Management
1. Create database tables for hashtags and membership history
2. Build membership management service with Stripe integration
3. Implement UI components for hashtag display and actions
4. Create automated hashtag update system
5. Build search and filtering by hashtags
6. Add permission controls for membership actions
7. **Document**: Write SOPs for membership management and hashtag system guide

### Phase 3: Becca AI Core Development
1. Integrate AWS Bedrock for Claude AI model access
2. Implement vector database (Pinecone) for knowledge management
3. Build AI context manager with role-based filtering
4. Create intent classification system for query routing
5. Develop compliance checker for PHI protection
6. **Document**: Create AI integration guide and Becca query examples

### Phase 4: Conversational Interfaces
1. Build React-based chat interface component
2. Implement real-time message streaming
3. Add suggested queries based on user role
4. Create conversation history management
5. Add multi-language support (English/Spanish)
6. **Document**: Write user guides for Becca AI chat interface

### Phase 5: Voice Interface Integration
1. Implement Web Speech API for browser-based voice
2. Build voice interface for React Native mobile app
3. Add wake word detection capability
4. Integrate text-to-speech with Becca's voice
5. Support bilingual voice interactions
6. **Document**: Create voice command reference and troubleshooting guide

### Phase 6: SOAP Note Generation System
1. Create AI prompt templates for different treatment types
2. Build SOAP note generation from intake forms
3. Implement provider review queue interface
4. Add approval/edit workflow for providers
5. Create audit trail for all SOAP note changes
6. **Document**: Write SOPs for SOAP note review process

### Phase 7: Analytics and Reporting Engine
1. Build demographic analysis queries
2. Create financial reporting system
3. Implement chart generation service
4. Add PDF report generation
5. Build custom report builder interface
6. **Document**: Create report interpretation guide and analytics training

### Phase 8: Portal Development
1. Create role-specific portal layouts
2. Build provider dashboard with patient widgets
3. Implement admin dashboard with metrics
4. Create sales portal with conversion analytics
5. Develop patient self-service portal
6. **Document**: Write role-specific user manuals for each portal

### Phase 9: Knowledge Base Management
1. Index all patient data for vector search
2. Create automated knowledge base updates
3. Implement relevance ranking algorithms
4. Add data freshness indicators
5. Build knowledge base admin interface
6. **Document**: Create knowledge base maintenance procedures

### Phase 10: Security & Compliance
1. Implement PHI pattern detection
2. Add query compliance checking
3. Create comprehensive audit logging
4. Build security monitoring dashboard
5. Add rate limiting and abuse prevention
6. **Document**: Write HIPAA compliance manual and security SOPs

### Phase 11: Testing & Deployment
1. Write comprehensive test suites
2. Perform HIPAA compliance audit
3. Load test AI query handling
4. Deploy to production environment
5. Monitor and optimize performance
6. **Document**: Create deployment guide and monitoring procedures

## Executor's Feedback or Assistance Requests

*No feedback yet - planning phase*

## Project Status Board

### Phase 1: Core Infrastructure & RBAC System
- [ ] Set up project structure with TypeScript, Node.js, and PostgreSQL
- [ ] Implement comprehensive RBAC system with 5 user roles
- [ ] Create role permissions and user-patient assignment tables
- [ ] Build authentication and authorization middleware
- [ ] Set up audit logging for all data access
- [ ] Create developer setup guide and RBAC architecture docs

### Phase 2: Hashtag System & Membership Management
- [ ] Create database tables for hashtags and membership history
- [ ] Build membership management service with Stripe integration
- [ ] Implement UI components for hashtag display and actions
- [ ] Create automated hashtag update system
- [ ] Build search and filtering by hashtags
- [ ] Add permission controls for membership actions
- [ ] Write SOPs for membership management and hashtag system guide

### Phase 3: Becca AI Core Development
- [ ] Integrate AWS Bedrock for Claude AI model access
- [ ] Implement vector database (Pinecone) for knowledge management
- [ ] Build AI context manager with role-based filtering
- [ ] Create intent classification system for query routing
- [ ] Develop compliance checker for PHI protection
- [ ] Create AI integration guide and Becca query examples

### Phase 4: Conversational Interfaces
- [ ] Build React-based chat interface component
- [ ] Implement real-time message streaming
- [ ] Add suggested queries based on user role
- [ ] Create conversation history management
- [ ] Add multi-language support (English/Spanish)
- [ ] Write user guides for Becca AI chat interface

### Phase 5: Voice Interface Integration
- [ ] Implement Web Speech API for browser-based voice
- [ ] Build voice interface for React Native mobile app
- [ ] Add wake word detection capability
- [ ] Integrate text-to-speech with Becca's voice
- [ ] Support bilingual voice interactions
- [ ] Create voice command reference and troubleshooting guide

### Phase 6: SOAP Note Generation System
- [ ] Create AI prompt templates for different treatment types
- [ ] Build SOAP note generation from intake forms
- [ ] Implement provider review queue interface
- [ ] Add approval/edit workflow for providers
- [ ] Create audit trail for all SOAP note changes
- [ ] Write SOPs for SOAP note review process

### Phase 7: Analytics and Reporting Engine
- [ ] Build demographic analysis queries
- [ ] Create financial reporting system
- [ ] Implement chart generation service
- [ ] Add PDF report generation
- [ ] Build custom report builder interface
- [ ] Create report interpretation guide and analytics training

### Phase 8: Portal Development
- [ ] Create role-specific portal layouts
- [ ] Build provider dashboard with patient widgets
- [ ] Implement admin dashboard with metrics
- [ ] Create sales portal with conversion analytics
- [ ] Develop patient self-service portal
- [ ] Write role-specific user manuals for each portal

### Phase 9: Knowledge Base Management
- [ ] Index all patient data for vector search
- [ ] Create automated knowledge base updates
- [ ] Implement relevance ranking algorithms
- [ ] Add data freshness indicators
- [ ] Build knowledge base admin interface
- [ ] Create knowledge base maintenance procedures

### Phase 10: Security & Compliance
- [ ] Implement PHI pattern detection
- [ ] Add query compliance checking
- [ ] Create comprehensive audit logging
- [ ] Build security monitoring dashboard
- [ ] Add rate limiting and abuse prevention
- [ ] Write HIPAA compliance manual and security SOPs

### Phase 11: Testing & Deployment
- [ ] Write comprehensive test suites
- [ ] Perform HIPAA compliance audit
- [ ] Load test AI query handling
- [ ] Deploy to production environment
- [ ] Monitor and optimize performance
- [ ] Create deployment guide and monitoring procedures

## Lessons

### General Best Practices
- Always wait for explicit module commands in Planner mode before proceeding
- Document all security considerations for HIPAA/SOC 2 compliance
- Consider scalability and performance from the beginning
- Plan for comprehensive testing at each phase

### Technology Stack Decisions
- **TypeScript over JavaScript**: Use TypeScript for better type safety and developer experience
- **PostgreSQL**: Chosen for ACID compliance, complex queries, and HIPAA audit requirements
- **JWT with refresh tokens**: Balance between security and user experience
- **AWS Bedrock over OpenAI**: Better HIPAA compliance and enterprise features
- **Stripe**: Most robust solution for healthcare subscription billing
- **React ecosystem**: Unified development experience across admin and patient apps

### HeyFlow Integration Lessons
- **Webhook over API polling**: Real-time data transfer is critical for patient experience
- **Always acknowledge webhooks immediately**: Return 200 OK before processing to avoid timeouts
- **Store raw webhook data**: Keep original payloads for debugging and compliance
- **Implement idempotency**: HeyFlow may retry webhooks - handle duplicates gracefully
- **Use message queue**: Async processing prevents webhook endpoint bottlenecks
- **Multi-language support**: Forms are in Spanish - ensure proper character encoding

### Database Design Lessons
- **UUID Primary Keys**: Better for distributed systems and prevent ID enumeration attacks
- **JSONB for Flexibility**: Store raw webhook payloads and variable medical data
- **Separate Reference Tables**: Medications table allows for standardized drug information
- **Audit Everything**: Dedicated audit_logs table for HIPAA compliance
- **Index Strategy**: Index foreign keys and commonly queried fields
- **Partitioning**: Plan for partitioning large tables (audit_logs) from the start

### Webhook Implementation Lessons
- **Signature Verification**: Always verify webhook signatures before processing
- **Timestamp Validation**: Prevent replay attacks with 5-minute timestamp window
- **Transaction Safety**: Use database transactions for multi-table operations
- **Parallel Processing**: Queue post-processing tasks (SMS, email, SOAP notes) in parallel
- **Error Recovery**: Store webhook events for manual reprocessing if needed
- **Monitoring**: Track webhook success rate, processing time, and queue depth

### PDF Generation Lessons
- **Language Localization**: Use date-fns with locale for proper Spanish formatting
- **HIPAA Compliance**: Add watermarks and encryption to all medical PDFs
- **S3 Storage**: Use server-side encryption and metadata for document tracking
- **Async Generation**: Generate PDFs in background to avoid blocking webhook response
- **Error Handling**: Store generation failures for manual retry

### Tracking Pixel Lessons
- **Privacy First**: Hash all PII (email, phone, names) before sending to tracking platforms
- **Event Mapping**: Map HeyFlow events to standard conversion events (Lead, CompleteRegistration)
- **Multiple Platforms**: Support both Meta and Google tracking for maximum reach
- **HIPAA Compliance**: Never send actual medical data to tracking platforms
- **Testing**: Use browser developer tools to verify pixel firing

### Dynamic Form Update Lessons
- **Separate Endpoints**: Use different endpoints for initial submission vs updates
- **Field Tracking**: Store all field changes for compliance and debugging
- **Conditional Logic State**: Preserve form logic state for understanding why fields changed
- **Critical Field Updates**: Propagate email/phone changes to patient record immediately
- **Version Control**: Track form versions and update counts

### Pharmacy Email Tracking Lessons
- **Multiple Identification Methods**: Use name, order number, and prescription matching
- **Regex Flexibility**: Make parsing patterns configurable per pharmacy
- **Raw Email Storage**: Always store original email for debugging
- **Async Processing**: Use queue to avoid blocking email monitoring
- **Carrier Detection**: Use multiple patterns to identify UPS/FedEx/USPS
- **Error Recovery**: Design for partial matches and manual intervention

### Multiple Form Type Lessons
- **Form Type Reference Table**: Centralize form configuration and settings
- **Lab Requirements**: Track which forms need lab review
- **PDF Templates**: Use different templates per treatment type
- **Question Versioning**: Plan for form questions to change over time
- **Office vs Patient Forms**: Separate permissions and workflows
- **Form Discovery**: Make it easy to find the right form for each treatment

### Push Notification Lessons
- **Device Management**: Track FCM tokens and handle token refresh
- **Platform Differences**: Customize payload for iOS vs Android
- **Silent Failures**: Log when no devices are available
- **Batch Sending**: Send to all patient devices simultaneously
- **Deep Linking**: Include data for app navigation
- **Localization**: Send notifications in patient's preferred language

### User-Specified Lessons
- Include info useful for debugging in the program output
- Read the file before trying to edit it
- If there are vulnerabilities that appear in the terminal, run npm audit before proceeding
- Always ask before using the -force git command 

### Hashtag System Lessons
- **Use PostgreSQL Arrays**: Store hashtags as TEXT[] for efficient querying with hasAny/hasEvery
- **Color Accessibility**: Ensure hashtag colors have sufficient contrast for readability
- **Status Precedence**: Define clear rules for which hashtag takes priority when multiple apply
- **Bulk Operations**: Use database transactions when updating multiple patients' statuses
- **Webhook Reliability**: Always update hashtags via webhook events, not just UI actions
- **Cache Hashtag Configs**: Store hashtag configurations in memory to avoid repeated DB lookups
- **Search Performance**: Create GIN indexes on array columns for fast hashtag searches
- **Visual Consistency**: Use a design system to maintain consistent hashtag appearance
- **Permission Checking**: Verify user permissions before showing membership action buttons
- **Audit Everything**: Log all membership changes with user, timestamp, and reason

### Documentation Lessons
- **Living Documentation**: Use tools like Swagger/OpenAPI for auto-generated API docs
- **SOP Versioning**: Always version SOPs and maintain change logs
- **Screenshot Automation**: Use tools like Puppeteer to auto-update UI screenshots
- **Bilingual Content**: Create Spanish translations alongside English documentation
- **Video Hosting**: Use CDN for training videos to ensure fast global access
- **Search Integration**: Implement Algolia or ElasticSearch for documentation search
- **Feedback Loop**: Add "Was this helpful?" buttons on all documentation pages
- **Role-Based Access**: Show only relevant documentation based on user role
- **Offline Access**: Generate PDF versions of critical SOPs for offline use
- **Training Tracking**: Log all training completion for compliance reporting

#### 7. Voice Interface for Becca AI

```typescript
// Voice-enabled AI Assistant
export class BeccaVoiceInterface {
  private speechRecognition: any;
  private speechSynthesis: SpeechSynthesisUtterance;
  private isListening: boolean = false;
  
  constructor() {
    // Initialize Web Speech API
    this.speechRecognition = new (window as any).webkitSpeechRecognition();
    this.speechRecognition.continuous = false;
    this.speechRecognition.interimResults = false;
    this.speechRecognition.lang = 'en-US'; // Support Spanish too
    
    this.speechSynthesis = new SpeechSynthesisUtterance();
    this.speechSynthesis.rate = 1.0;
    this.speechSynthesis.pitch = 1.0;
  }
  
  async startListening() {
    this.isListening = true;
    
    return new Promise((resolve, reject) => {
      this.speechRecognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };
      
      this.speechRecognition.onerror = (event: any) => {
        reject(event.error);
      };
      
      this.speechRecognition.start();
    });
  }
  
  async speak(text: string, language: string = 'en-US') {
    this.speechSynthesis.text = text;
    this.speechSynthesis.lang = language;
    
    return new Promise((resolve) => {
      this.speechSynthesis.onend = resolve;
      window.speechSynthesis.speak(this.speechSynthesis);
    });
  }
  
  // Wake word detection ("Hey Becca")
  async enableWakeWord() {
    // Implement always-listening mode with wake word detection
    // This would run on device for privacy
  }
}

// Mobile app voice component
export const BeccaVoiceButton: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const voice = useRef(new BeccaVoiceInterface());
  
  const handleVoiceInput = async () => {
    try {
      setIsListening(true);
      const query = await voice.current.startListening();
      setTranscript(query);
      
      // Send to Becca AI
      const response = await api.post('/ai/voice', { query });
      
      // Speak response
      await voice.current.speak(response.data.response);
      
    } catch (error) {
      console.error('Voice input error:', error);
    } finally {
      setIsListening(false);
    }
  };
  
  return (
    <TouchableOpacity 
      style={[styles.voiceButton, isListening && styles.listening]}
      onPress={handleVoiceInput}
    >
      <Animated.View style={[styles.pulseRing, isListening && styles.pulsing]} />
      <Icon name={isListening ? 'mic' : 'mic-outline'} size={30} color="#fff" />
    </TouchableOpacity>
  );
};
```

#### 8. Enhanced Environment Configuration

```env
# Existing configurations...

# Becca AI Configuration
BEDROCK_REGION=us-east-1
BEDROCK_ACCESS_KEY_ID=your-bedrock-access-key
BEDROCK_SECRET_ACCESS_KEY=your-bedrock-secret-key
BEDROCK_MODEL_ID=anthropic.claude-3-opus-20240229

# Vector Database (Pinecone)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east1-gcp
PINECONE_INDEX_NAME=eonmeds-knowledge

# AI Settings
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=2000
AI_COMPLIANCE_MODE=strict
AI_CONTEXT_WINDOW=10

# Voice Interface
SPEECH_TO_TEXT_API=google # or azure, aws
GOOGLE_SPEECH_API_KEY=your-google-speech-key
TEXT_TO_SPEECH_VOICE=en-US-Neural2-F # Becca's voice

# Analytics Engine
ANALYTICS_RETENTION_DAYS=2555 # 7 years for HIPAA
REPORT_STORAGE_BUCKET=eonmeds-reports
CHART_GENERATION_SERVICE=quickchart # or chartjs

# Role-Based Limits
MAX_AI_QUERIES_PER_DAY_PROVIDER=500
MAX_AI_QUERIES_PER_DAY_ADMIN=1000
MAX_AI_QUERIES_PER_DAY_SALES=200
MAX_REPORT_GENERATION_PER_MONTH=50
```

#### 9. Becca AI Knowledge Base Management

```typescript
// Knowledge base updater for Becca AI
export class BeccaKnowledgeManager {
  private pinecone: PineconeClient;
  private embedder: BedrockEmbedder;
  
  async updateKnowledgeBase() {
    // Index all relevant data for vector search
    const dataSources = [
      this.indexPatientData(),
      this.indexSOAPNotes(),
      this.indexMedications(),
      this.indexPolicies(),
      this.indexFAQs()
    ];
    
    await Promise.all(dataSources);
  }
  
  private async indexPatientData() {
    const patients = await db.patients.findMany({
      include: {
        medical_history: true,
        medications: true,
        soap_notes: { take: 5 }
      }
    });
    
    for (const patient of patients) {
      const text = this.formatPatientForEmbedding(patient);
      const embedding = await this.embedder.embed(text);
      
      await this.pinecone.upsert({
        id: `patient_${patient.id}`,
        values: embedding,
        metadata: {
          type: 'patient',
          patientId: patient.id,
          name: `${patient.first_name} ${patient.last_name}`,
          lastUpdated: new Date()
        }
      });
    }
  }
  
  private formatPatientForEmbedding(patient: any): string {
    return `
      Patient: ${patient.first_name} ${patient.last_name}
      Age: ${this.calculateAge(patient.date_of_birth)}
      Medications: ${patient.medications.map(m => m.name).join(', ')}
      Conditions: ${patient.medical_history?.medical_conditions || 'None documented'}
      Recent Notes: ${patient.soap_notes.map(n => n.assessment).join(' ')}
    `;
  }
}
```

#### 10. Multi-Portal Access Implementation

```typescript
// Portal routing based on user role
export const PortalRouter: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  
  if (!user) return <LoginScreen />;
  
  // Route to appropriate portal based on role
  switch (user.role?.code) {
    case 'superadmin':
      return <SuperAdminPortal />;
    case 'admin':
      return <AdminPortal />;
    case 'provider':
      return <ProviderPortal />;
    case 'sales_rep':
      return <SalesPortal />;
    case 'patient':
      return <PatientPortal />;
    default:
      return <UnauthorizedScreen />;
  }
};

// Provider Portal with Becca AI
export const ProviderPortal: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="provider-dashboard">
        <div className="dashboard-header">
          <h1>Provider Dashboard</h1>
          <BeccaAIWidget />
        </div>
        
        <div className="dashboard-grid">
          <PatientListWidget />
          <PendingSOAPNotesWidget />
          <TodaysAppointmentsWidget />
          <RecentLabResultsWidget />
        </div>
        
        <BeccaAIChatInterface />
      </div>
    </DashboardLayout>
  );
};

// Admin Portal with Analytics
export const AdminPortal: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Administration Dashboard</h1>
          <QuickActionsMenu />
        </div>
        
        <div className="metrics-row">
          <MetricCard title="Total Patients" value={metrics.totalPatients} />
          <MetricCard title="Active Subscriptions" value={metrics.activeSubscriptions} />
          <MetricCard title="Monthly Revenue" value={`$${metrics.monthlyRevenue}`} />
          <MetricCard title="Avg Patient Value" value={`$${metrics.avgPatientValue}`} />
        </div>
        
        <div className="dashboard-grid">
          <RevenueChartWidget />
          <DemographicsWidget />
          <UserActivityWidget />
          <SystemHealthWidget />
        </div>
        
        <BeccaAIChatInterface />
      </div>
    </DashboardLayout>
  );
};
```

### Complete Becca AI Implementation Flow

1. **User Authentication & Role Assignment**:
   ```
   Login → Verify Credentials → Load Role & Permissions → Route to Portal
   ```

2. **AI Query Processing**:
   ```
   User Query → Intent Classification → Permission Check → Data Retrieval → 
   AI Generation → Compliance Filter → Response Delivery → Audit Log
   ```

3. **SOAP Note Workflow**:
   ```
   Intake Form → AI Generation → Provider Review Queue → 
   Edit/Approve → Patient Record → Audit Trail
   ```

4. **Analytics & Reporting**:
   ```
   Report Request → Permission Check → Data Aggregation → 
   Visualization → PDF Generation → Secure Delivery
   ```

5. **Voice Interaction**:
   ```
   Wake Word → Speech Recognition → Query Processing → 
   AI Response → Text-to-Speech → Audio Output
   ```

### Role Capabilities Matrix

| Feature | Superadmin | Admin | Provider | Sales Rep | Patient |
|---------|------------|-------|----------|-----------|---------|
| View All Patients | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Assigned Patients | ✅ | ✅ | ✅ | ❌ | ✅ (self) |
| Generate SOAP Notes | ✅ | ❌ | ✅ | ❌ | ❌ |
| Approve SOAP Notes | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Financial Reports | ✅ | ✅ | ❌ | ✅ | ❌ |
| Generate Demographics | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| AI Query Access | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI Financial Queries | ✅ | ✅ | ❌ | ✅ | ❌ |
| Voice Interface | ✅ | ✅ | ✅ | ✅ | ✅ |

### Patient Profile Hashtag System & Membership Management

#### Overview
Implement a visual hashtag system for patient profiles to quickly identify membership status and provide quick action buttons for membership management. This creates an intuitive interface for staff to understand patient status at a glance and take immediate actions.

#### 1. Hashtag Status System

```sql
-- Add hashtag fields to patients table
ALTER TABLE patients
  ADD COLUMN membership_status VARCHAR(50) DEFAULT 'qualified',
  ADD COLUMN membership_hashtags TEXT[],
  ADD COLUMN status_updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN status_updated_by UUID REFERENCES users(id);

-- Create membership status history table
CREATE TABLE membership_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  
  -- Status change details
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  change_reason TEXT,
  
  -- Trigger details
  triggered_by VARCHAR(50), -- manual, subscription_payment, failed_payment, etc.
  triggered_by_user_id UUID REFERENCES users(id),
  
  -- Associated data
  subscription_id UUID REFERENCES subscriptions(id),
  stripe_event_id VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create hashtag configuration table
CREATE TABLE hashtag_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hashtag details
  tag_name VARCHAR(50) UNIQUE NOT NULL, -- #activemember, #qualified, etc.
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Visual styling
  color_hex VARCHAR(7) NOT NULL, -- #00FF00 for active, #FFA500 for paused, etc.
  icon_name VARCHAR(50), -- font-awesome or material icon name
  badge_style VARCHAR(50) DEFAULT 'solid', -- solid, outline, gradient
  
  -- Business rules
  auto_apply_rules JSONB, -- conditions for automatic application
  priority INTEGER DEFAULT 0, -- display order
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default hashtags
INSERT INTO hashtag_configs (tag_name, display_name, color_hex, icon_name, priority) VALUES
  ('#activemember', 'Active Member', '#00C851', 'check-circle', 1),
  ('#qualified', 'Qualified', '#33B5E5', 'user-check', 2),
  ('#paused', 'Paused', '#FFA500', 'pause-circle', 3),
  ('#cancelled', 'Cancelled', '#FF4444', 'times-circle', 4),
  ('#pending', 'Pending Payment', '#FFBB33', 'clock', 5),
  ('#vip', 'VIP Patient', '#AA66CC', 'star', 6),
  ('#atrisk', 'At Risk', '#FF8800', 'exclamation-triangle', 7);

CREATE INDEX idx_membership_status ON patients(membership_status);
CREATE INDEX idx_status_history_patient ON membership_status_history(patient_id);
```

#### 2. Membership Action Buttons Implementation

```typescript
// Membership management service
export class MembershipManagementService {
  constructor(
    private stripe: StripePaymentService,
    private db: Database,
    private notifications: NotificationService
  ) {}
  
  // Pause subscription
  async pauseSubscription(params: {
    patientId: string;
    reason: string;
    resumeDate?: Date;
    userId: string;
  }): Promise<void> {
    const patient = await this.db.patients.findUnique({
      where: { id: params.patientId },
      include: { subscriptions: { where: { status: 'active' } } }
    });
    
    if (!patient?.subscriptions?.[0]) {
      throw new Error('No active subscription found');
    }
    
    const subscription = patient.subscriptions[0];
    
    // Update Stripe subscription
    await this.stripe.pauseSubscription({
      subscriptionId: subscription.stripe_subscription_id,
      resumeDate: params.resumeDate
    });
    
    // Update database
    await this.db.$transaction(async (tx) => {
      // Update subscription
      await tx.subscriptions.update({
        where: { id: subscription.id },
        data: {
          status: 'paused',
          paused_at: new Date(),
          pause_reason: params.reason,
          scheduled_resume_date: params.resumeDate
        }
      });
      
      // Update patient status and hashtags
      await tx.patients.update({
        where: { id: params.patientId },
        data: {
          membership_status: 'paused',
          membership_hashtags: ['#paused'],
          status_updated_at: new Date(),
          status_updated_by: params.userId
        }
      });
      
      // Log status change
      await tx.membership_status_history.create({
        data: {
          patient_id: params.patientId,
          previous_status: 'active',
          new_status: 'paused',
          change_reason: params.reason,
          triggered_by: 'manual',
          triggered_by_user_id: params.userId,
          subscription_id: subscription.id
        }
      });
    });
    
    // Send notifications
    await this.notifications.sendMembershipStatusChange({
      patientId: params.patientId,
      newStatus: 'paused',
      resumeDate: params.resumeDate
    });
    
    // Update Becca AI knowledge base
    await this.updateBeccaAIKnowledge(params.patientId, 'paused');
  }
  
  // Cancel subscription
  async cancelSubscription(params: {
    patientId: string;
    reason: string;
    immediate: boolean;
    userId: string;
  }): Promise<void> {
    const patient = await this.db.patients.findUnique({
      where: { id: params.patientId },
      include: { subscriptions: { where: { status: { in: ['active', 'paused'] } } } }
    });
    
    if (!patient?.subscriptions?.[0]) {
      throw new Error('No active or paused subscription found');
    }
    
    const subscription = patient.subscriptions[0];
    
    // Cancel in Stripe
    const canceledSub = await this.stripe.cancelSubscription({
      subscriptionId: subscription.stripe_subscription_id,
      immediate: params.immediate
    });
    
    // Update database
    await this.db.$transaction(async (tx) => {
      await tx.subscriptions.update({
        where: { id: subscription.id },
        data: {
          status: params.immediate ? 'cancelled' : 'pending_cancellation',
          cancel_at_period_end: !params.immediate,
          cancelled_at: new Date(),
          cancellation_reason: params.reason
        }
      });
      
      await tx.patients.update({
        where: { id: params.patientId },
        data: {
          membership_status: 'cancelled',
          membership_hashtags: ['#cancelled'],
          status_updated_at: new Date(),
          status_updated_by: params.userId
        }
      });
      
      await tx.membership_status_history.create({
        data: {
          patient_id: params.patientId,
          previous_status: subscription.status,
          new_status: 'cancelled',
          change_reason: params.reason,
          triggered_by: 'manual',
          triggered_by_user_id: params.userId,
          subscription_id: subscription.id
        }
      });
    });
    
    // Send cancellation email
    await this.notifications.sendCancellationConfirmation({
      patient,
      effectiveDate: params.immediate ? new Date() : subscription.current_period_end
    });
  }
  
  // Reactivate subscription
  async reactivateSubscription(params: {
    patientId: string;
    paymentMethodId?: string;
    userId: string;
  }): Promise<void> {
    const patient = await this.db.patients.findUnique({
      where: { id: params.patientId },
      include: { 
        subscriptions: { 
          where: { status: { in: ['paused', 'cancelled', 'past_due'] } },
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });
    
    if (!patient) throw new Error('Patient not found');
    
    let subscription;
    
    if (patient.subscriptions?.[0]?.status === 'paused') {
      // Resume paused subscription
      subscription = await this.stripe.resumeSubscription({
        subscriptionId: patient.subscriptions[0].stripe_subscription_id
      });
      
      await this.db.subscriptions.update({
        where: { id: patient.subscriptions[0].id },
        data: {
          status: 'active',
          paused_at: null,
          scheduled_resume_date: null
        }
      });
    } else {
      // Create new subscription for cancelled/past_due
      const priceId = patient.subscriptions?.[0]?.stripe_price_id || 
                     await this.determinePriceId(patient.initial_form_type);
      
      const result = await this.stripe.createSubscriptionWithInvoice({
        patientId: params.patientId,
        priceId,
        paymentMethodId: params.paymentMethodId,
        metadata: {
          reactivation: 'true',
          previous_subscription_id: patient.subscriptions?.[0]?.id
        }
      });
      
      subscription = result.subscription;
    }
    
    // Update patient status
    await this.db.$transaction(async (tx) => {
      await tx.patients.update({
        where: { id: params.patientId },
        data: {
          membership_status: 'active',
          membership_hashtags: ['#activemember'],
          status_updated_at: new Date(),
          status_updated_by: params.userId
        }
      });
      
      await tx.membership_status_history.create({
        data: {
          patient_id: params.patientId,
          previous_status: patient.membership_status,
          new_status: 'active',
          change_reason: 'Subscription reactivated',
          triggered_by: 'manual',
          triggered_by_user_id: params.userId,
          subscription_id: subscription.id
        }
      });
    });
    
    // Send reactivation confirmation
    await this.notifications.sendReactivationConfirmation(patient);
    
    // Update Becca AI
    await this.updateBeccaAIKnowledge(params.patientId, 'active');
  }
}
```

#### 3. UI Components for Profile Management

```typescript
// Patient profile header with hashtags and actions
export const PatientProfileHeader: React.FC<{ patient: Patient }> = ({ patient }) => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();
  
  const handleMembershipAction = async (action: 'pause' | 'cancel' | 'reactivate') => {
    setActionLoading(action);
    
    try {
      switch (action) {
        case 'pause':
          const pauseModal = await showPauseSubscriptionModal();
          if (pauseModal.confirmed) {
            await api.post('/membership/pause', {
              patientId: patient.id,
              reason: pauseModal.reason,
              resumeDate: pauseModal.resumeDate
            });
            toast.success('Subscription paused successfully');
          }
          break;
          
        case 'cancel':
          const cancelModal = await showCancelSubscriptionModal();
          if (cancelModal.confirmed) {
            await api.post('/membership/cancel', {
              patientId: patient.id,
              reason: cancelModal.reason,
              immediate: cancelModal.immediate
            });
            toast.success('Subscription cancelled');
          }
          break;
          
        case 'reactivate':
          await api.post('/membership/reactivate', {
            patientId: patient.id
          });
          toast.success('Subscription reactivated');
          break;
      }
      
      // Refresh patient data
      mutate(`/patients/${patient.id}`);
    } catch (error) {
      toast.error(`Failed to ${action} subscription`);
    } finally {
      setActionLoading(null);
    }
  };
  
  return (
    <div className="patient-profile-header">
      <div className="patient-info">
        <h1>{patient.first_name} {patient.last_name}</h1>
        <p className="patient-id">ID: {patient.id}</p>
      </div>
      
      <div className="hashtag-container">
        {patient.membership_hashtags?.map(tag => {
          const config = hashtagConfigs.find(c => c.tag_name === tag);
          return (
            <span
              key={tag}
              className="hashtag-badge"
              style={{ 
                backgroundColor: config?.color_hex,
                color: getContrastColor(config?.color_hex)
              }}
            >
              <Icon name={config?.icon_name} />
              {tag}
            </span>
          );
        })}
        
        {/* Additional status indicators */}
        {patient.is_vip && (
          <span className="hashtag-badge vip">
            <Icon name="star" />
            #vip
          </span>
        )}
        
        {patient.days_since_last_order > 60 && (
          <span className="hashtag-badge at-risk">
            <Icon name="exclamation-triangle" />
            #atrisk
          </span>
        )}
      </div>
      
      <div className="membership-actions">
        {patient.membership_status === 'active' && (
          <>
            <Button
              variant="warning"
              onClick={() => handleMembershipAction('pause')}
              loading={actionLoading === 'pause'}
              disabled={!user.permissions.can_manage_subscriptions}
            >
              <Icon name="pause" /> Pause
            </Button>
            <Button
              variant="danger"
              onClick={() => handleMembershipAction('cancel')}
              loading={actionLoading === 'cancel'}
              disabled={!user.permissions.can_manage_subscriptions}
            >
              <Icon name="times" /> Cancel
            </Button>
          </>
        )}
        
        {patient.membership_status === 'paused' && (
          <>
            <Button
              variant="success"
              onClick={() => handleMembershipAction('reactivate')}
              loading={actionLoading === 'reactivate'}
              disabled={!user.permissions.can_manage_subscriptions}
            >
              <Icon name="play" /> Resume
            </Button>
            <Button
              variant="danger"
              onClick={() => handleMembershipAction('cancel')}
              loading={actionLoading === 'cancel'}
              disabled={!user.permissions.can_manage_subscriptions}
            >
              <Icon name="times" /> Cancel
            </Button>
          </>
        )}
        
        {patient.membership_status === 'cancelled' && (
          <Button
            variant="success"
            onClick={() => handleMembershipAction('reactivate')}
            loading={actionLoading === 'reactivate'}
            disabled={!user.permissions.can_manage_subscriptions}
          >
            <Icon name="refresh" /> Reactivate
          </Button>
        )}
        
        {patient.membership_status === 'qualified' && (
          <Button
            variant="primary"
            onClick={() => navigate(`/patients/${patient.id}/subscribe`)}
            disabled={!user.permissions.can_manage_subscriptions}
          >
            <Icon name="credit-card" /> Subscribe
          </Button>
        )}
      </div>
    </div>
  );
};

// Modal for pause subscription
export const PauseSubscriptionModal: React.FC = () => {
  const [reason, setReason] = useState('');
  const [resumeDate, setResumeDate] = useState<Date | null>(null);
  
  return (
    <Modal title="Pause Subscription">
      <div className="pause-form">
        <FormGroup label="Reason for Pause">
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          >
            <option value="">Select reason...</option>
            <option value="financial_hardship">Financial Hardship</option>
            <option value="medical_break">Medical Break</option>
            <option value="traveling">Traveling</option>
            <option value="other">Other</option>
          </Select>
        </FormGroup>
        
        <FormGroup label="Resume Date (Optional)">
          <DatePicker
            selected={resumeDate}
            onChange={setResumeDate}
            minDate={addDays(new Date(), 1)}
            maxDate={addMonths(new Date(), 3)}
            placeholderText="Select resume date"
          />
        </FormGroup>
        
        <Alert type="info">
          The subscription will be paused immediately. 
          {resumeDate 
            ? ` It will automatically resume on ${format(resumeDate, 'MMMM d, yyyy')}.`
            : ' You can manually resume it at any time.'
          }
        </Alert>
      </div>
    </Modal>
  );
};
```

#### 4. Automated Hashtag Updates

```typescript
// Service to automatically update hashtags based on events
export class HashtagAutomationService {
  async processSubscriptionEvent(event: StripeWebhookEvent) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.applyActiveHashtag(event.customer_id);
        break;
        
      case 'invoice.payment_failed':
        await this.applyAtRiskHashtag(event.customer_id);
        break;
        
      case 'subscription.paused':
        await this.applyPausedHashtag(event.customer_id);
        break;
        
      case 'subscription.cancelled':
        await this.applyCancelledHashtag(event.customer_id);
        break;
        
      case 'customer.subscription.trial_will_end':
        await this.applyTrialEndingHashtag(event.customer_id);
        break;
    }
  }
  
  async runDailyHashtagUpdate() {
    // Check for at-risk patients (no order in 60 days)
    const atRiskPatients = await db.$queryRaw`
      SELECT p.id
      FROM patients p
      LEFT JOIN shipments s ON p.id = s.patient_id
      WHERE p.membership_status = 'active'
      GROUP BY p.id
      HAVING MAX(s.created_at) < NOW() - INTERVAL '60 days'
         OR MAX(s.created_at) IS NULL
    `;
    
    for (const patient of atRiskPatients) {
      await this.addHashtag(patient.id, '#atrisk');
    }
    
    // Check for VIP patients (high lifetime value)
    const vipPatients = await db.$queryRaw`
      SELECT p.id
      FROM patients p
      JOIN subscriptions s ON p.id = s.patient_id
      JOIN invoices i ON s.id = i.subscription_id
      WHERE i.status = 'paid'
      GROUP BY p.id
      HAVING SUM(i.amount_paid_cents) > 500000 -- $5000+
    `;
    
    for (const patient of vipPatients) {
      await this.addHashtag(patient.id, '#vip');
    }
  }
  
  private async addHashtag(patientId: string, hashtag: string) {
    await db.patients.update({
      where: { id: patientId },
      data: {
        membership_hashtags: {
          push: hashtag
        }
      }
    });
  }
}
```

#### 5. Hashtag Search and Filtering

```typescript
// API endpoint for searching patients by hashtag
export async function searchPatientsByHashtag(req: Request, res: Response) {
  const { hashtags, combineMode = 'any' } = req.query;
  
  const query = combineMode === 'all'
    ? { membership_hashtags: { hasEvery: hashtags } }
    : { membership_hashtags: { hasSome: hashtags } };
  
  const patients = await db.patients.findMany({
    where: query,
    include: {
      subscriptions: {
        where: { status: { in: ['active', 'paused'] } },
        orderBy: { created_at: 'desc' },
        take: 1
      }
    },
    orderBy: { created_at: 'desc' }
  });
  
  res.json({
    patients,
    count: patients.length,
    hashtags: hashtags
  });
}

// React component for hashtag filtering
export const HashtagFilter: React.FC = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { data: patients, mutate } = useSWR(
    selectedTags.length > 0 
      ? `/api/patients/search?hashtags=${selectedTags.join(',')}` 
      : null
  );
  
  const availableHashtags = [
    { tag: '#activemember', count: 1250, color: '#00C851' },
    { tag: '#qualified', count: 450, color: '#33B5E5' },
    { tag: '#paused', count: 89, color: '#FFA500' },
    { tag: '#cancelled', count: 234, color: '#FF4444' },
    { tag: '#atrisk', count: 67, color: '#FF8800' },
    { tag: '#vip', count: 45, color: '#AA66CC' }
  ];
  
  return (
    <div className="hashtag-filter">
      <h3>Filter by Status</h3>
      <div className="hashtag-list">
        {availableHashtags.map(({ tag, count, color }) => (
          <label
            key={tag}
            className={`hashtag-checkbox ${selectedTags.includes(tag) ? 'selected' : ''}`}
            style={{ borderColor: color }}
          >
            <input
              type="checkbox"
              checked={selectedTags.includes(tag)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedTags([...selectedTags, tag]);
                } else {
                  setSelectedTags(selectedTags.filter(t => t !== tag));
                }
              }}
            />
            <span style={{ color }}>{tag}</span>
            <span className="count">({count})</span>
          </label>
        ))}
      </div>
      
      {patients && (
        <div className="filter-results">
          <h4>Results: {patients.count} patients</h4>
          <PatientList patients={patients.patients} />
        </div>
      )}
    </div>
  );
};
```

### Implementation Flow

1. **Database Setup**:
   ```
   Add hashtag columns → Create history table → Insert default configs
   ```

2. **Membership Actions**:
   ```
   User clicks action → Show confirmation modal → Call API → 
   Update Stripe → Update database → Send notifications → 
   Refresh UI → Update Becca AI
   ```

3. **Hashtag Automation**:
   ```
   Webhook event → Process event type → Apply hashtag rules → 
   Update patient record → Log history
   ```

4. **Search & Filter**:
   ```
   Select hashtags → Query database → Display results → 
   Allow bulk actions on filtered patients
   ```

### Key Benefits

1. **Visual Status Recognition**: Staff can instantly see patient status
2. **Quick Actions**: One-click membership management
3. **Automated Updates**: Hashtags update based on system events
4. **Powerful Filtering**: Find patients by status combinations
5. **Audit Trail**: Complete history of all status changes
6. **Role-Based Access**: Actions restricted by permissions

### Documentation Strategy & Implementation

#### 1. Documentation Types & Structure

```
docs/
├── developer/                    # Technical documentation
│   ├── setup/                   # Environment setup guides
│   ├── api/                     # API endpoint documentation
│   ├── architecture/            # System architecture diagrams
│   └── database/                # Database schemas and migrations
├── user/                        # End-user documentation
│   ├── admin/                   # Admin portal guides
│   ├── provider/                # Provider portal guides
│   ├── patient/                 # Patient portal guides
│   └── sales/                   # Sales portal guides
├── sops/                        # Standard Operating Procedures
│   ├── daily-operations/        # Daily task procedures
│   ├── membership/              # Subscription management
│   ├── compliance/              # HIPAA compliance procedures
│   └── emergency/               # Emergency response procedures
├── training/                    # Training materials
│   ├── videos/                  # Video tutorials
│   ├── quickstart/              # Quick start guides
│   └── exercises/               # Practice exercises
└── compliance/                  # Compliance documentation
    ├── hipaa/                   # HIPAA procedures
    ├── security/                # Security protocols
    └── audit/                   # Audit procedures
```

#### 2. Documentation Tools & Technologies

```typescript
// Documentation generation configuration
export const docConfig = {
  // API Documentation
  swagger: {
    openapi: '3.0.0',
    info: {
      title: 'EONMeds API',
      version: '1.0.0',
      description: 'HIPAA-compliant telehealth platform API'
    },
    servers: [
      { url: 'https://api.eonmeds.com/v1', description: 'Production' },
      { url: 'https://staging-api.eonmeds.com/v1', description: 'Staging' }
    ]
  },
  
  // TypeDoc for code documentation
  typedoc: {
    entryPoints: ['src/index.ts'],
    out: 'docs/developer/api',
    plugin: ['typedoc-plugin-markdown'],
    theme: 'markdown'
  },
  
  // Documentation site (Docusaurus)
  docusaurus: {
    title: 'EONMeds Documentation',
    tagline: 'Comprehensive platform documentation',
    url: 'https://docs.eonmeds.com',
    baseUrl: '/',
    i18n: {
      defaultLocale: 'en',
      locales: ['en', 'es']
    }
  }
};
```

#### 3. SOP Template Structure

```markdown
# SOP-[NUMBER]: [PROCEDURE NAME]

## Purpose
Brief description of why this procedure exists

## Scope
Who this procedure applies to and when it should be used

## Responsibilities
- **Role 1**: Specific responsibilities
- **Role 2**: Specific responsibilities

## Prerequisites
- Required access levels
- Necessary tools or systems
- Prior knowledge needed

## Procedure

### Step 1: [Action Name]
1. Detailed instruction
2. Screenshot or diagram if applicable
3. Expected outcome

### Step 2: [Action Name]
1. Detailed instruction
2. Warning or important note if applicable
3. Expected outcome

## Troubleshooting
Common issues and their solutions

## Related Documents
- Links to related SOPs
- Reference materials

## Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | [Name] | Initial creation |
```

#### 4. Interactive Training Components

```typescript
// Training module component
export const TrainingModule: React.FC<{ module: string }> = ({ module }) => {
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  
  return (
    <div className="training-module">
      <ProgressBar value={progress} max={100} />
      
      <div className="module-content">
        <h2>{trainingModules[module].sections[currentSection].title}</h2>
        
        {/* Interactive content based on section type */}
        {renderSectionContent(trainingModules[module].sections[currentSection])}
        
        {/* Knowledge check */}
        <KnowledgeCheck 
          questions={trainingModules[module].sections[currentSection].questions}
          onComplete={(score) => handleSectionComplete(score)}
        />
      </div>
      
      <div className="navigation">
        <Button onClick={previousSection} disabled={currentSection === 0}>
          Previous
        </Button>
        <Button onClick={nextSection}>
          Next
        </Button>
      </div>
    </div>
  );
};

// Video tutorial component with tracking
export const VideoTutorial: React.FC<{ videoId: string }> = ({ videoId }) => {
  const [watched, setWatched] = useState(false);
  
  const handleVideoEnd = () => {
    // Track completion
    api.post('/training/video-completed', { videoId });
    setWatched(true);
  };
  
  return (
    <div className="video-tutorial">
      <video 
        controls
        onEnded={handleVideoEnd}
        src={`/training/videos/${videoId}.mp4`}
      />
      {watched && (
        <Alert type="success">
          ✓ Video completed! You can now proceed to the next section.
        </Alert>
      )}
    </div>
  );
};
```

#### 5. Documentation Maintenance Process

```typescript
// Automated documentation updates
export class DocumentationUpdater {
  async updateApiDocs() {
    // Generate OpenAPI spec from routes
    const spec = await generateOpenAPISpec();
    
    // Update Swagger documentation
    await fs.writeFile('docs/api/openapi.json', JSON.stringify(spec, null, 2));
    
    // Generate markdown from spec
    await generateMarkdownDocs(spec);
    
    // Update Postman collection
    await updatePostmanCollection(spec);
  }
  
  async checkDocumentationCoverage() {
    const routes = await getAllRoutes();
    const documentedRoutes = await getDocumentedRoutes();
    
    const undocumented = routes.filter(route => 
      !documentedRoutes.includes(route)
    );
    
    if (undocumented.length > 0) {
      console.warn('Undocumented routes:', undocumented);
      await createDocumentationTasks(undocumented);
    }
  }
  
  async validateSOPs() {
    const sops = await getAllSOPs();
    
    for (const sop of sops) {
      // Check if SOP references valid UI elements
      await validateScreenshots(sop);
      
      // Check if procedures match current implementation
      await validateProcedureSteps(sop);
      
      // Check revision date
      if (daysSinceLastUpdate(sop) > 90) {
        await flagForReview(sop);
      }
    }
  }
}
```

#### 6. Role-Specific Documentation Portal

```typescript
// Documentation portal with role-based content
export const DocumentationPortal: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  const getRelevantDocs = () => {
    switch (user.role) {
      case 'provider':
        return ['soap-notes', 'patient-management', 'becca-queries'];
      case 'admin':
        return ['user-management', 'reporting', 'system-configuration'];
      case 'sales':
        return ['lead-tracking', 'conversion-reports', 'campaigns'];
      default:
        return ['getting-started', 'faq'];
    }
  };
  
  return (
    <div className="doc-portal">
      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search documentation..."
      />
      
      <div className="doc-categories">
        <h3>Recommended for Your Role</h3>
        {getRelevantDocs().map(docId => (
          <DocCard key={docId} docId={docId} />
        ))}
      </div>
      
      <div className="recent-updates">
        <h3>Recently Updated</h3>
        <RecentDocsList limit={5} />
      </div>
      
      <div className="training-progress">
        <h3>Your Training Progress</h3>
        <TrainingProgressChart userId={user.id} />
      </div>
    </div>
  );
};
```

### Documentation Best Practices

1. **Write as You Code**: Document features immediately after implementation
2. **Include Examples**: Every API endpoint should have request/response examples
3. **Version Everything**: Track documentation versions alongside code versions
4. **Regular Reviews**: Schedule quarterly documentation reviews
5. **User Feedback**: Include feedback mechanisms in documentation
6. **Accessibility**: Ensure documentation is screen-reader friendly
7. **Search Optimization**: Use clear headings and keywords for searchability

### Documentation Database Schema

```sql
-- Documentation tracking tables
CREATE TABLE documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document details
  doc_type VARCHAR(50) NOT NULL, -- api, sop, guide, training
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  
  -- Metadata
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  language VARCHAR(5) DEFAULT 'en',
  role_access TEXT[], -- array of roles that can access
  tags TEXT[],
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
  published_at TIMESTAMP,
  last_reviewed TIMESTAMP,
  next_review_date DATE,
  
  -- Authorship
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Training modules and completion tracking
CREATE TABLE training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Module details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  role_required VARCHAR(50), -- which role needs this training
  
  -- Content
  sections JSONB NOT NULL, -- array of section objects
  duration_minutes INTEGER,
  
  -- Requirements
  prerequisites UUID[], -- other module IDs
  is_mandatory BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE training_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  module_id UUID NOT NULL REFERENCES training_modules(id),
  
  -- Progress tracking
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  completion_percentage INTEGER DEFAULT 0,
  
  -- Assessment
  quiz_score INTEGER,
  quiz_attempts INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  
  -- Certificate
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url TEXT,
  
  UNIQUE(user_id, module_id)
);

-- Documentation feedback
CREATE TABLE doc_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES documentation(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Feedback
  helpful BOOLEAN NOT NULL,
  comment TEXT,
  suggested_improvements TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- SOP acknowledgments (for compliance)
CREATE TABLE sop_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  doc_id UUID NOT NULL REFERENCES documentation(id),
  
  -- Acknowledgment
  acknowledged_at TIMESTAMP DEFAULT NOW(),
  version_acknowledged VARCHAR(20) NOT NULL,
  ip_address INET,
  
  UNIQUE(user_id, doc_id, version_acknowledged)
);

CREATE INDEX idx_doc_slug ON documentation(slug);
CREATE INDEX idx_doc_status ON documentation(status);
CREATE INDEX idx_doc_role_access ON documentation USING GIN(role_access);
CREATE INDEX idx_training_user ON training_completion(user_id);
CREATE INDEX idx_sop_ack_user ON sop_acknowledgments(user_id);
```

### Webhook Implementation Architecture

```
HeyFlow Form Submission → Webhook Endpoint → Signature Verification → 
Acknowledge (< 200ms) → Queue Processing → Create Patient → 
Create Stripe Subscription → Update Hashtags → Send Notifications
```

### Current Status / Progress Tracking

**Planning Phase Completed** ✓
- Comprehensive Becca AI architecture designed
- Role-based access control system specified
- Database schema extended for AI features
- Hashtag system and membership management planned
- Documentation strategy and training system designed
- Integration points identified
- Security and compliance measures defined

**Documentation Strategy Highlights:**
- Multi-format documentation (API docs, SOPs, training materials)
- Role-based documentation portal
- Interactive training modules with progress tracking
- Bilingual support (English/Spanish)
- Automated documentation generation and validation
- Compliance tracking for SOP acknowledgments

**Next Steps:**
1. Confirm all requirements with user
2. Set up development environment
3. Begin Phase 1 implementation (Core Infrastructure)
4. Create documentation templates and structure
5. Set up automated documentation pipeline

## Getting Started Action Plan

### Step 1: Development Environment Setup (Day 1)

#### 1.1 Initialize Project Structure
```bash
# Create project directory
mkdir eonmeds-platform
cd eonmeds-platform

# Initialize monorepo structure
npx lerna init
mkdir packages
cd packages
mkdir backend frontend mobile shared docs

# Initialize Git repository
git init
git add .
git commit -m "Initial project structure"
```

#### 1.2 Backend Setup (Node.js + TypeScript + PostgreSQL)
```bash
cd packages/backend
npm init -y
npm install --save express @types/express typescript ts-node nodemon
npm install --save pg @types/pg dotenv @types/dotenv
npm install --save-dev @types/node jest @types/jest ts-jest eslint prettier

# Create TypeScript configuration
npx tsc --init

# Create initial folder structure
mkdir -p src/{config,controllers,services,models,middleware,utils,routes}
mkdir -p src/types
mkdir -p tests
```

#### 1.3 Database Setup
```bash
# Install PostgreSQL locally or use Docker
docker run --name eonmeds-db \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=eonmeds \
  -p 5432:5432 \
  -d postgres:15

# Create database schema file
touch src/config/database.sql
touch src/config/migrations/
```

#### 1.4 Frontend Setup (React + TypeScript)
```bash
cd ../frontend
npx create-react-app . --template typescript
npm install axios react-router-dom @types/react-router-dom
npm install @mui/material @emotion/react @emotion/styled
npm install swr react-hook-form
```

### Step 2: Core Infrastructure Implementation (Days 2-5)

#### 2.1 Database Schema Creation
```sql
-- src/config/database.sql
-- Start with core tables for Phase 1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create roles table first
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create users table with RBAC
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role_id UUID NOT NULL REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (code, name, permissions) VALUES
  ('superadmin', 'Super Administrator', '{"*": ["*"]}'),
  ('admin', 'Administrator', '{"users": ["read", "write"], "patients": ["read", "write"], "reports": ["read"]}'),
  ('provider', 'Healthcare Provider', '{"patients": ["read", "write"], "soap_notes": ["read", "write"]}'),
  ('sales_rep', 'Sales Representative', '{"leads": ["read", "write"], "reports": ["read"]}'),
  ('patient', 'Patient', '{"self": ["read"]}');
```

#### 2.2 Authentication & Authorization Setup
```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: any;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as any;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || {};
    
    if (userPermissions['*']?.includes('*')) {
      return next(); // Superadmin
    }
    
    if (userPermissions[resource]?.includes(action)) {
      return next();
    }
    
    res.status(403).json({ error: 'Insufficient permissions' });
  };
};
```

### Step 3: Documentation Setup (Day 3 - Parallel)

#### 3.1 Create Documentation Structure
```bash
cd packages/docs
npm init -y
npm install --save-dev @docusaurus/core @docusaurus/preset-classic
npx create-docusaurus@latest . classic --typescript

# Create documentation directories
mkdir -p docs/{developer,user,sops,training,compliance}
mkdir -p static/videos
mkdir -p blog  # For announcements and updates
```

#### 3.2 API Documentation Setup
```bash
cd ../backend
npm install --save swagger-jsdoc swagger-ui-express
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express

# Create Swagger configuration
touch src/config/swagger.ts
```

### Step 4: Initial Features Priority (Week 1)

1. **Day 1-2**: Environment setup and project initialization
2. **Day 3-4**: Core authentication system with JWT
3. **Day 5**: RBAC implementation with permission checking
4. **Day 6-7**: Audit logging system
5. **Week 2**: Begin patient management and Stripe integration

### Step 5: Development Workflow Setup

#### 5.1 Git Workflow
```bash
# Create development branches
git checkout -b develop
git checkout -b feature/core-infrastructure

# Set up commit message template
echo "feat|fix|docs|style|refactor|test|chore: Subject

# Detailed description

# Issue: #" > .gitmessage
git config commit.template .gitmessage
```

#### 5.2 CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linter
      run: npm run lint
```

### Step 6: Team Onboarding Checklist

- [ ] Clone repository and follow setup guide
- [ ] Install required tools (Node.js, PostgreSQL, Docker)
- [ ] Review project architecture documentation
- [ ] Complete HIPAA compliance training module
- [ ] Set up local development environment
- [ ] Run test suite successfully
- [ ] Review and acknowledge coding standards
- [ ] Join project communication channels

### Immediate Action Items (This Week)

1. **Today**:
   - Set up GitHub repository
   - Create initial project structure
   - Set up PostgreSQL database

2. **Tomorrow**:
   - Implement user authentication
   - Create first API endpoints
   - Set up automated testing

3. **Day 3**:
   - Complete RBAC system
   - Create first documentation pages
   - Set up CI/CD pipeline

4. **Day 4-5**:
   - Implement audit logging
   - Create developer setup guide
   - Begin Stripe integration research

### Key Decisions Needed

1. **Hosting Platform**: AWS, Google Cloud, or Azure?
2. **Domain Name**: Confirm eonmeds.com availability
3. **SSL Certificates**: Let's Encrypt or paid certificate?
4. **Email Service**: SendGrid, AWS SES, or Mailgun?
5. **Monitoring**: DataDog, New Relic, or AWS CloudWatch?
6. **Error Tracking**: Sentry or Rollbar?

### Success Metrics for Week 1

- [ ] Development environment fully operational
- [ ] Core authentication working with all 5 roles
- [ ] Database schema for Phase 1 implemented
- [ ] API documentation auto-generating
- [ ] First SOP document created
- [ ] CI/CD pipeline running
- [ ] Team can run project locally
