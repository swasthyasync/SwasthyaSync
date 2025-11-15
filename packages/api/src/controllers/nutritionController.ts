// packages/api/src/controllers/nutritionController.ts
import { Request, Response } from 'express';
import { nutritionService, FoodItem, DietRecommendation, MealLog, NutritionFeedback, DietitianRecommendation } from '../services/nutritionService';
import { authMiddleware } from '../middlewares/authMiddleware';

// Get food items with optional filtering
export const getFoodItems = async (req: Request, res: Response) => {
  try {
    const filters = {
      food_group: req.query.food_group as string,
      dosha_effect: req.query.dosha_effect as string,
      rasa: req.query.rasa as string,
      searchTerm: req.query.search as string
    };

    const foodItems = await nutritionService.getFoodItems(filters);
    return res.json(foodItems);
  } catch (error: any) {
    console.error('Error fetching food items:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get food items by dosha effect
export const getFoodsByDosha = async (req: Request, res: Response) => {
  try {
    const { dosha } = req.params;
    const { foodGroup } = req.query;
    
    if (!dosha) {
      return res.status(400).json({ error: 'Dosha parameter is required' });
    }
    
    const foodItems = await nutritionService.searchFoodsByDosha(dosha, foodGroup as string);
    return res.json(foodItems);
  } catch (error: any) {
    console.error('Error fetching foods by dosha:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get a specific food item by ID
export const getFoodItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const foodItem = await nutritionService.getFoodItemById(id);
    
    if (!foodItem) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    
    return res.json(foodItem);
  } catch (error: any) {
    console.error('Error fetching food item:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Generate a general diet plan based on user's Prakriti
export const generateGeneralDietPlan = async (req: Request, res: Response) => {
  try {
    const { prakritiType } = req.body;
    const userId = (req as any).user.id;
    
    if (!prakritiType) {
      return res.status(400).json({ error: 'Prakriti type is required' });
    }
    
    const dietPlan = await nutritionService.generateGeneralDietPlan(prakritiType, userId);
    return res.json(dietPlan);
  } catch (error: any) {
    console.error('Error generating diet plan:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Save a diet recommendation
export const saveDietRecommendation = async (req: Request, res: Response) => {
  try {
    const dietRec: DietRecommendation = req.body;
    dietRec.user_id = (req as any).user.id;
    dietRec.created_by = (req as any).user.id;
    
    const savedRec = await nutritionService.saveDietRecommendation(dietRec);
    return res.status(201).json(savedRec);
  } catch (error: any) {
    console.error('Error saving diet recommendation:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get diet recommendations for the current user
export const getUserDietRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const recommendations = await nutritionService.getUserDietRecommendations(userId);
    return res.json(recommendations);
  } catch (error: any) {
    console.error('Error fetching user diet recommendations:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Log a meal
export const logMeal = async (req: Request, res: Response) => {
  try {
    const mealLog: MealLog = req.body;
    mealLog.user_id = (req as any).user.id;
    
    const loggedMeal = await nutritionService.logMeal(mealLog);
    return res.status(201).json(loggedMeal);
  } catch (error: any) {
    console.error('Error logging meal:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get meal logs for the current user
export const getUserMealLogs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
    
    const mealLogs = await nutritionService.getUserMealLogs(userId, limit);
    return res.json(mealLogs);
  } catch (error: any) {
    console.error('Error fetching user meal logs:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Submit nutrition feedback
export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const feedback: NutritionFeedback = req.body;
    feedback.user_id = (req as any).user.id;
    
    const submittedFeedback = await nutritionService.submitFeedback(feedback);
    return res.status(201).json(submittedFeedback);
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Save dietitian recommendation (practitioner only)
export const saveDietitianRecommendation = async (req: Request, res: Response) => {
  try {
    const rec: DietitianRecommendation = req.body;
    rec.practitioner_id = (req as any).user.id;
    
    // Verify the practitioner is authorized to create recommendations for this user
    // In a real implementation, you would check if the practitioner-patient relationship exists
    
    const savedRec = await nutritionService.saveDietitianRecommendation(rec);
    return res.status(201).json(savedRec);
  } catch (error: any) {
    console.error('Error saving dietitian recommendation:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get dietitian recommendations for the current user
export const getUserDietitianRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const recommendations = await nutritionService.getUserDietitianRecommendations(userId);
    return res.json(recommendations);
  } catch (error: any) {
    console.error('Error fetching user dietitian recommendations:', error);
    return res.status(500).json({ error: error.message });
  }
};