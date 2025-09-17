// packages/api/src/controllers/questionnaireController.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabaseClient';
import crypto from 'crypto';
import fetch from 'node-fetch';

// Type definitions
interface QuestionnaireData {
  id: string;
  user_id: string;
  answers: any[];
  scores: {
    vata: number;
    pitta: number;
    kapha: number;
    dominant: string;
    percent: {
      vata: number;
      pitta: number;
      kapha: number;
    };
  };
  dominant: string;
  mental_health_score: {
    score: number;
    level: string;
  };
  created_at: string;
  updated_at: string;
}

// In-memory storage for questionnaire results
const memoryQuestionnaireStore = new Map<string, QuestionnaireData>();

// ML Service Configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const questionnaireController = {
  async submitQuestionnaire(req: Request, res: Response) {
    try {
      const { userId, answers } = req.body;

      if (!userId || !answers) {
        return res.status(400).json({ 
          error: 'User ID and answers are required' 
        });
      }

      console.log('Submitting questionnaire for user:', userId);
      console.log('Answers received:', answers.length, 'responses');

      // **NEW: Call ML Service for prediction**
      let mlPrediction: any = null;
      try {
        console.log('Calling ML service at:', `${ML_SERVICE_URL}/predict`);
        
        const mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
          method: 'POST',  // ← This fixes the 405 error
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ answers }),
        });

        if (!mlResponse.ok) {
          throw new Error(`ML Service returned ${mlResponse.status}: ${await mlResponse.text()}`);
        }

        mlPrediction = await mlResponse.json();
        console.log('ML Prediction received:', mlPrediction);

      } catch (mlError: any) {
        console.warn('ML Service failed, falling back to basic calculation:', mlError.message);
        
        // Fallback to basic calculation if ML fails
        const basicScores = calculatePrakritiScores(answers);
        const dominant = Object.keys(basicScores).reduce((a, b) => 
          basicScores[a] > basicScores[b] ? a : b
        );
        
        mlPrediction = {
          prakriti: {
            vata: basicScores.vata,
            pitta: basicScores.pitta,
            kapha: basicScores.kapha,
            dominant: dominant
          },
          confidence: 0.5 // Lower confidence for fallback
        };
      }

      // Process ML prediction results - FIXED FORMAT HANDLING
      const prakritiData = mlPrediction?.prakriti || {};
      
      // Handle different response formats from ML service
      let scores;
      if (prakritiData.percentages) {
        // New format from inference.py
        scores = {
          vata: prakritiData.percentages.vata || 0,
          pitta: prakritiData.percentages.pitta || 0,
          kapha: prakritiData.percentages.kapha || 0
        };
      } else if (prakritiData.probabilities) {
        // Convert probabilities to percentages
        scores = {
          vata: Math.round((prakritiData.probabilities.vata || 0) * 100),
          pitta: Math.round((prakritiData.probabilities.pitta || 0) * 100),
          kapha: Math.round((prakritiData.probabilities.kapha || 0) * 100)
        };
      } else {
        // Legacy format or fallback
        scores = {
          vata: prakritiData.vata || 0,
          pitta: prakritiData.pitta || 0,
          kapha: prakritiData.kapha || 0
        };
      }
      
      // Determine dominant prakriti
      const dominant = prakritiData.predicted || 
                      prakritiData.dominant || 
                      Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

      // Ensure percentages add up to 100
      const total = scores.vata + scores.pitta + scores.kapha;
      const percent = total > 0 ? {
        vata: Math.round((scores.vata / total) * 100),
        pitta: Math.round((scores.pitta / total) * 100),
        kapha: Math.round((scores.kapha / total) * 100)
      } : { vata: 33, pitta: 33, kapha: 34 };

      // Calculate mental health score (you can also send this to ML service later)
      const mentalHealthScore = calculateMentalHealthScore(answers);

      const questionnaireId = crypto.randomUUID();
      const now = new Date().toISOString();

      const questionnaireData: QuestionnaireData = {
        id: questionnaireId,
        user_id: userId,
        answers: answers,
        scores: {
          vata: scores.vata,
          pitta: scores.pitta,
          kapha: scores.kapha,
          dominant: dominant,
          percent: percent
        },
        dominant: dominant,
        mental_health_score: {
          score: mentalHealthScore,
          level: mentalHealthScore >= 70 ? 'green' : mentalHealthScore >= 40 ? 'yellow' : 'red'
        },
        created_at: now,
        updated_at: now
      };

      let result: QuestionnaireData | null = null;

      // Try database first
      try {
        const { data, error } = await supabase
          .from('questionnaire_answers')
          .insert(questionnaireData)
          .select()
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        result = data as QuestionnaireData;
        console.log('Questionnaire saved to database:', questionnaireId);

      } catch (dbError: any) {
        console.warn('Database save failed, using memory fallback:', dbError.message);
        
        // Fallback to memory storage
        memoryQuestionnaireStore.set(questionnaireId, questionnaireData);
        result = questionnaireData;
        console.log('Questionnaire saved to memory (fallback):', questionnaireId);
        console.warn('Using memory storage - will be lost on server restart!');
      }

      if (!result) {
        throw new Error('Failed to save questionnaire to both database and memory');
      }

      // Return the ML-calculated results
      return res.json({
        success: true,
        questionnaire: {
          id: result.id,
          scores: result.scores,
          dominant: result.dominant,
          mental_health: result.mental_health_score,
          ml_confidence: mlPrediction?.confidence || 0.5,
          prediction_source: mlPrediction ? 'ml_service' : 'fallback_calculation',
          // Additional ML details for debugging
          ml_raw_prediction: process.env.NODE_ENV === 'development' ? mlPrediction : undefined
        }
      });

    } catch (error: any) {
      console.error('Questionnaire submission error:', error);
      return res.status(500).json({
        error: 'Failed to submit questionnaire',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  },

  async getQuestionnaire(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      let questionnaire: QuestionnaireData | null = null;

      // Try database first
      try {
        const { data, error } = await supabase
          .from('questionnaire_answers')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          questionnaire = data as QuestionnaireData;
        }
      } catch (dbError) {
        console.warn('Database fetch failed, checking memory:', (dbError as any).message);
      }

      // Fallback to memory if not found in database
      if (!questionnaire) {
        for (const [id, q] of memoryQuestionnaireStore.entries()) {
          if (q.user_id === userId) {
            questionnaire = q;
            break;
          }
        }
      }

      if (!questionnaire) {
        return res.status(404).json({ 
          error: 'No questionnaire found for this user' 
        });
      }

      return res.json({
        success: true,
        questionnaire: questionnaire
      });

    } catch (error: any) {
      console.error('Get questionnaire error:', error);
      return res.status(500).json({
        error: 'Failed to fetch questionnaire',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  }
};

// Simplified scoring functions (used as fallback when ML service fails)
function calculatePrakritiScores(answers: any[]): { vata: number; pitta: number; kapha: number } {
  const scores = { vata: 0, pitta: 0, kapha: 0 };
  
  if (!Array.isArray(answers)) {
    console.warn('calculatePrakritiScores: answers is not an array, returning default scores');
    return { vata: 1, pitta: 1, kapha: 1 };
  }
  
  for (const answer of answers) {
    if (!answer || typeof answer !== 'object') {
      console.warn('Invalid answer object:', answer);
      continue;
    }
    
    const trait = answer.trait || 'vata'; // Default fallback
    const weight = typeof answer.weight === 'number' ? answer.weight : 1;
    
    if (trait === 'vata') scores.vata += weight;
    else if (trait === 'pitta') scores.pitta += weight;
    else if (trait === 'kapha') scores.kapha += weight;
  }
  
  // Ensure minimum scores
  if (scores.vata === 0 && scores.pitta === 0 && scores.kapha === 0) {
    scores.vata = scores.pitta = scores.kapha = 1;
  }
  
  return scores;
}

function calculateMentalHealthScore(answers: any[]): number {
  // Simplified mental health scoring based on stress-related questions
  let totalScore = 50; // Base score
  
  if (!Array.isArray(answers)) {
    console.warn('calculateMentalHealthScore: answers is not an array, returning default score');
    return 50;
  }
  
  for (const answer of answers) {
    if (!answer || typeof answer !== 'object') {
      continue;
    }
    
    const questionId = answer.questionId;
    const value = (answer.value || '').toString().toLowerCase();
    
    // Adjust score based on stress and sleep related answers
    if (questionId?.includes('stress') || questionId === 'q25') {
      if (value.includes('very well') || value.includes('excellent')) {
        totalScore += 15;
      } else if (value.includes('well') || value.includes('good')) {
        totalScore += 5;
      } else if (value.includes('not very well') || value.includes('poor')) {
        totalScore -= 10;
      } else if (value.includes('not at all') || value.includes('very poor')) {
        totalScore -= 20;
      }
    }
    
    if (questionId?.includes('sleep') || questionId === 'q7' || questionId === 'q8') {
      if (value.includes('sound') || value.includes('deep') || value.includes('restful')) {
        totalScore += 10;
      } else if (value.includes('light') || value.includes('interrupted') || value.includes('difficulty')) {
        totalScore -= 15;
      }
    }
  }
  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, totalScore));
}

export default questionnaireController;