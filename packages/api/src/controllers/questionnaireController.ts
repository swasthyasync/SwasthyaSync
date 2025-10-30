// packages/api/src/controllers/questionnaireController.ts
import { Request, Response } from 'express';
import { supabaseService as supabase } from '../db/supabaseClient';
import crypto from 'crypto';
import fetch, { Response as FetchResponse } from 'node-fetch';

// Type definitions (kept similar to yours)
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

const memoryQuestionnaireStore = new Map<string, QuestionnaireData>();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 10000): Promise<FetchResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const questionnaireController = {
  async submitQuestionnaire(req: Request, res: Response) {
    try {
      const bodyUserId = req.body?.userId ? String(req.body.userId) : null;
      const authUserId = (req as any).user?.id ? String((req as any).user.id) : null;
      const userId = bodyUserId || authUserId;

      const answers = req.body?.answers;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Answers array is required' });
      }

      // Basic validation & normalization of answers to avoid null/undefined fields
      const validAnswers = answers
        .filter(a => a && typeof a.questionId === 'string' && typeof a.optionId === 'string')
        .map(a => ({
          questionId: String(a.questionId),
          optionId: String(a.optionId),
          trait: (a.trait ? String(a.trait) : '').toLowerCase(),
          weight: Number(a.weight) || 0,
          ...(a.value !== undefined ? { value: a.value } : {}),
          ...(a.text !== undefined ? { text: a.text } : {})
        }));

      if (validAnswers.length === 0) {
        return res.status(400).json({ error: 'No valid answers found' });
      }

      console.log('📥 Submitting questionnaire for user:', userId, 'answers:', validAnswers.length);

      // --- Call ML Service (safe) ---
      let mlPrediction: any = null;
      try {
        const mlResponse = await fetchWithTimeout(
          `${ML_SERVICE_URL}/predict`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: validAnswers }) },
          15000
        );

        if (!mlResponse.ok) {
          // log body for debugging
          const text = await mlResponse.text().catch(() => '<no body>');
          console.warn(`ML service returned non-ok (${mlResponse.status}):`, text);
          throw new Error(`ML service ${mlResponse.status}`);
        }

        mlPrediction = await mlResponse.json();
        console.log('📡 ML response shape:', typeof mlPrediction, Object.keys(mlPrediction || {}).slice(0, 10));
      } catch (mlError) {
        console.warn('⚠️ ML service failed or returned unexpected shape, falling back', mlError && (mlError as any).message);
        const basicScores = calculatePrakritiScores(validAnswers);
        const dominantFallback = Object.keys(basicScores).reduce((a, b) => (basicScores as any)[a] > (basicScores as any)[b] ? a : b);
        mlPrediction = { prakriti: { ...basicScores, dominant: dominantFallback }, confidence: 0.5, fallback: true };
      }

      // --- Build scores safely from ML output (handle multiple shapes) ---
      const prakritiData = mlPrediction?.prakriti || {};
      const safeNum = (v: any) => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };

      const vataVal = safeNum(prakritiData?.percentages?.vata ?? (prakritiData?.probabilities?.vata ? prakritiData.probabilities.vata * 100 : prakritiData?.vata));
      const pittaVal = safeNum(prakritiData?.percentages?.pitta ?? (prakritiData?.probabilities?.pitta ? prakritiData.probabilities.pitta * 100 : prakritiData?.pitta));
      const kaphaVal = safeNum(prakritiData?.percentages?.kapha ?? (prakritiData?.probabilities?.kapha ? prakritiData.probabilities.kapha * 100 : prakritiData?.kapha));

      const scores = { vata: vataVal || 0, pitta: pittaVal || 0, kapha: kaphaVal || 0 };

      // Ensure dominant is a string
      let dominant = (prakritiData?.predicted ?? prakritiData?.dominant) || Object.keys(scores).reduce((a, b) => (scores as any)[a] > (scores as any)[b] ? a : b);
      if (dominant === null || dominant === undefined) dominant = '';
      dominant = String(dominant);

      const total = scores.vata + scores.pitta + scores.kapha;
      const percent = total > 0
        ? { vata: Math.round((scores.vata / total) * 100), pitta: Math.round((scores.pitta / total) * 100), kapha: Math.round((scores.kapha / total) * 100) }
        : { vata: 33, pitta: 33, kapha: 34 };

      const mentalHealthScore = calculateMentalHealthScore(validAnswers);
      const questionnaireId = crypto.randomUUID();
      const now = new Date().toISOString();

      const questionnaireData: QuestionnaireData = {
        id: questionnaireId,
        user_id: userId,
        answers: validAnswers,
        scores: { ...scores, dominant, percent },
        dominant,
        mental_health_score: {
          score: mentalHealthScore,
          level: mentalHealthScore >= 70 ? 'green' : mentalHealthScore >= 40 ? 'yellow' : 'red'
        },
        created_at: now,
        updated_at: now
      };

      // --- Insert into DB (use normalized answers) ---
      try {
        const insertPayload = {
          id: questionnaireData.id,
          user_id: questionnaireData.user_id,
          questionnaire_type: 'prakriti',
          answers: JSON.stringify(questionnaireData.answers),
          scores: JSON.stringify(questionnaireData.scores),
          mental_health_score: JSON.stringify(questionnaireData.mental_health_score),
          ml_predictions: JSON.stringify(mlPrediction || null),
          confidence_score: typeof mlPrediction?.confidence === 'number' ? mlPrediction.confidence : null,
          final_prakriti_assessment: dominant || null,
          completed_at: now,
          created_at: now,
          updated_at: now
        };

        console.log('📥 Inserting questionnaire into DB for user', userId);

        const { data, error } = await supabase.from('questionnaire_answers').insert(insertPayload).select().single();

        if (error) {
          console.error('❌ Supabase insert error:', JSON.stringify(error, null, 2));
          if (error.code === '23503') {
            console.error('❌ Foreign key violation: user_id not found in users table:', insertPayload.user_id);
          }
          throw new Error(error.message || 'Insert failed');
        }

        console.log('✅ Questionnaire saved, id:', data.id);

        // Update user status (defensive)
        try {
          await supabase.from('users').update({
            questionnaire_completed: true,
            onboarding_completed: true,
            updated_at: now
          }).eq('id', userId);
        } catch (uerr) {
          console.warn('Could not update user onboarding status:', uerr);
        }

        return res.json({
          success: true,
          questionnaire: {
            id: data.id,
            scores: questionnaireData.scores,
            dominant,
            mental_health: questionnaireData.mental_health_score,
            ml_confidence: mlPrediction?.confidence || 0.5,
            prediction_source: mlPrediction?.fallback ? 'fallback_calculation' : 'ml_service',
            recommendations: generateBasicRecommendations(dominant)
          },
          message: 'Questionnaire submitted successfully!'
        });
      } catch (dbError: any) {
        console.warn('⚠️ DB insert failed, falling back to memory store:', dbError?.message || dbError);
        memoryQuestionnaireStore.set(questionnaireId, questionnaireData);
        return res.json({
          success: true,
          questionnaire: questionnaireData,
          message: 'Questionnaire saved in memory (DB unavailable)'
        });
      }
    } catch (error: any) {
      console.error('❌ Questionnaire submission error:', error);
      return res.status(500).json({ error: 'Failed to submit questionnaire', details: error?.message });
    }
  },

  // (keep or implement other methods as before)
 // ADD this method to the questionnaireController object:
