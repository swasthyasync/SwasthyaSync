// apps/web/src/pages/auth/PrakritiQuestionnaire.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { prakritiQuestions, mentalHealthQuestions, Question } from '../../utils/questions';
import api from '../../utils/api';

interface Answer {
  questionId: string;
  optionId: string;
  trait: 'vata' | 'pitta' | 'kapha';
  weight: number;
}

const PrakritiQuestionnaire: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Combine all questions and split into 2 pages
  const allQuestions = [...prakritiQuestions, ...mentalHealthQuestions];
  const midPoint = Math.ceil(allQuestions.length / 2);
  const page1Questions = allQuestions.slice(0, midPoint);
  const page2Questions = allQuestions.slice(midPoint);
  const currentQuestions = currentPage === 0 ? page1Questions : page2Questions;

  // Calculate progress
  const progress = currentPage === 0 ? 50 : 100;

  const handleAnswer = (question: Question, optionId: string) => {
    const option = question.options.find(o => o.id === optionId);
    if (!option) return;

    const newAnswer: Answer = {
      questionId: question.id,
      optionId: option.id,
      trait: option.trait,
      weight: option.weight
    };

    setAnswers(prev => {
      const filtered = prev.filter(a => a.questionId !== question.id);
      return [...filtered, newAnswer];
    });
  };

  const isQuestionAnswered = (questionId: string) => {
    return answers.some(a => a.questionId === questionId);
  };

  const getSelectedOption = (questionId: string) => {
    const answer = answers.find(a => a.questionId === questionId);
    return answer?.optionId || '';
  };

  const canProceed = () => {
    return currentQuestions.every(q => isQuestionAnswered(q.id));
  };

  const handleNext = () => {
    if (currentPage === 0 && canProceed()) {
      setCurrentPage(1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    if (currentPage === 1) {
      setCurrentPage(0);
      window.scrollTo(0, 0);
    }
  };

  const calculatePrakritiScores = () => {
    const scores: Record<'vata' | 'pitta' | 'kapha', number> = {
      vata: 0,
      pitta: 0,
      kapha: 0
    };

    answers.forEach(answer => {
      scores[answer.trait] += answer.weight;
    });

    const total = scores.vata + scores.pitta + scores.kapha;
    if (total === 0) {
      return { vata: 0, pitta: 0, kapha: 0, dominant: 'vata' as 'vata' | 'pitta' | 'kapha' };
    }

    const pct = {
      vata: Math.round((scores.vata / total) * 100),
      pitta: Math.round((scores.pitta / total) * 100),
      kapha: Math.round((scores.kapha / total) * 100)
    };

    const dominant = (Object.keys(scores) as Array<'vata' | 'pitta' | 'kapha'>).reduce((best, key) =>
      scores[key] > scores[best] ? key : best, 'vata'
    );

    return { ...pct, dominant };
  };

  const calculateMentalHealthScore = () => {
    const mentalAnswers = answers.filter(a => a.questionId.startsWith('mh'));
    const totalScore = mentalAnswers.reduce((sum, a) => sum + a.weight, 0);
    const maxScore = mentalHealthQuestions.length * 3;
    const percentage = maxScore === 0 ? 0 : (totalScore / maxScore) * 100;

    if (percentage < 30) return { level: 'green', label: 'Good', risk: 'low' };
    if (percentage < 60) return { level: 'yellow', label: 'Moderate', risk: 'medium' };
    return { level: 'red', label: 'Needs Attention', risk: 'high' };
  };

  const handleSubmit = async () => {
    if (!canProceed()) {
      setError('Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const prakritiScores = calculatePrakritiScores();
      const mentalHealthScore = calculateMentalHealthScore();

      await api.submitQuestionnaire(user.id, {
        answers: answers,
        prakritiScores,
        mentalHealthScore,
        completedAt: new Date().toISOString()
      });

      localStorage.setItem('prakritiResults', JSON.stringify({
        scores: prakritiScores,
        mentalHealth: mentalHealthScore
      }));

      navigate('/patient/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit questionnaire');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Ayurvedic Styles */}
      <style>{`
        @keyframes rotateMandala {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatHerb {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.15; }
          25% { transform: translate(30px, -40px) rotate(90deg) scale(1.1); opacity: 0.2; }
          50% { transform: translate(-20px, -60px) rotate(180deg) scale(0.9); opacity: 0.1; }
          75% { transform: translate(-40px, -20px) rotate(270deg) scale(1.05); opacity: 0.18; }
        }
        @keyframes ayurvedicBreathe {
          0%, 100% { transform: scale(0.8); opacity: 0.3; filter: blur(2px); }
          50% { transform: scale(1.2); opacity: 0.6; filter: blur(0px); }
        }
        @keyframes pulseExpand {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes fadeInQuestion {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes goldenPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(218, 165, 32, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(218, 165, 32, 0); }
        }
        .herb-float-1 { animation: floatHerb 25s infinite ease-in-out; }
        .herb-float-2 { animation: floatHerb 30s infinite ease-in-out; animation-delay: -5s; }
        .herb-float-3 { animation: floatHerb 22s infinite ease-in-out; animation-delay: -10s; }
        .herb-float-4 { animation: floatHerb 28s infinite ease-in-out; animation-delay: -15s; }
        .mandala-rotate { animation: rotateMandala 60s linear infinite; }
        .breathe-1 { animation: ayurvedicBreathe 6s ease-in-out infinite; }
        .breathe-2 { animation: ayurvedicBreathe 6s ease-in-out infinite reverse; animation-delay: -3s; }
        .pulse-ring-1 { animation: pulseExpand 4s ease-out infinite; }
        .pulse-ring-2 { animation: pulseExpand 4s ease-out infinite; animation-delay: 1s; }
        .pulse-ring-3 { animation: pulseExpand 4s ease-out infinite; animation-delay: 2s; }
        .question-fade { animation: fadeInQuestion 0.6s ease-out forwards; }
        .golden-pulse { animation: goldenPulse 2s ease-in-out infinite; }
        
        /* Custom Radio Styles */
        .custom-radio {
          display: inline-block;
          width: 20px;
          height: 20px;
          background: rgba(255, 248, 220, 0.6);
          border: 2px solid #daa520;
          border-radius: 50%;
          position: relative;
          transition: all 0.3s;
          flex-shrink: 0;
        }
        .custom-radio.checked {
          background: linear-gradient(135deg, #b8860b, #daa520);
          box-shadow: 0 0 0 3px rgba(218, 165, 32, 0.2);
        }
        .custom-radio.checked::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        }
        
        /* Scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(218, 165, 32, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #b8860b, #daa520);
          border-radius: 4px;
        }
      `}</style>

      <div className="min-h-screen py-8 px-4 relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at top left, rgba(255, 183, 77, 0.15), transparent 40%),
            radial-gradient(ellipse at bottom right, rgba(139, 69, 19, 0.2), transparent 40%),
            radial-gradient(ellipse at center, rgba(255, 140, 0, 0.1), transparent 60%),
            linear-gradient(135deg, #2c1810 0%, #3d2817 25%, #4a3420 50%, #3d2817 75%, #2c1810 100%)
          `
        }}>

        {/* Mandala overlay */}
        <div className="fixed inset-0 opacity-5 pointer-events-none mandala-rotate"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 80% 80%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 80% 20%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 20% 80%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 50% 50%, transparent 40%, rgba(255, 183, 77, 0.1) 40.5%, transparent 41%)
            `
          }}
        />

        {/* Floating herbs */}
        <div className="fixed w-10 h-10 top-[10%] left-[10%] rounded-full herb-float-1 opacity-15"
          style={{ background: 'radial-gradient(circle, #8b6914 0%, transparent 70%)' }} />
        <div className="fixed w-15 h-15 top-[70%] right-[15%] rounded-full herb-float-2 opacity-15"
          style={{ background: 'radial-gradient(circle, #cd853f 0%, transparent 70%)' }} />
        <div className="fixed w-9 h-9 bottom-[15%] left-[50%] rounded-full herb-float-3 opacity-15"
          style={{ background: 'radial-gradient(circle, #daa520 0%, transparent 70%)' }} />
        <div className="fixed w-11 h-11 top-[50%] left-[5%] rounded-full herb-float-4 opacity-15"
          style={{ background: 'radial-gradient(circle, #b8860b 0%, transparent 70%)' }} />

        {/* Breathing light */}
        <div className="fixed w-96 h-96 md:w-[600px] md:h-[600px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="absolute inset-0 rounded-full breathe-1"
            style={{ background: 'radial-gradient(circle, rgba(255, 183, 77, 0.4), rgba(218, 165, 32, 0.1) 40%, transparent 70%)' }} />
          <div className="absolute w-4/5 h-4/5 top-[10%] left-[10%] rounded-full breathe-2"
            style={{ background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3), rgba(184, 134, 11, 0.15) 30%, transparent 60%)' }} />
        </div>

        {/* Pulse rings */}
        <div className="fixed w-[800px] h-[800px] top-1/2 left-1/2 border border-yellow-400/20 rounded-full pulse-ring-1" />
        <div className="fixed w-[800px] h-[800px] top-1/2 left-1/2 border border-yellow-400/20 rounded-full pulse-ring-2" />
        <div className="fixed w-[800px] h-[800px] top-1/2 left-1/2 border border-yellow-400/20 rounded-full pulse-ring-3" />

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Header with Progress */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#ffd700' }}>
                🕉️ Prakriti Assessment
              </h1>
              <p className="text-sm" style={{ color: '#daa520' }}>
                Discover your unique Ayurvedic constitution
              </p>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: '#ffd700' }}>
                Page {currentPage + 1} of 2
              </span>
              <span className="text-sm" style={{ color: '#daa520' }}>
                {progress}% Complete
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: 'rgba(139, 69, 19, 0.3)' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-2 rounded-full"
                style={{ background: 'linear-gradient(90deg, #b8860b, #daa520, #ffd700)' }}
              />
            </div>
          </motion.div>

          {/* Questions Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative rounded-3xl p-6 mb-6 custom-scrollbar overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 248, 220, 0.95), rgba(250, 240, 190, 0.92))',
              boxShadow: '0 30px 60px rgba(139, 69, 19, 0.4), 0 15px 35px rgba(184, 134, 11, 0.3)',
              border: '1px solid rgba(218, 165, 32, 0.3)',
              maxHeight: '70vh'
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: currentPage === 0 ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: currentPage === 0 ? 50 : -50 }}
                transition={{ duration: 0.3 }}
              >
                {/* Questions Grid - 2 columns for efficiency */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {currentQuestions.map((question, idx) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 rounded-xl question-fade"
                      style={{ 
                        background: 'rgba(255, 215, 0, 0.03)',
                        border: '1px solid rgba(218, 165, 32, 0.2)'
                      }}
                    >
                      <div className="mb-3">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full mb-2"
                          style={{ 
                            background: 'rgba(218, 165, 32, 0.2)',
                            color: '#8b6914'
                          }}>
                          {question.category}
                        </span>
                        <h3 className="text-sm font-semibold" style={{ color: '#2c1810' }}>
                          {currentPage === 0 ? idx + 1 : midPoint + idx + 1}. {question.text}
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {question.options.map(option => (
                          <label
                            key={option.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              getSelectedOption(question.id) === option.id
                                ? 'golden-pulse'
                                : 'hover:bg-yellow-50/10'
                            }`}
                            style={{
                              background: getSelectedOption(question.id) === option.id
                                ? 'rgba(255, 215, 0, 0.1)'
                                : 'rgba(255, 248, 220, 0.4)',
                              border: `2px solid ${
                                getSelectedOption(question.id) === option.id
                                  ? '#daa520'
                                  : 'rgba(218, 165, 32, 0.2)'
                              }`
                            }}
                          >
                            <div className={`custom-radio ${getSelectedOption(question.id) === option.id ? 'checked' : ''}`} />
                            <span className="text-sm" style={{ color: '#6b4423' }}>{option.text}</span>
                            <input
                              type="radio"
                              name={question.id}
                              value={option.id}
                              checked={getSelectedOption(question.id) === option.id}
                              onChange={() => handleAnswer(question, option.id)}
                              className="hidden"
                            />
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 p-3 rounded-lg flex items-center gap-2"
              style={{ 
                background: 'rgba(205, 133, 63, 0.1)',
                border: '1px solid rgba(205, 133, 63, 0.3)',
                color: '#a0522d'
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={currentPage === 0 ? () => navigate(-1) : handlePrev}
              className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
              style={{
                background: 'rgba(139, 69, 19, 0.1)',
                color: '#8b6914',
                border: '1px solid rgba(218, 165, 32, 0.3)'
              }}
            >
              ← {currentPage === 0 ? 'Back' : 'Previous'}
            </button>

            {/* Page Indicators */}
            <div className="flex gap-3">
              {[0, 1].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`transition-all ${
                    idx === currentPage ? 'w-8 h-2' : 'w-2 h-2'
                  } rounded-full`}
                  style={{
                    background: idx === currentPage 
                      ? 'linear-gradient(90deg, #b8860b, #daa520, #ffd700)'
                      : 'rgba(218, 165, 32, 0.3)'
                  }}
                />
              ))}
            </div>

            {currentPage === 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                  !canProceed() || loading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-105 hover:-translate-y-0.5'
                }`}
                style={{
                  background: !canProceed() || loading
                    ? 'linear-gradient(135deg, #8b6914, #a0826d)'
                    : 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)',
                  color: '#2c1810',
                  boxShadow: !canProceed() || loading
                    ? 'none'
                    : '0 4px 15px rgba(184, 134, 11, 0.4)'
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-amber-800/30 border-t-amber-800 rounded-full animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  'Submit & View Results'
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  !canProceed()
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-105 hover:-translate-y-0.5'
                }`}
                style={{
                  background: !canProceed()
                    ? 'linear-gradient(135deg, #8b6914, #a0826d)'
                    : 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)',
                  color: '#2c1810',
                  boxShadow: !canProceed()
                    ? 'none'
                    : '0 4px 15px rgba(184, 134, 11, 0.4)'
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PrakritiQuestionnaire;