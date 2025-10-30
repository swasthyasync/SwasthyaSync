// apps/web/src/services/profileService.ts
import { supabase } from '../utils/supabase';

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  role?: string;
  address?: string;
  emergency_contact?: string;
  emergency_name?: string;
  emergency_relation?: string;
  profile_picture_url?: string;
  occupation?: string;
  consent_given?: boolean;
  consent_timestamp?: string;
  personal_details_completed?: boolean;
  questionnaire_completed?: boolean;
  onboarding_completed?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
  chronic_conditions?: string[] | string;
  current_medications?: any | string;
  allergies?: string[] | string;
  previous_surgeries?: any | string;
  family_history?: string[] | string;
  exercise_frequency?: string;
  sleep_pattern?: string;
  smoking_status?: string;
  alcohol_consumption?: string;
  stress_level?: number;
  previous_ayurvedic_treatment?: boolean;
  specific_concerns?: string[] | string;
  treatment_goals?: string[] | string;
  dietary_preferences?: string[] | string;
  // Additional address fields
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  phone_number?: string;
}

// Helper to parse JSONB fields from Supabase
export const parseProfileFields = (profile: any): UserProfile => {
  if (!profile) return profile;

  const parsed: UserProfile = { ...profile };

  // Array fields that might come as JSON strings from JSONB columns
  const arrayFields = [
    'chronic_conditions',
    'allergies',
    'family_history',
    'specific_concerns',
    'treatment_goals',
    'dietary_preferences'
  ];

  // Object fields that might come as JSON strings from JSONB columns
  const objectFields = ['current_medications', 'previous_surgeries'];

  // Parse array fields
  for (const field of arrayFields) {
    const value = (profile as any)[field];
    if (value) {
      if (typeof value === 'string') {
        try {
          const parsed_val = JSON.parse(value);
          (parsed as any)[field] = Array.isArray(parsed_val) ? parsed_val : [value];
        } catch (e) {
          // If JSON parsing fails, treat as string
          (parsed as any)[field] = value.includes(',')
            ? value.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            : [value];
        }
      } else if (Array.isArray(value)) {
        (parsed as any)[field] = value;
      }
    } else {
      (parsed as any)[field] = [];
    }
  }

  // Parse object fields
  for (const field of objectFields) {
    const value = (profile as any)[field];
    if (value && typeof value === 'string') {
      try {
        (parsed as any)[field] = JSON.parse(value);
      } catch (e) {
        console.warn(`Failed to parse ${field}:`, e);
      }
    }
  }

  return parsed;
};

export const profileService = {
  // Make the parsing function available externally
  parseProfileFields,

  // ========== PROFILE OPERATIONS ==========

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log('[profileService] Fetching profile for user ID:', userId);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[profileService] Error fetching profile:', error);
        return null;
      }

      if (data) {
        console.log('[profileService] Raw profile data:', data);
        const parsed = parseProfileFields(data);
        console.log('[profileService] Parsed profile data:', parsed);
        return parsed;
      }

      return null;
    } catch (err) {
      console.error('[profileService] Exception in getProfile:', err);
      return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      console.log('[profileService] Updating profile for user:', userId);
      console.log('[profileService] Updates:', updates);

      // Prepare data for database - convert arrays and objects to JSON strings
      const dbUpdates: Record<string, any> = {};

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'id' || !value) continue;

        // Array fields - convert to JSON string for JSONB storage
        if (['chronic_conditions', 'allergies', 'family_history', 'specific_concerns', 'treatment_goals', 'dietary_preferences'].includes(key)) {
          dbUpdates[key] = Array.isArray(value) ? JSON.stringify(value) : value;
        }
        // Object fields - convert to JSON string
        else if (['current_medications', 'previous_surgeries'].includes(key)) {
          dbUpdates[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        }
        // Regular fields
        else {
          dbUpdates[key] = value;
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('[profileService] Error updating profile:', error);
        throw error;
      }

      if (data) {
        console.log('[profileService] Profile updated, parsing response');
        const parsed = parseProfileFields(data);
        console.log('[profileService] Parsed updated profile:', parsed);
        return parsed;
      }

      return null;
    } catch (err) {
      console.error('[profileService] Exception in updateProfile:', err);
      throw err;
    }
  },

  async partialUpdateProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile | null> {
    return this.updateProfile(userId, updates);
  },

  // ========== REAL-TIME SUBSCRIPTIONS ==========

  subscribeToProfile(userId: string, callback: (profile: UserProfile | null) => void) {
    console.log('[profileService] Subscribing to profile changes for user:', userId);

    const subscription = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        (payload: any) => {
          console.log('[profileService] Profile change detected:', payload);
          if (payload?.new) {
            const parsed = parseProfileFields(payload.new);
            console.log('[profileService] Parsed profile update:', parsed);
            callback(parsed);
          }
        }
      )
      .subscribe((status) => {
        console.log('[profileService] Profile subscription status:', status);
      });

    return subscription;
  },

  // ========== BATCH OPERATIONS ==========

  async getCompleteProfile(userId: string) {
    try {
      console.log('[profileService] Getting complete profile for user ID:', userId);
      const profile = await this.getProfile(userId);
      console.log('[profileService] Complete profile result:', profile);
      return {
        profile,
      };
    } catch (err) {
      console.error('[profileService] Error fetching complete profile:', err);
      return null;
    }
  },

  async updateCompleteProfile(
    userId: string,
    profileData: Partial<UserProfile>
  ) {
    try {
      const updatedProfile = await this.updateProfile(userId, profileData);
      return {
        profile: updatedProfile,
      };
    } catch (err) {
      console.error('[profileService] Error updating complete profile:', err);
      throw err;
    }
  }
};