async getQuestionnaire(req: Request, res: Response) {
  try {
    const userId = req.params.userId || (req as any).user?.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('Getting questionnaire for user:', userId);

    const { data, error } = await supabase
      .from('questionnaire_answers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ success: false, message: 'No questionnaire found' });
    }

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      questionnaire: {
        id: data.id,
        scores: JSON.parse(data.scores || '{}'),
        dominant: data.final_prakriti_assessment,
        mental_health: JSON.parse(data.mental_health_score || '{}'),
        created_at: data.created_at
      }
    });
  } catch (error: any) {
    console.error('Get questionnaire error:', error);
    return res.status(500).json({ error: 'Failed to get questionnaire' });
  }
},

async getQuestionnaireStatus(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .from('questionnaire_answers')
      .select('id, created_at, final_prakriti_assessment')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      completed: data.length > 0,
      questionnaire: data.length > 0 ? data[0] : null
    });
  } catch (error: any) {
    console.error('Get questionnaire status error:', error);
    return res.status(500).json({ error: 'Failed to get questionnaire status' });
  }
}
};

// --- Utility functions ---
function calculatePrakritiScores(answers: any[]) {
  const scores = { vata: 0, pitta: 0, kapha: 0 };
  for (const a of answers || []) {
    const trait = (a.trait || '').toString().toLowerCase();
    const weight = Number(a.weight) || 0;
    if (trait === 'vata') scores.vata += weight;
    else if (trait === 'pitta') scores.pitta += weight;
    else if (trait === 'kapha') scores.kapha += weight;
  }
  return scores.vata + scores.pitta + scores.kapha > 0 ? scores : { vata: 1, pitta: 1, kapha: 1 };
}

function calculateMentalHealthScore(answers: any[]) {
  let score = 50;
  for (const a of answers || []) {
    if (String(a.questionId || '').toLowerCase().includes('stress') && (Number(a.weight) || 0) <= 1) score -= 15;
    if (String(a.questionId || '').toLowerCase().includes('sleep') && (String(a.trait || '').toLowerCase() === 'vata')) score -= 10;
  }
  return Math.max(10, Math.min(100, score));
}

function generateBasicRecommendations(dominant: any) {
  const d = String(dominant || '').toLowerCase();
  if (!d) return { dietary: [], lifestyle: [], exercise: [], meditation: [] };
  switch (d) {
    case 'vata': return { dietary: ['Warm foods'], lifestyle: ['Regular sleep'], exercise: ['Gentle yoga'], meditation: ['Grounding practices'] };
    case 'pitta': return { dietary: ['Cooling foods'], lifestyle: ['Avoid heat'], exercise: ['Swimming'], meditation: ['Cooling meditation'] };
    case 'kapha': return { dietary: ['Light, spicy foods'], lifestyle: ['Stay active'], exercise: ['Cardio'], meditation: ['Energizing practices'] };
    default: return { dietary: ['Balanced diet'], lifestyle: ['Balance activity'], exercise: ['Variety'], meditation: ['Mindfulness'] };
  }
}

export default questionnaireController;
