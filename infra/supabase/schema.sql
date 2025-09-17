-- infra/supabase/schema.sql
-- Complete database schema for AyurConnect

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255), -- For practitioner/admin login
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  role VARCHAR(20) NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'practitioner', 'admin')),
  
  -- Additional fields
  address TEXT,
  emergency_contact VARCHAR(15),
  emergency_name VARCHAR(200),
  profile_picture_url TEXT,
  
  -- Consent and compliance
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false
);

-- OTP tokens table
CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(15) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER DEFAULT 0
);

CREATE INDEX idx_otp_phone ON otp_tokens(phone);
CREATE INDEX idx_otp_expires ON otp_tokens(expires_at);

-- Questionnaire answers table
CREATE TABLE questionnaire_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questionnaire_type VARCHAR(50) NOT NULL, -- 'prakriti' or 'mental_health'
  answers JSONB NOT NULL, -- Store all answers as JSON
  
  -- Scoring results
  scores JSONB, -- {vata: 30, pitta: 45, kapha: 25, dominant: 'pitta'}
  mental_health_score JSONB, -- {level: 'yellow', label: 'Moderate', risk: 'medium'}
  
  -- ML predictions (for future use)
  ml_predictions JSONB,
  confidence_score DECIMAL(3,2),
  
  -- Metadata
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questionnaire_user ON questionnaire_answers(user_id);
CREATE INDEX idx_questionnaire_type ON questionnaire_answers(questionnaire_type);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id),
  practitioner_id UUID REFERENCES users(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
  type VARCHAR(50), -- 'consultation', 'follow-up', 'therapy'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointment_patient ON appointments(patient_id);
CREATE INDEX idx_appointment_practitioner ON appointments(practitioner_id);
CREATE INDEX idx_appointment_date ON appointments(appointment_date);

-- Sessions/Treatments table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID NOT NULL REFERENCES users(id),
  practitioner_id UUID NOT NULL REFERENCES users(id),
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  treatment_type VARCHAR(100),
  notes TEXT,
  audio_recording_url TEXT,
  transcription TEXT,
  ml_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_patient ON sessions(patient_id);
CREATE INDEX idx_session_date ON sessions(session_date);

-- Diet recommendations table
CREATE TABLE diet_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  prakriti_type VARCHAR(20),
  recommendations JSONB, -- Structured diet plan
  foods_to_favor JSONB,
  foods_to_avoid JSONB,
  meal_timing JSONB,
  created_by UUID REFERENCES users(id),
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_diet_user ON diet_recommendations(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questionnaire_updated_at BEFORE UPDATE ON questionnaire_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diet_updated_at BEFORE UPDATE ON diet_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Policies for questionnaire_answers
CREATE POLICY "Users can view own questionnaires" ON questionnaire_answers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questionnaires" ON questionnaire_answers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Sample data for testing (optional)
-- INSERT INTO users (phone, email, first_name, last_name, role, gender)
-- VALUES 
-- ('9876543210', 'admin@ayurconnect.com', 'Admin', 'User', 'admin', 'other'),
-- ('9876543211', 'doctor@ayurconnect.com', 'Dr. Sharma', 'Ayurveda', 'practitioner', 'male');
