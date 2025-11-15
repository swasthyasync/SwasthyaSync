// apps/web/src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      apikey: supabaseAnonKey
    }
  }
})

// Database Types based on your schema
export interface User {
  id: string;
  email?: string;
  phone?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  role: 'patient' | 'practitioner' | 'admin';
  address?: string;
  emergency_contact?: string;
  emergency_name?: string;
  emergency_relation?: string;
  occupation?: string;
  chronic_conditions?: string[];
  current_medications?: string[];
  allergies?: string[];
  previous_surgeries?: string[];
  family_history?: string[];
  exercise_frequency?: string;
  sleep_pattern?: string;
  dietary_preferences?: string[];
  smoking_status?: string;
  alcohol_consumption?: string;
  stress_level?: number;
  previous_ayurvedic_treatment?: boolean;
  specific_concerns?: string[];
  treatment_goals?: string[];
  consent_given?: boolean;
  personal_details_completed?: boolean;
  questionnaire_completed?: boolean;
  onboarding_completed?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Auth helper functions
export const authService = {
  async getCurrentUser(): Promise<User | null> {
  try {
    // new supabase v2 shape: supabase.auth.getSession() returns { data: { session } }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('[authService] Session data:', session);

    if (session && session.user?.id) {
      console.log('[authService] Session found, fetching user profile from DB...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle(); // <- use maybeSingle to avoid PGRST116 when row missing

      if (userError) {
        console.error('[authService] Error fetching user data from DB:', userError);
      }

      if (userData) {
        console.log('[authService] User profile fetched from DB:', userData.id);
        return userData;
      } else {
        console.warn('[authService] No DB user row for session user id, falling back to localStorage (if any)');
      }
    }

    // Fallback: load user persisted in localStorage (OTP backend flows store a user there)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        console.log('[authService] Loaded user from localStorage:', parsed.id, 'Role:', parsed.role);
        return parsed;
      } catch (e) {
        console.error('[authService] Failed parsing localStorage user:', e);
      }
    }

    console.log('[authService] No active session and no stored user');
    return null;
  } catch (error) {
    console.error('[authService] Error in getCurrentUser:', error);
    return null;
  }
},

  async signOut() {
    console.log('[authService] Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[authService] Sign out error:', error);
      throw error;
    }
    console.log('[authService] Sign out successful');
  },

  async updateUserProfile(userId: string, updates: Partial<User>) {
    console.log('[authService] Updating user profile:', userId);
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[authService] Error updating user profile:', error);
      throw error;
    }

    console.log('[authService] Profile updated successfully');
    return data;
  },

  async checkUserExists(identifier: { email?: string; phone?: string }): Promise<User | null> {
    try {
      let query = supabase.from('users').select('*');
      
      if (identifier.email) {
        query = query.eq('email', identifier.email);
      } else if (identifier.phone) {
        query = query.eq('phone', identifier.phone);
      } else {
        return null;
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - user doesn't exist
          return null;
        }
        console.error('[authService] Error checking user existence:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[authService] Error in checkUserExists:', error);
      return null;
    }
  }
};