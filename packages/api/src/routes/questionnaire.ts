// packages/api/src/routes/questionnaire.ts - COMPLETE UPDATED VERSION
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { supabase } from '../db/supabaseClient';
import { prakritiService } from '../services/prakritiService';

const router = Router();

// ML Service URL - adjust port if needed
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Utility wrapper to catch async errors and forward to Express error handler
 */
const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /questionnaire/latest - Get latest questionnaire results for user
 */
router.get('/latest', asyncHandler(async (req: Request, res: Response) => {
  console.log('GET /latest - Headers:', req.headers);
  console.log('GET /latest - User:', req.user);
  
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  
  console.log(`Fetching latest questionnaire for user: ${userId}`);

  try {
    // Fetch the latest questionnaire answers from Supabase
    const { data: results, error } = await supabase
      .from('questionnaire_answers')
      .select('scores, created_at, mental_health_score, dominant, questionnaire_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    if (!results) {
      return res.status(404).json({ error: 'No questionnaire results found' });
    }

    return res.json({
      scores: results.scores,
      dominant: results.dominant,
      mentalHealth: results.mental_health_score,
      questionnaire_type: results.questionnaire_type,
      created_at: results.created_at
    });
  } catch (error: any) {
    console.error('Error fetching questionnaire results:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch questionnaire results',
      details: error.message || 'Unknown error',
      code: error.code
    });
  }
}));

/**
 * POST /questionnaire/submit - Submit questionnaire answers with ML prediction
 */
