// apps/web/src/hooks/useQuestionnaire.ts - SUPABASE VERSION
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuthStandalone } from './useAuth';

interface Answer {
  questionId: string;
  optionId: string;
  trait: 'vata' | 'pitta' | 'kapha';
  weight: number;
  value?: string;
  text?: string;
}

interface QuestionnaireScores {
  vata: number;
  pitta: number;
  kapha: number;
  dominant: string;
  percent: {
    vata: number;
    pitta: number;
    kapha: number;
  };
}

interface MentalHealthScore {
  score: number;
  level: 'green' | 'yellow' | 'red';
}

interface QuestionnaireResult {
  id: string;
  scores: QuestionnaireScores;
  dominant: string;
  mental_health: MentalHealthScore;
  ml_confidence: number;
  prediction_source: string;
  recommendations?: any;
}

interface QuestionnaireStatus {
  completed: boolean;
  questionnaire?: {
    id: string;
    created_at: string;
    scores: QuestionnaireScores;
    dominant: string;
  };
}

export const useQuestionnaire = () => {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<QuestionnaireResult | null>(null);
  const [status, setStatus] = useState<QuestionnaireStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, updateUser } = useAuthStandalone();

  // Load questionnaire status on mount
  useEffect(() => {
    if (user?.id) {
      loadQuestionnaireStatus();
    }
  }, [user?.id]);

  const loadQuestionnaireStatus = async () => {
    try {
      setIsLoading(true);
      console.log('[useQuestionnaire] Loading questionnaire status for user:', user?.id);

      const response = await api.getQuestionnaire();
      
      if (response.success && response.questionnaire) {
        console.log('[useQuestionnaire] Questionnaire found:', response.questionnaire.id);
        setStatus({
          completed: true,
          questionnaire: response.questionnaire
        });
        setResult(response.questionnaire);
      } else {
        console.log('[useQuestionnaire] No questionnaire found for user');
        setStatus({
          completed: false
        });
      }
    } catch (err: any) {
      console.error('[useQuestionnaire] Error loading status:', err);
      
      // If 404, it means no questionnaire exists yet
      if (err.message?.includes('404')) {
        setStatus({
          completed: false
        });
      } else {
        setError(err.message || 'Failed to load questionnaire status');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addAnswer = (questionId: string, optionId: string, trait: 'vata' | 'pitta' | 'kapha', weight: number) => {
    setAnswers(prev => {
      // Remove any existing answer for this question
      const filtered = prev.filter(a => a.questionId !== questionId);
      // Add new answer
      return [...filtered, { questionId, optionId, trait, weight }];
    });
  };

  const removeAnswer = (questionId: string) => {
    setAnswers(prev => prev.filter(a => a.questionId !== questionId));
  };

  const getAnswer = (questionId: string): Answer | undefined => {
    return answers.find(a => a.questionId === questionId);
  };

  const clearAnswers = () => {
    setAnswers([]);
    setResult(null);
    setError(null);
  };

  const submitQuestionnaire = async (): Promise<QuestionnaireResult | null> => {
    if (!user?.id) {
      const errorMsg = 'User not authenticated. Please log in again.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    if (answers.length === 0) {
      const errorMsg = 'No answers to submit. Please answer some questions first.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useQuestionnaire] Submitting questionnaire for user:', user.id);
      console.log('[useQuestionnaire] Answers count:', answers.length);
      console.log('[useQuestionnaire] Sample answers:', answers.slice(0, 3));

      // Submit questionnaire with user ID and answers
      const response = await api.submitQuestionnaire(user.id, answers);

      if (response.success && response.questionnaire) {
        console.log('[useQuestionnaire] Questionnaire submitted successfully:', response.questionnaire.id);
        
        const questionnaireResult = response.questionnaire;
        setResult(questionnaireResult);
        
        // Update questionnaire status
        setStatus({
          completed: true,
          questionnaire: {
            id: questionnaireResult.id,
            created_at: new Date().toISOString(),
            scores: questionnaireResult.scores,
            dominant: questionnaireResult.dominant
          }
        });

        // Update user's completion status in Supabase database
        console.log('[useQuestionnaire] Updating user questionnaire completion status');
        try {
          // Use the updateUser function to update the completion status
          updateUser({
            questionnaire_completed: true,
            onboarding_completed: true
          });
        } catch (updateError) {
          console.warn('[useQuestionnaire] Failed to update user status:', updateError);
          // Don't throw here as the questionnaire submission was successful
        }

        return questionnaireResult;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('[useQuestionnaire] Submit error:', err);
      
      let errorMessage = 'Failed to submit questionnaire';
      
      if (err.message) {
        if (err.message.includes('403')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (err.message.includes('400')) {
          errorMessage = 'Invalid questionnaire data. Please check your answers.';
        } else if (err.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCurrentScores = (): QuestionnaireScores | null => {
    if (answers.length === 0) return null;

    const scores = { vata: 0, pitta: 0, kapha: 0 };
    
    answers.forEach(answer => {
      scores[answer.trait] += answer.weight;
    });

    const total = scores.vata + scores.pitta + scores.kapha;
    if (total === 0) {
      return {
        vata: 0,
        pitta: 0,
        kapha: 0,
        dominant: 'vata',
        percent: { vata: 33, pitta: 33, kapha: 34 }
      };
    }

    const percent = {
      vata: Math.round((scores.vata / total) * 100),
      pitta: Math.round((scores.pitta / total) * 100),
      kapha: Math.round((scores.kapha / total) * 100)
    };

    const dominant = Object.keys(scores).reduce((a, b) =>
      scores[a as keyof typeof scores] > scores[b as keyof typeof scores] ? a : b
    );

    return {
      ...scores,
      dominant,
      percent
    };
  };

  const isQuestionAnswered = (questionId: string): boolean => {
    return answers.some(a => a.questionId === questionId);
  };

  const getCompletionPercentage = (totalQuestions: number): number => {
    if (totalQuestions === 0) return 0;
    return Math.round((answers.length / totalQuestions) * 100);
  };

  const validateAnswers = (): { isValid: boolean; missingQuestions: string[] } => {
    // This would need to be implemented based on your question structure
    // For now, return basic validation
    return {
      isValid: answers.length > 0,
      missingQuestions: []
    };
  };

  return {
    // State
    answers,
    result,
    status,
    isLoading,
    error,
    
    // Actions
    addAnswer,
    removeAnswer,
    getAnswer,
    clearAnswers,
    submitQuestionnaire,
    loadQuestionnaireStatus,
    
    // Computed values
    calculateCurrentScores,
    isQuestionAnswered,
    getCompletionPercentage,
    validateAnswers,
    
    // Derived state
    isCompleted: status?.completed || false,
    hasAnswers: answers.length > 0,
    answersCount: answers.length,
  };
};

export default useQuestionnaire;