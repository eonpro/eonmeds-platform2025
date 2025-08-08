-- BECCA AI Schema
-- Tables for SOAP notes, chat history, and AI interactions

-- SOAP Notes table
CREATE TABLE IF NOT EXISTS soap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL, -- Full SOAP note content
  original_content TEXT, -- Original AI-generated content before any edits
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  
  -- Metadata
  created_by VARCHAR(255) NOT NULL DEFAULT 'BECCA AI',
  approved_by UUID REFERENCES users(id),
  approved_by_name VARCHAR(255),
  approved_by_credentials VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  
  -- Version control
  version INTEGER DEFAULT 1,
  edit_history JSONB DEFAULT '[]',
  
  -- AI metadata
  ai_model VARCHAR(50) DEFAULT 'gpt-4',
  ai_response_time_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Indexing for performance
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Indexes for SOAP notes
CREATE INDEX idx_soap_notes_patient_id ON soap_notes(patient_id);
CREATE INDEX idx_soap_notes_status ON soap_notes(status);
CREATE INDEX idx_soap_notes_created_at ON soap_notes(created_at);
CREATE INDEX idx_soap_notes_approved_by ON soap_notes(approved_by);

-- BECCA Chat History
CREATE TABLE IF NOT EXISTS becca_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User context
  user_id UUID REFERENCES users(id),
  user_role VARCHAR(50), -- admin, doctor, representative
  
  -- Conversation
  session_id UUID NOT NULL,
  message_type VARCHAR(20) NOT NULL, -- user, assistant, system
  message TEXT NOT NULL,
  
  -- Context (what the query was about)
  context_type VARCHAR(50), -- patient_info, order_tracking, general_query, soap_note
  context_id UUID, -- ID of related entity (patient_id, order_id, etc)
  
  -- AI metadata
  ai_model VARCHAR(50) DEFAULT 'gpt-4',
  response_time_ms INTEGER,
  tokens_used INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for chat history
CREATE INDEX idx_chat_history_user_id ON becca_chat_history(user_id);
CREATE INDEX idx_chat_history_session_id ON becca_chat_history(session_id);
CREATE INDEX idx_chat_history_created_at ON becca_chat_history(created_at);
CREATE INDEX idx_chat_history_context ON becca_chat_history(context_type, context_id);

-- AI Audit Log (for compliance)
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action details
  action_type VARCHAR(50) NOT NULL, -- soap_generation, chat_query, data_search
  action_details JSONB,
  
  -- User context
  performed_by UUID REFERENCES users(id),
  user_role VARCHAR(50),
  
  -- Patient context (if applicable)
  patient_id UUID REFERENCES patients(id),
  
  -- Results
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- AI details
  ai_model VARCHAR(50),
  prompt TEXT,
  response TEXT,
  tokens_used INTEGER,
  cost_cents INTEGER, -- Track API costs
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX idx_ai_audit_user ON ai_audit_log(performed_by);
CREATE INDEX idx_ai_audit_patient ON ai_audit_log(patient_id);
CREATE INDEX idx_ai_audit_created ON ai_audit_log(created_at);
CREATE INDEX idx_ai_audit_action ON ai_audit_log(action_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for SOAP notes
CREATE TRIGGER update_soap_notes_updated_at BEFORE UPDATE
    ON soap_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 