router.post('/submit', asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, answers, questionnaire_type = 'prakriti' } = req.body;
    console.log(`📥 Submitting questionnaire for user: ${userId} answers: ${answers?.length} type: ${questionnaire_type}`);

    // Validate input
    if (!userId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ 
        error: 'User ID and answers array are required' 
      });
    }

    if (!['prakriti', 'mental_health'].includes(questionnaire_type)) {
      return res.status(400).json({
        error: 'Invalid questionnaire type. Must be either "prakriti" or "mental_health"'
      });
    }

    // Step 1: Call ML service for prediction
    let mlPrediction: any = null;
    let mlServiceResponse: any = null;

    try {
      // Format answers for ML service
      // Format answers for ML service
      const mlAnswers = answers.reduce((acc: any[], a: any) => {
        if (a.trait) {
          acc.push({
            trait: a.trait,
            weight: parseFloat(a.weight) || 1
          });
        }
        return acc;
      }, []);

      console.log(`🤖 Calling ML service at ${ML_SERVICE_URL}/predict`);
      const mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          answers: mlAnswers
        }),
      });

      if (mlResponse.ok) {
        mlServiceResponse = await mlResponse.json();
        console.log(`📡 ML response received:`, JSON.stringify(mlServiceResponse, null, 2));
        
        // Extract ML prediction from response
        if (mlServiceResponse?.prakriti?.ml_prediction) {
          mlPrediction = mlServiceResponse.prakriti.ml_prediction;
        }
      } else {
        console.warn(`⚠️ ML service returned status ${mlResponse.status}`);
      }
    } catch (mlError) {
      console.error('❌ ML service error:', mlError);
      // Continue without ML prediction
    }

    // Step 2: Calculate traditional Prakriti scores
    const prakritiScores = prakritiService.calculateScores(answers);
    const mentalHealthScore = prakritiService.calculateMentalHealth(answers);
    
    console.log('📊 Traditional scores calculated:', prakritiScores);

    // Step 3: Merge ML prediction with traditional calculation
    let finalDominant = prakritiScores.dominant;
    let finalPercent = prakritiScores.percent;
    let confidenceScore = 0.75; // Default confidence

    // Use ML prediction if available and confident
    type PrakritiType = 'vata' | 'pitta' | 'kapha';

    interface MLPrediction {
      confidence?: number;
      predicted?: PrakritiType;
      dominant?: PrakritiType;
      percent?: {
        vata: number;
        pitta: number;
        kapha: number;
      };
    }

    let mlData: MLPrediction | null = null;
    if (mlServiceResponse?.prakriti?.ml_prediction) {
      mlData = mlServiceResponse.prakriti.ml_prediction as MLPrediction;
      console.log('✅ Using ML prediction:', mlData);
      if (mlData?.confidence && mlData.confidence > confidenceScore) {
        confidenceScore = mlData.confidence;
        if (mlData.predicted && ['vata', 'pitta', 'kapha'].includes(mlData.predicted)) {
          finalDominant = mlData.predicted;
        }
      }
      
      // Update dominant if ML provides it
      if (mlData?.dominant && ['vata', 'pitta', 'kapha'].includes(mlData.dominant)) {
        finalDominant = mlData.dominant;
        console.log(`🎯 Using ML dominant: ${finalDominant}`);
      }
      
      // Update percentages if ML provides them
      if (mlData?.percent) {
        finalPercent = mlData.percent;
      }
      
      // Update confidence
      if (mlServiceResponse?.confidence) {
        confidenceScore = mlServiceResponse.confidence;
      }
    }

    // Step 4: Prepare final scores object
    const finalScores = {
      vata: prakritiScores.percent.vata / 100,
      pitta: prakritiScores.percent.pitta / 100,
      kapha: prakritiScores.percent.kapha / 100,
      dominant: finalDominant,
      percent: {
        vata: Math.round(prakritiScores.percent.vata),
        pitta: Math.round(prakritiScores.percent.pitta),
        kapha: Math.round(prakritiScores.percent.kapha)
      },
      ml_prediction: mlPrediction
    };

    // Step 5: Prepare ML predictions object for database
  const mlPredictionsData = mlPrediction || {
  predicted: finalDominant,
  confidence: confidenceScore,
  probabilities: {
    vata: (finalPercent?.vata ?? 0) / 100,
    pitta: (finalPercent?.pitta ?? 0) / 100,
    kapha: (finalPercent?.kapha ?? 0) / 100
  }
};


    // Step 6: Insert into database
    console.log(`💾 Saving questionnaire to database...`);
    const { data, error } = await supabase
      .from('questionnaire_answers')
      .insert([
        {
          user_id: userId,
          answers: answers,
          questionnaire_type: questionnaire_type,
          scores: finalScores,
          dominant: finalDominant,
          mental_health_score: mentalHealthScore,
          ml_predictions: mlPredictionsData,
          confidence_score: confidenceScore,
          final_prakriti_assessment: finalDominant,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Failed to save questionnaire: ${error.message}`);
    }

    console.log(`✅ Questionnaire saved successfully, id: ${data.id}`);

    // Step 7: Get diet recommendations
    const dietRecommendations = prakritiService.getDietRecommendations(finalDominant);

    // Step 8: Return comprehensive response
    return res.json({
      success: true,
      message: 'Questionnaire submitted successfully',
      questionnaire: {
        id: data.id,
        scores: {
          ...finalScores,
          ml_prediction: mlPredictionsData
        },
        dominant: finalDominant,
        mental_health: mentalHealthScore,
        recommendations: dietRecommendations,
        analysisMethod: mlPrediction ? 'hybrid' : 'traditional'
      }
    });
    
  } catch (error) {
    console.error('❌ Questionnaire submission error:', error);
    return res.status(500).json({
      error: 'Failed to submit questionnaire',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /questionnaire/me - Get current user's questionnaire
 */
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authMiddleware adds user to request
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`📋 Fetching questionnaire for user: ${userId}`);

    const { data, error } = await supabase
      .from('questionnaire_answers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Failed to fetch questionnaire: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        message: 'No questionnaire found',
        data: null
      });
    }

    const questionnaire = data[0];
    
    // Parse JSON fields if they're strings
    const parseJsonField = (field: any) => {
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    questionnaire.scores = parseJsonField(questionnaire.scores);
    questionnaire.mental_health_score = parseJsonField(questionnaire.mental_health_score);
    questionnaire.ml_predictions = parseJsonField(questionnaire.ml_predictions);

    return res.json({
      success: true,
      data: questionnaire
    });
    
  } catch (error) {
    console.error('❌ Error fetching questionnaire:', error);
    return res.status(500).json({
      error: 'Failed to fetch questionnaire',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /questionnaire/status - Get questionnaire completion status
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    // @ts-ignore - authMiddleware adds user to request
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { count, error } = await supabase
      .from('questionnaire_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Failed to check questionnaire status: ${error.message}`);
    }

    const hasCompleted = (count || 0) > 0;

    return res.json({
      success: true,
      data: {
        hasCompleted,
        completionCount: count || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking questionnaire status:', error);
    return res.status(500).json({
      error: 'Failed to check questionnaire status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /questionnaire/:userId - Get specific user's questionnaire
 * (Only accessible by the user themselves or admin)
 */
router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    // @ts-ignore - authMiddleware adds user to request
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user is accessing their own data or is an admin
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log(`📋 Fetching questionnaire for user: ${userId}`);

    const { data, error } = await supabase
      .from('questionnaire_answers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Failed to fetch questionnaire: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        message: 'No questionnaire found',
        data: null
      });
    }

    const questionnaire = data[0];
    
    // Parse JSON fields if they're strings
    const parseJsonField = (field: any) => {
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    questionnaire.scores = parseJsonField(questionnaire.scores);
    questionnaire.mental_health_score = parseJsonField(questionnaire.mental_health_score);
    questionnaire.ml_predictions = parseJsonField(questionnaire.ml_predictions);

    // Get diet recommendations based on dominant prakriti
    const dominant = questionnaire.dominant || questionnaire.final_prakriti_assessment || 'vata';
    const recommendations = prakritiService.getDietRecommendations(dominant);

    return res.json({
      success: true,
      data: {
        ...questionnaire,
        recommendations
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching questionnaire:', error);
    return res.status(500).json({
      error: 'Failed to fetch questionnaire',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * DELETE /questionnaire/:id - Delete a specific questionnaire
 * (Only accessible by the owner or admin)
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore - authMiddleware adds user to request
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // First, check if the questionnaire exists and belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('questionnaire_answers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Check if user owns this questionnaire or is an admin
    if (existing.user_id !== currentUser.id && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the questionnaire
    const { error } = await supabase
      .from('questionnaire_answers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Failed to delete questionnaire: ${error.message}`);
    }

    return res.json({
      success: true,
      message: 'Questionnaire deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting questionnaire:', error);
    return res.status(500).json({
      error: 'Failed to delete questionnaire',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;