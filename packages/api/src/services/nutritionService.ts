// packages/api/src/services/nutritionService.ts
import { supabase } from '../db/supabaseClient';

export interface FoodItem {
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
}

export interface DietRecommendation {
  id?: string;
  user_id: string;
  prakriti_type: string;
  recommendations: any;
  foods_to_favor: any;
  foods_to_avoid: any;
  meal_timing: any;
  created_by?: string;
  valid_from?: string;
  valid_to?: string;
  recommendation_type: 'general' | 'practitioner';
  source_therapy_id?: string;
  effectiveness_score?: number;
}

export interface MealLog {
  id?: string;
  user_id: string;
  food_item_id: string;
  quantity: number;
  unit: string;
  meal_type: string;
  logged_at: string;
  notes?: string;
}

export interface NutritionFeedback {
  id?: string;
  user_id: string;
  diet_recommendation_id?: string;
  food_item_id?: string;
  effectiveness_score: number;
  symptoms_improved: string[];
  symptoms_worsened: string[];
  notes?: string;
}

export interface DietitianRecommendation {
  id?: string;
  user_id: string;
  practitioner_id: string;
  general_diet_plan: any;
  personalized_recommendations: any;
  foods_to_favor: any;
  foods_to_avoid: any;
  meal_timing: any;
  notes?: string;
  valid_from?: string;
  valid_to?: string;
}

