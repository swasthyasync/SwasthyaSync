// apps/web/src/services/nutritionService.ts
import { supabase } from '../utils/supabase';

interface FoodItem {
  id: string;
  name_en: string;
  name_sanskrit: string;
  food_group: string;
  calories_per_100g: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  vitamins: string[];
  minerals: string[];
  rasa: string[];
  virya: string;
  vipaka: string;
  guna: string[];
  dosha_effect: string[];
  seasonal_suitability: string[];
  digestion_level: string;
  region_common: string[];
  contraindications: string[];
  suggested_combinations: string[];
  therapeutic_uses: string[];
  recommended_portion: string;
  created_at: string;
  updated_at: string;
}

interface DietRecommendation {
  id: string;
  user_id: string;
  prakriti_type: string;
  recommendations: any;
  foods_to_favor: any;
  foods_to_avoid: any;
  meal_timing: any;
  created_by: string;
  valid_from: string;
  valid_to: string;
  recommendation_type: 'general' | 'practitioner';
  source_therapy_id: string;
  effectiveness_score: number;
  created_at: string;
  updated_at: string;
}

interface MealLog {
  id: string;
  user_id: string;
  food_item_id: string;
  quantity: number;
  unit: string;
  meal_type: string;
  logged_at: string;
  notes: string;
  created_at: string;
}

interface NutritionFeedback {
  id: string;
  user_id: string;
  diet_recommendation_id: string;
  food_item_id: string;
  effectiveness_score: number;
  symptoms_improved: string[];
  symptoms_worsened: string[];
  notes: string;
  logged_at: string;
  created_at: string;
}

interface DietitianRecommendation {
  id: string;
  user_id: string;
  practitioner_id: string;
  general_diet_plan: any;
  personalized_recommendations: any;
  foods_to_favor: any;
  foods_to_avoid: any;
  meal_timing: any;
  notes: string;
  valid_from: string;
  valid_to: string;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Helper function to get access token
const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export const nutritionService = {
  // Food items API
  async getFoodItems(filters?: {
    food_group?: string;
    dosha_effect?: string;
    rasa?: string;
    searchTerm?: string;
  }): Promise<FoodItem[]> {
    try {
      let url = `${API_BASE_URL}/nutrition/foods`;
      
      const params = new URLSearchParams();
      if (filters?.food_group) params.append('food_group', filters.food_group);
      if (filters?.dosha_effect) params.append('dosha_effect', filters.dosha_effect);
      if (filters?.rasa) params.append('rasa', filters.rasa);
      if (filters?.searchTerm) params.append('search', filters.searchTerm);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching food items:', error);
      throw error;
    }
  },

  async getFoodItemById(id: string): Promise<FoodItem | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/nutrition/foods/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching food item:', error);
      throw error;
    }
  },

  // Diet recommendations API
  async generateGeneralDietPlan(prakritiType: string): Promise<DietRecommendation> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/nutrition/diet/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prakritiType })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating diet plan:', error);
      throw error;
    }
  },

  async saveDietRecommendation(dietRec: Partial<DietRecommendation>): Promise<DietRecommendation> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/nutrition/diet/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dietRec)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving diet recommendation:', error);
      throw error;
    }
  },

  async getUserDietRecommendations(): Promise<DietRecommendation[]> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/nutrition/diet/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user diet recommendations:', error);
      throw error;
    }
  },

  // Meal logging API
  async logMeal(mealLog: Partial<MealLog>): Promise<MealLog> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/nutrition/meals/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mealLog)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error logging meal:', error);
      throw error;
    }
  },

  async getUserMealLogs(limit: number = 30): Promise<MealLog[]> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/nutrition/meals/logs?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user meal logs:', error);
      throw error;
    }
  },

  // Feedback API
  async submitFeedback(feedback: Partial<NutritionFeedback>): Promise<NutritionFeedback> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/nutrition/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(feedback)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  // Dietitian recommendations API
  async saveDietitianRecommendation(rec: Partial<DietitianRecommendation>): Promise<DietitianRecommendation> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/nutrition/dietitian/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(rec)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving dietitian recommendation:', error);
      throw error;
    }
  },

  async getUserDietitianRecommendations(): Promise<DietitianRecommendation[]> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/nutrition/dietitian/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user dietitian recommendations:', error);
      throw error;
    }
  }
};