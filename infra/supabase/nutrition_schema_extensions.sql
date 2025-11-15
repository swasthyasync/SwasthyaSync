-- Nutrition Engine Schema Extensions for SwasthyaSync
-- These tables should be added to your existing Supabase schema

-- ===================================================================
-- FOOD ITEMS (Ayurvedic Food Database)
-- ===================================================================
create table public.food_items (
  id uuid not null default gen_random_uuid (),
  name_en text not null,
  name_sanskrit text,
  food_group text not null,
  calories_per_100g numeric(8, 3),
  protein_g numeric(6, 3),
  carbs_g numeric(6, 3),
  fat_g numeric(6, 3),
  fiber_g numeric(6, 3),
  vitamins text[],
  minerals text[],
  rasa text[],  -- Taste properties (Madhura, Amla, Lavana, Katu, Tikta, Kashaya)
  virya text,   -- Potency (Ushna - Hot, Shita - Cold)
  vipaka text,  -- Post-digestive effect (Madhura, Amla, Katu)
  guna text[],  -- Qualities (Laghu, Guru, Snigdha, Ruksha, Manda, Teekshna)
  dosha_effect text[],  -- Effects on doshas (Reduces/Aggravates/Balances Vata/Pitta/Kapha)
  seasonal_suitability text[],
  digestion_level text,  -- Digestion ease (Laghu - Light, Guru - Heavy)
  region_common text[],
  contraindications text[],
  suggested_combinations text[],
  therapeutic_uses text[],
  recommended_portion text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint food_items_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_food_items_group on public.food_items using btree (food_group) tablespace pg_default;
create index if not exists idx_food_items_dosha on public.food_items using gin (dosha_effect) tablespace pg_default;
create index if not exists idx_food_items_rasa on public.food_items using gin (rasa) tablespace pg_default;

create trigger food_items_updated_at_trigger 
before update on food_items 
for each row 
execute function update_updated_at_column ();

-- ===================================================================
-- MEAL LOGS (Patient Meal Tracking)
-- ===================================================================
create table public.meal_logs (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  food_item_id uuid not null,
  quantity numeric(6, 2),
  unit text,
  meal_type text, -- breakfast, lunch, dinner, snack
  logged_at timestamp with time zone not null default now(),
  notes text,
  created_at timestamp with time zone not null default now(),
  constraint meal_logs_pkey primary key (id),
  constraint meal_logs_user_id_fkey foreign key (user_id) references profiles (id) on delete cascade,
  constraint meal_logs_food_item_id_fkey foreign key (food_item_id) references food_items (id)
) tablespace pg_default;

create index if not exists idx_meal_logs_user on public.meal_logs using btree (user_id) tablespace pg_default;
create index if not exists idx_meal_logs_date on public.meal_logs using btree (logged_at desc) tablespace pg_default;

-- ===================================================================
-- NUTRITION FEEDBACK (Patient-reported Outcomes)
-- ===================================================================
create table public.nutrition_feedback (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  diet_recommendation_id uuid,
  food_item_id uuid,
  effectiveness_score integer, -- 1-10 scale
  symptoms_improved text[],
  symptoms_worsened text[],
  notes text,
  logged_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint nutrition_feedback_pkey primary key (id),
  constraint nutrition_feedback_user_id_fkey foreign key (user_id) references profiles (id) on delete cascade,
  constraint nutrition_feedback_diet_recommendation_id_fkey foreign key (diet_recommendation_id) references diet_recommendations (id),
  constraint nutrition_feedback_food_item_id_fkey foreign key (food_item_id) references food_items (id),
  constraint nutrition_feedback_effectiveness_check check ((effectiveness_score >= 1) and (effectiveness_score <= 10))
) tablespace pg_default;

create index if not exists idx_nutrition_feedback_user on public.nutrition_feedback using btree (user_id) tablespace pg_default;
create index if not exists idx_nutrition_feedback_diet on public.nutrition_feedback using btree (diet_recommendation_id) tablespace pg_default;

-- ===================================================================
-- DIETITIAN RECOMMENDATIONS (Practitioner-specific Guidance)
-- ===================================================================
create table public.dietitian_recommendations (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  practitioner_id uuid not null,
  general_diet_plan jsonb,
  personalized_recommendations jsonb,
  foods_to_favor jsonb,
  foods_to_avoid jsonb,
  meal_timing jsonb,
  notes text,
  valid_from date,
  valid_to date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint dietitian_recommendations_pkey primary key (id),
  constraint dietitian_recommendations_user_id_fkey foreign key (user_id) references profiles (id) on delete cascade,
  constraint dietitian_recommendations_practitioner_id_fkey foreign key (practitioner_id) references profiles (id)
) tablespace pg_default;

create index if not exists idx_dietitian_recommendations_user on public.dietitian_recommendations using btree (user_id) tablespace pg_default;
create index if not exists idx_dietitian_recommendations_practitioner on public.dietitian_recommendations using btree (practitioner_id) tablespace pg_default;

create trigger dietitian_recommendations_updated_at_trigger 
before update on dietitian_recommendations 
for each row 
execute function update_updated_at_column ();

-- ===================================================================
-- ENHANCE EXISTING TABLES
-- ===================================================================

-- Add nutrition-related fields to existing diet_recommendations table
-- (These would be added via ALTER TABLE statements in a real migration)
/*
ALTER TABLE public.diet_recommendations ADD COLUMN IF NOT EXISTS recommendation_type text default 'general';
ALTER TABLE public.diet_recommendations ADD COLUMN IF NOT EXISTS source_therapy_id uuid references appointments (id);
ALTER TABLE public.diet_recommendations ADD COLUMN IF NOT EXISTS effectiveness_score numeric(3, 2);
ALTER TABLE public.diet_recommendations ADD COLUMN IF NOT EXISTS foods_to_favor_detailed jsonb;
ALTER TABLE public.diet_recommendations ADD COLUMN IF NOT EXISTS foods_to_avoid_detailed jsonb;
*/

-- Add nutrition-related fields to existing users/profiles table
/*
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_preferences jsonb default '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS food_allergies text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cultural_dietary_restrictions text[];
*/

-- Add nutrition-related fields to existing medical_history table
/*
ALTER TABLE public.medical_history ADD COLUMN IF NOT EXISTS nutrition_goals text[];
ALTER TABLE public.medical_history ADD COLUMN IF NOT EXISTS preferred_cuisines text[];
*/