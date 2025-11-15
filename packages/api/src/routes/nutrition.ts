// packages/api/src/routes/nutrition.ts
import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import * as nutritionController from '../controllers/nutritionController';

const router = express.Router();

// Public routes (if any)
// For now, all nutrition routes require authentication

// Food items routes
router.get('/foods', nutritionController.getFoodItems);
router.get('/foods/:id', nutritionController.getFoodItemById);
router.get('/foods/dosha/:dosha', nutritionController.getFoodsByDosha);

// Diet recommendation routes
router.post('/diet/generate', authMiddleware, nutritionController.generateGeneralDietPlan);
router.post('/diet/recommendations', authMiddleware, nutritionController.saveDietRecommendation);
router.get('/diet/recommendations', authMiddleware, nutritionController.getUserDietRecommendations);

// Meal logging routes
router.post('/meals/log', authMiddleware, nutritionController.logMeal);
router.get('/meals/logs', authMiddleware, nutritionController.getUserMealLogs);

// Feedback routes
router.post('/feedback', authMiddleware, nutritionController.submitFeedback);

// Dietitian recommendation routes
router.post('/dietitian/recommendations', authMiddleware, nutritionController.saveDietitianRecommendation);
router.get('/dietitian/recommendations', authMiddleware, nutritionController.getUserDietitianRecommendations);

export default router;