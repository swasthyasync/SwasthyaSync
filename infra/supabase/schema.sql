-- ===================================================================
-- New schema.sql (replaces previous AyurConnect schema)
-- Includes required extensions and trigger functions
-- ===================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Utility trigger to update chat_threads.updated_at when a new message arrives
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_threads
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- APPOINTMENTS
-- ===================================================================
create table public.appointments (
  id uuid not null default extensions.uuid_generate_v4 (),
  patient_id uuid not null,
  practitioner_id uuid null,
  appointment_date date not null,
  appointment_time time without time zone not null,
  duration_minutes integer null default 30,
  status character varying(20) null default 'scheduled'::character varying,
  type character varying(50) null,
  notes text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint appointments_pkey primary key (id),
  constraint appointments_patient_id_fkey foreign KEY (patient_id) references users (id),
  constraint appointments_practitioner_id_fkey foreign KEY (practitioner_id) references users (id),
  constraint appointments_status_check check (
    (
      (status)::text = any (
        (
          array[
            'scheduled'::character varying,
            'confirmed'::character varying,
            'completed'::character varying,
            'cancelled'::character varying,
            'no-show'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_appointment_patient on public.appointments using btree (patient_id) TABLESPACE pg_default;

create index IF not exists idx_appointment_practitioner on public.appointments using btree (practitioner_id) TABLESPACE pg_default;

create index IF not exists idx_appointment_date on public.appointments using btree (appointment_date) TABLESPACE pg_default;

create trigger update_appointments_updated_at BEFORE
update on appointments for EACH row
execute FUNCTION update_updated_at_column ();

-- ===================================================================
-- AUDIT LOGS
-- ===================================================================
create table public.audit_logs (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  action character varying(100) not null,
  entity_type character varying(50) null,
  entity_id uuid null,
  metadata jsonb null,
  ip_address character varying(45) null,
  user_agent text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint audit_logs_pkey primary key (id),
  constraint audit_logs_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;

create index IF not exists idx_audit_user on public.audit_logs using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_audit_created on public.audit_logs using btree (created_at) TABLESPACE pg_default;

-- ===================================================================
-- CHAT MESSAGES & THREADS
-- ===================================================================
create table public.chat_messages (
  id uuid not null default gen_random_uuid (),
  thread_id uuid not null,
  sender_id uuid not null,
  content text not null,
  is_read boolean null default false,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint chat_messages_pkey primary key (id),
  constraint chat_messages_sender_id_fkey foreign KEY (sender_id) references users (id) on delete CASCADE,
  constraint chat_messages_thread_id_fkey foreign KEY (thread_id) references chat_threads (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_chat_messages_thread on public.chat_messages using btree (thread_id) TABLESPACE pg_default;

create index IF not exists idx_chat_messages_created on public.chat_messages using btree (created_at desc) TABLESPACE pg_default;

create trigger update_thread_on_message
after INSERT on chat_messages for EACH row
execute FUNCTION update_thread_timestamp ();

create table public.chat_threads (
  id uuid not null default gen_random_uuid (),
  title text null,
  patient_id uuid not null,
  practitioner_id uuid null,
  status text null default 'open'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint chat_threads_pkey primary key (id),
  constraint chat_threads_patient_id_fkey foreign KEY (patient_id) references users (id) on delete CASCADE,
  constraint chat_threads_practitioner_id_fkey foreign KEY (practitioner_id) references users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_chat_threads_patient on public.chat_threads using btree (patient_id) TABLESPACE pg_default;

create index IF not exists idx_chat_threads_practitioner on public.chat_threads using btree (practitioner_id) TABLESPACE pg_default;

-- ===================================================================
-- DIET RECOMMENDATIONS
-- ===================================================================
create table public.diet_recommendations (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  prakriti_type character varying(20) null,
  recommendations jsonb null,
  foods_to_favor jsonb null,
  foods_to_avoid jsonb null,
  meal_timing jsonb null,
  created_by uuid null,
  valid_from date null,
  valid_to date null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint diet_recommendations_pkey primary key (id),
  constraint diet_recommendations_created_by_fkey foreign KEY (created_by) references users (id),
  constraint diet_recommendations_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;

create index IF not exists idx_diet_user on public.diet_recommendations using btree (user_id) TABLESPACE pg_default;

create trigger update_diet_updated_at BEFORE
update on diet_recommendations for EACH row
execute FUNCTION update_updated_at_column ();

-- ===================================================================
-- HEALTH METRICS
-- ===================================================================
create table public.health_metrics (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  blood_pressure_systolic numeric null,
  blood_pressure_diastolic numeric null,
  heart_rate numeric null,
  temperature numeric(5, 2) null,
  respiratory_rate numeric null,
  weight numeric(5, 2) null,
  bmi numeric(5, 2) null,
  body_fat_percent numeric(5, 2) null,
  mental_health_score numeric null,
  mental_health_level character varying(20) null,
  stress_level numeric null,
  anxiety_level numeric null,
  sleep_hours numeric(4, 2) null,
  sleep_quality character varying(50) null,
  daily_steps integer null,
  exercise_minutes integer null,
  digestion_score numeric null,
  appetite_level character varying(50) null,
  bowel_movement_status character varying(50) null,
  recorded_date timestamp with time zone null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint health_metrics_pkey primary key (id),
  constraint health_metrics_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_health_metrics_user_id on public.health_metrics using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_health_metrics_recorded_date on public.health_metrics using btree (recorded_date desc) TABLESPACE pg_default;

create trigger health_metrics_updated_at_trigger BEFORE
update on health_metrics for EACH row
execute FUNCTION update_updated_at_column ();

-- ===================================================================
-- MEDICAL HISTORY
-- ===================================================================
create table public.medical_history (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  chronic_conditions text[] null default array[]::text[],
  current_medications jsonb null default '{}'::jsonb,
  allergies text[] null default array[]::text[],
  food_allergies text[] null default array[]::text[],
  drug_allergies text[] null default array[]::text[],
  other_allergies text[] null default array[]::text[],
  previous_surgeries jsonb null default '{}'::jsonb,
  family_history text[] null default array[]::text[],
  exercise_frequency character varying(50) null,
  sleep_pattern character varying(50) null,
  dietary_preferences text[] null default array[]::text[],
  smoking_status character varying(50) null,
  alcohol_consumption character varying(50) null,
  stress_level numeric(3, 1) null,
  previous_ayurvedic_treatment boolean null default false,
  ayurvedic_treatment_details text null,
  specific_health_concerns text[] null default array[]::text[],
  treatment_goals text[] null default array[]::text[],
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint medical_history_pkey primary key (id),
  constraint medical_history_user_id_key unique (user_id),
  constraint medical_history_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_medical_history_user_id on public.medical_history using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_medical_history_updated_at on public.medical_history using btree (updated_at desc) TABLESPACE pg_default;

create trigger medical_history_updated_at_trigger BEFORE
update on medical_history for EACH row
execute FUNCTION update_updated_at_column ();

-- ===================================================================
-- MESSAGES (threads)
-- ===================================================================
create table public.messages (
  id uuid not null default gen_random_uuid (),
  thread_id uuid not null,
  sender_id uuid not null,
  sender_role text not null,
  body text not null,
  is_read boolean null default false,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint messages_pkey primary key (id),
  constraint messages_thread_id_fkey foreign KEY (thread_id) references threads (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_messages_thread_created_at on public.messages using btree (thread_id, created_at desc) TABLESPACE pg_default;

-- ===================================================================
-- ML MODELS & RUNS
-- ===================================================================
create table public.ml_models (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(100) not null,
  version character varying(20) null,
  description text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint ml_models_pkey primary key (id)
) TABLESPACE pg_default;

create table public.ml_runs (
  id uuid not null default extensions.uuid_generate_v4 (),
  model_id uuid null,
  questionnaire_id uuid null,
  predictions jsonb null,
  confidence_score numeric(3, 2) null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint ml_runs_pkey primary key (id),
  constraint ml_runs_model_id_fkey foreign KEY (model_id) references ml_models (id),
  constraint ml_runs_questionnaire_id_fkey foreign KEY (questionnaire_id) references questionnaire_answers (id)
) TABLESPACE pg_default;

-- ===================================================================
-- OTP TOKENS
-- ===================================================================
create table public.otp_tokens (
  id uuid not null default extensions.uuid_generate_v4 (),
  phone character varying(15) null,
  otp_hash character varying(255) not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  attempts integer null default 0,
  email character varying(255) null,
  constraint otp_tokens_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_otp_phone on public.otp_tokens using btree (phone) TABLESPACE pg_default;

create index IF not exists idx_otp_expires on public.otp_tokens using btree (expires_at) TABLESPACE pg_default;

create index IF not exists idx_otp_email on public.otp_tokens using btree (email) TABLESPACE pg_default;

create index IF not exists idx_otp_tokens_phone on public.otp_tokens using btree (phone) TABLESPACE pg_default
where
  (phone is not null);

create index IF not exists idx_otp_tokens_email on public.otp_tokens using btree (email) TABLESPACE pg_default
where
  (email is not null);

create index IF not exists idx_otp_tokens_expires_at on public.otp_tokens using btree (expires_at) TABLESPACE pg_default;

create index IF not exists idx_otp_tokens_otp_hash on public.otp_tokens using btree (otp_hash) TABLESPACE pg_default;

-- ===================================================================
-- PRAKRITI ASSESSMENTS
-- ===================================================================
create table public.prakriti_assessments (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  vata_score numeric(4, 3) null,
  pitta_score numeric(4, 3) null,
  kapha_score numeric(4, 3) null,
  vata_percent integer null,
  pitta_percent integer null,
  kapha_percent integer null,
  dominant_prakriti character varying(20) null,
  ml_predicted_prakriti character varying(20) null,
  ml_confidence numeric(4, 3) null,
  ml_probabilities jsonb null,
  questionnaire_responses jsonb null,
  status character varying(50) null default 'completed'::character varying,
  notes text null,
  assessment_date timestamp with time zone null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint prakriti_assessments_pkey primary key (id),
  constraint prakriti_assessments_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_prakriti_assessments_user_id on public.prakriti_assessments using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_prakriti_assessments_date on public.prakriti_assessments using btree (assessment_date desc) TABLESPACE pg_default;

create index IF not exists idx_prakriti_assessments_dominant on public.prakriti_assessments using btree (dominant_prakriti) TABLESPACE pg_default;

create trigger prakriti_assessments_updated_at_trigger BEFORE
update on prakriti_assessments for EACH row
execute FUNCTION update_updated_at_column ();

-- ===================================================================
-- PROFILES
-- ===================================================================
create table public.profiles (
  id uuid not null,
  email text null,
  phone text null,
  first_name text not null,
  last_name text not null,
  date_of_birth date null,
  gender character varying(20) null,
  avatar_url text null,
  bio text null,
  address_line1 text null,
  address_line2 text null,
  city text null,
  state text null,
  postal_code text null,
  country text null,
  emergency_contact_name text null,
  emergency_contact_phone text null,
  emergency_contact_relation text null,
  occupation text null,
  company_name text null,
  blood_type character varying(10) null,
  height_cm numeric(5, 2) null,
  weight_kg numeric(5, 2) null,
  role character varying(50) null default 'patient'::character varying,
  is_verified boolean null default false,
  is_active boolean null default true,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_phone_key unique (phone),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint valid_gender check (
    (
      (gender)::text = any (
        (
          array[
            'Male'::character varying,
            'Female'::character varying,
            'Other'::character varying,
            'Prefer not to say'::character varying,
            null::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint valid_role check (
    (
      (role)::text = any (
        (
          array[
            'patient'::character varying,
            'practitioner'::character varying,
            'admin'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_profiles_email on public.profiles using btree (email) TABLESPACE pg_default;

create index IF not exists idx_profiles_phone on public.profiles using btree (phone) TABLESPACE pg_default;

create index IF not exists idx_profiles_created_at on public.profiles using btree (created_at desc) TABLESPACE pg_default;

create trigger profiles_updated_at_trigger BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at_column ();

-- ===================================================================
-- QUESTIONNAIRE ANSWERS
-- ===================================================================
create table public.questionnaire_answers (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  questionnaire_type character varying(50) not null,
  answers jsonb not null,
  scores jsonb null,
  mental_health_score jsonb null,
  ml_predictions jsonb null,
  confidence_score numeric(3, 2) null,
  completed_at timestamp with time zone null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  ml_prediction jsonb null,
  therapy_recommendations jsonb null,
  requires_practitioner_review boolean null default true,
  practitioner_validated boolean null default false,
  practitioner_id uuid null,
  practitioner_notes text null,
  final_prakriti_assessment text null,
  recommended_therapies jsonb null,
  validated_at timestamp with time zone null,
  dominant text null,
  constraint questionnaire_answers_pkey primary key (id),
  constraint questionnaire_answers_practitioner_id_fkey foreign KEY (practitioner_id) references users (id),
  constraint questionnaire_answers_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_questionnaire_user on public.questionnaire_answers using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_questionnaire_type on public.questionnaire_answers using btree (questionnaire_type) TABLESPACE pg_default;

create index IF not exists idx_questionnaire_requires_review on public.questionnaire_answers using btree (requires_practitioner_review) TABLESPACE pg_default
where
  (requires_practitioner_review = true);

create trigger update_questionnaire_updated_at BEFORE
update on questionnaire_answers for EACH row
execute FUNCTION update_updated_at_column ();

-- ===================================================================
-- SESSIONS
-- ===================================================================
create table public.sessions (
  id uuid not null default extensions.uuid_generate_v4 (),
  appointment_id uuid null,
  patient_id uuid not null,
  practitioner_id uuid not null,
  session_date timestamp with time zone not null,
  duration_minutes integer null,
  treatment_type character varying(100) null,
  notes text null,
  audio_recording_url text null,
  transcription text null,
  ml_analysis jsonb null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint sessions_pkey primary key (id),
  constraint sessions_appointment_id_fkey foreign KEY (appointment_id) references appointments (id),
  constraint sessions_patient_id_fkey foreign KEY (patient_id) references users (id),
  constraint sessions_practitioner_id_fkey foreign KEY (practitioner_id) references users (id)
) TABLESPACE pg_default;

create index IF not exists idx_session_patient on public.sessions using btree (patient_id) TABLESPACE pg_default;

create index IF not exists idx_session_date on public.sessions using btree (session_date) TABLESPACE pg_default;

-- ===================================================================
-- THREADS
-- ===================================================================
create table public.threads (
  id uuid not null default gen_random_uuid (),
  patient_id uuid not null,
  practitioner_id uuid null,
  subject text null,
  status text null default 'open'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint threads_pkey primary key (id),
  constraint threads_patient_id_fkey foreign KEY (patient_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_threads_patient on public.threads using btree (patient_id) TABLESPACE pg_default;

-- ===================================================================
-- USER PREFERENCES
-- ===================================================================
create table public.user_preferences (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  email_notifications boolean null default true,
  sms_notifications boolean null default false,
  push_notifications boolean null default true,
  appointment_reminders boolean null default true,
  health_tips boolean null default true,
  profile_visibility character varying(50) null default 'private'::character varying,
  data_sharing_consent boolean null default false,
  marketing_consent boolean null default false,
  theme character varying(20) null default 'dark'::character varying,
  language character varying(20) null default 'en'::character varying,
  preferred_treatment_types text[] null default array[]::text[],
  consultation_frequency character varying(50) null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint user_preferences_pkey primary key (id),
  constraint user_preferences_user_id_key unique (user_id),
  constraint user_preferences_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_user_preferences_user_id on public.user_preferences using btree (user_id) TABLESPACE pg_default;

create trigger user_preferences_updated_at_trigger BEFORE
update on user_preferences for EACH row
execute FUNCTION update_updated_at_column ();

-- ===================================================================
-- USERS
-- ===================================================================
create table public.users (
  id uuid not null default extensions.uuid_generate_v4 (),
  phone character varying(15) null,
  email character varying(255) null,
  password_hash character varying(255) null,
  first_name character varying(100) not null,
  last_name character varying(100) not null,
  date_of_birth date null,
  gender character varying(10) null,
  role character varying(20) not null default 'patient'::character varying,
  address text null,
  emergency_contact character varying(15) null,
  emergency_name character varying(200) null,
  profile_picture_url text null,
  consent_given boolean null default false,
  consent_timestamp timestamp with time zone null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  last_login_at timestamp with time zone null,
  is_active boolean null default true,
  is_verified boolean null default false,
  personal_details_completed boolean null default false,
  questionnaire_completed boolean null default false,
  onboarding_completed boolean null default false,
  occupation text null,
  chronic_conditions jsonb null,
  current_medications jsonb null,
  allergies jsonb null,
  previous_surgeries jsonb null,
  family_history jsonb null,
  exercise_frequency text null,
  sleep_pattern text null,
  smoking_status text null,
  alcohol_consumption text null,
  stress_level integer null,
  previous_ayurvedic_treatment boolean null default false,
  specific_concerns jsonb null,
  treatment_goals jsonb null,
  dietary_preferences jsonb null,
  emergency_relation text null,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_phone_key unique (phone),
  constraint users_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint users_role_check check (
    (
      (role)::text = any (
        (
          array[
            'patient'::character varying,
            'practitioner'::character varying,
            'admin'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();