export const nutritionService = {
  // Get food items with filtering capabilities
  async getFoodItems(filters?: {
    food_group?: string;
    dosha_effect?: string;
    rasa?: string;
    searchTerm?: string;
  }): Promise<FoodItem[]> {
    let query = supabase.from('food_items').select('*');
    
    if (filters?.food_group) {
      query = query.eq('food_group', filters.food_group);
    }
    
    if (filters?.dosha_effect) {
      query = query.contains('dosha_effect', [filters.dosha_effect]);
    }
    
    if (filters?.rasa) {
      query = query.contains('rasa', [filters.rasa]);
    }
    
    if (filters?.searchTerm) {
      query = query.or(`name_en.ilike.%${filters.searchTerm}%,name_sanskrit.ilike.%${filters.searchTerm}%`);
    }
    
    const { data, error } = await query.limit(100);
    
    if (error) {
      throw new Error(`Failed to fetch food items: ${error.message}`);
    }
    
    return data as FoodItem[];
  },

  // Search foods by dosha effect
  async searchFoodsByDosha(dosha: string, foodGroup?: string): Promise<FoodItem[]> {
    let query = supabase.from('food_items').select('*');
    
    // Filter by dosha effect (e.g., "Reduces Vata", "Balances Pitta")
    if (dosha) {
      query = query.contains('dosha_effect', [dosha]);
    }
    
    // Optional filter by food group
    if (foodGroup && foodGroup !== 'All Food Groups') {
      query = query.eq('food_group', foodGroup);
    }
    
    const { data, error } = await query.limit(50);
    
    if (error) {
      throw new Error(`Failed to search foods by dosha: ${error.message}`);
    }
    
    return data as FoodItem[];
  },

  // Get a specific food item by ID
  async getFoodItemById(id: string): Promise<FoodItem | null> {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch food item: ${error.message}`);
    }
    
    return data as FoodItem;
  },

  // Generate a general diet plan based on Prakriti assessment
  async generateGeneralDietPlan(prakritiType: string, userId: string): Promise<DietRecommendation> {
    // This would typically call an ML model or use rule-based logic
    // For now, we'll use the existing logic from prakritiService
    
    const recommendations = this.getPrakritiBasedRecommendations(prakritiType);
    
    const dietPlan: DietRecommendation = {
      user_id: userId,
      prakriti_type: prakritiType,
      recommendations: recommendations.general_guidelines,
      foods_to_favor: recommendations.foods_to_favor,
      foods_to_avoid: recommendations.foods_to_avoid,
      meal_timing: recommendations.meal_timing,
      recommendation_type: 'general'
    };
    
    return dietPlan;
  },

  // Save a diet recommendation to the database
  async saveDietRecommendation(dietRec: DietRecommendation): Promise<DietRecommendation> {
    const { data, error } = await supabase
      .from('diet_recommendations')
      .insert([{
        user_id: dietRec.user_id,
        prakriti_type: dietRec.prakriti_type,
        recommendations: dietRec.recommendations,
        foods_to_favor: dietRec.foods_to_favor,
        foods_to_avoid: dietRec.foods_to_avoid,
        meal_timing: dietRec.meal_timing,
        created_by: dietRec.created_by,
        valid_from: dietRec.valid_from,
        valid_to: dietRec.valid_to,
        recommendation_type: dietRec.recommendation_type,
        source_therapy_id: dietRec.source_therapy_id,
        effectiveness_score: dietRec.effectiveness_score
      }])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save diet recommendation: ${error.message}`);
    }
    
    return data as DietRecommendation;
  },

  // Get diet recommendations for a user
  async getUserDietRecommendations(userId: string): Promise<DietRecommendation[]> {
    const { data, error } = await supabase
      .from('diet_recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch user diet recommendations: ${error.message}`);
    }
    
    return data as DietRecommendation[];
  },

  // Log a meal for a user
  async logMeal(mealLog: MealLog): Promise<MealLog> {
    const { data, error } = await supabase
      .from('meal_logs')
      .insert([{
        user_id: mealLog.user_id,
        food_item_id: mealLog.food_item_id,
        quantity: mealLog.quantity,
        unit: mealLog.unit,
        meal_type: mealLog.meal_type,
        logged_at: mealLog.logged_at,
        notes: mealLog.notes
      }])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to log meal: ${error.message}`);
    }
    
    return data as MealLog;
  },

  // Get meal logs for a user
  async getUserMealLogs(userId: string, limit: number = 30): Promise<MealLog[]> {
    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to fetch user meal logs: ${error.message}`);
    }
    
    return data as MealLog[];
  },

  // Submit nutrition feedback
  async submitFeedback(feedback: NutritionFeedback): Promise<NutritionFeedback> {
    const { data, error } = await supabase
      .from('nutrition_feedback')
      .insert([{
        user_id: feedback.user_id,
        diet_recommendation_id: feedback.diet_recommendation_id,
        food_item_id: feedback.food_item_id,
        effectiveness_score: feedback.effectiveness_score,
        symptoms_improved: feedback.symptoms_improved,
        symptoms_worsened: feedback.symptoms_worsened,
        notes: feedback.notes
      }])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to submit nutrition feedback: ${error.message}`);
    }
    
    return data as NutritionFeedback;
  },

  // Save dietitian recommendation
  async saveDietitianRecommendation(rec: DietitianRecommendation): Promise<DietitianRecommendation> {
    const { data, error } = await supabase
      .from('dietitian_recommendations')
      .insert([{
        user_id: rec.user_id,
        practitioner_id: rec.practitioner_id,
        general_diet_plan: rec.general_diet_plan,
        personalized_recommendations: rec.personalized_recommendations,
        foods_to_favor: rec.foods_to_favor,
        foods_to_avoid: rec.foods_to_avoid,
        meal_timing: rec.meal_timing,
        notes: rec.notes,
        valid_from: rec.valid_from,
        valid_to: rec.valid_to
      }])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save dietitian recommendation: ${error.message}`);
    }
    
    return data as DietitianRecommendation;
  },

  // Get dietitian recommendations for a user
  async getUserDietitianRecommendations(userId: string): Promise<DietitianRecommendation[]> {
    const { data, error } = await supabase
      .from('dietitian_recommendations')
      .select(`
        *,
        practitioner:profiles!dietitian_recommendations_practitioner_id_fkey(first_name, last_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch user dietitian recommendations: ${error.message}`);
    }
    
    return data as DietitianRecommendation[];
  },

  // Prakriti-based diet recommendations (adapted from prakritiService)
  getPrakritiBasedRecommendations(prakritiType: string) {
    const recommendations: any = {
      vata: {
        general_guidelines: [
          'Favor warm, cooked, and easy-to-digest foods',
          'Include healthy fats and oils in your diet',
          'Eat at regular times',
          'Avoid cold, dry, and raw foods'
        ],
        foods_to_favor: {
          grains: ['Rice', 'Wheat', 'Oats (cooked)', 'Quinoa'],
          vegetables: ['Sweet potatoes', 'Carrots', 'Beets', 'Asparagus', 'Cucumber'],
          fruits: ['Bananas', 'Avocados', 'Mangoes', 'Papayas', 'Sweet oranges'],
          proteins: ['Chicken', 'Fish', 'Eggs', 'Mung dal', 'Tofu'],
          dairy: ['Warm milk', 'Ghee', 'Butter', 'Cheese', 'Yogurt (in moderation)'],
          spices: ['Ginger', 'Cinnamon', 'Cardamom', 'Cumin', 'Black pepper']
        },
        foods_to_avoid: {
          general: ['Cold foods', 'Dry snacks', 'Raw vegetables', 'Carbonated drinks'],
          specific: ['Popcorn', 'Crackers', 'Raw apples', 'Cabbage', 'Beans']
        },
        meal_timing: {
          breakfast: '7:00 - 8:00 AM',
          lunch: '12:00 - 1:00 PM',
          dinner: '6:00 - 7:00 PM',
          notes: 'Avoid skipping meals. Have warm milk before bed.'
        }
      },
      pitta: {
        general_guidelines: [
          'Favor cool, refreshing foods',
          'Avoid spicy, sour, and salty foods',
          'Eat at moderate temperatures',
          'Include sweet, bitter, and astringent tastes'
        ],
        foods_to_favor: {
          grains: ['Basmati rice', 'Wheat', 'Oats', 'Barley'],
          vegetables: ['Cucumber', 'Lettuce', 'Broccoli', 'Cauliflower', 'Zucchini'],
          fruits: ['Sweet grapes', 'Melons', 'Pears', 'Sweet apples', 'Coconut'],
          proteins: ['Chicken (white meat)', 'Fish (freshwater)', 'Mung beans', 'Tofu'],
          dairy: ['Milk', 'Butter', 'Ghee', 'Soft cheese', 'Ice cream (occasionally)'],
          spices: ['Coriander', 'Fennel', 'Mint', 'Turmeric', 'Small amounts of cumin']
        },
        foods_to_avoid: {
          general: ['Hot spices', 'Sour foods', 'Fermented foods', 'Fried foods'],
          specific: ['Chili peppers', 'Tomatoes', 'Vinegar', 'Alcohol', 'Coffee']
        },
        meal_timing: {
          breakfast: '7:30 - 8:30 AM',
          lunch: '12:00 - 1:00 PM (largest meal)',
          dinner: '6:00 - 7:00 PM',
          notes: 'Never skip meals, especially lunch. Avoid eating when angry.'
        }
      },
      kapha: {
        general_guidelines: [
          'Favor light, warm, and spicy foods',
          'Minimize heavy, oily, and sweet foods',
          'Include pungent, bitter, and astringent tastes',
          'Avoid overeating and snacking'
        ],
        foods_to_favor: {
          grains: ['Barley', 'Millet', 'Buckwheat', 'Corn', 'Rye'],
          vegetables: ['Leafy greens', 'Broccoli', 'Cabbage', 'Peppers', 'Onions'],
          fruits: ['Apples', 'Pears', 'Pomegranates', 'Cranberries', 'Apricots'],
          proteins: ['Chicken', 'Turkey', 'Most beans and lentils', 'Small amounts of egg whites'],
          dairy: ['Low-fat milk', 'Small amounts of ghee', 'Goat milk products'],
          spices: ['All spices, especially ginger', 'Black pepper', 'Turmeric', 'Chili']
        },
        foods_to_avoid: {
          general: ['Heavy foods', 'Fried foods', 'Excessive sweets', 'Cold foods'],
          specific: ['Red meat', 'Wheat', 'Most dairy', 'Bananas', 'Coconut']
        },
        meal_timing: {
          breakfast: 'Light or skip if not hungry',
          lunch: '12:00 - 1:00 PM (main meal)',
          dinner: '6:00 - 7:00 PM (light)',
          notes: 'Can benefit from intermittent fasting. Avoid snacking.'
        }
      }
    };

    const prakriti = (prakritiType || '').toLowerCase();
    return recommendations[prakriti] || recommendations.vata;
  }
};