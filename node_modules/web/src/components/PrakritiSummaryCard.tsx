// apps/web/src/components/PrakritiSummaryCard.tsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface PrakritiScores {
  vata: number;
  pitta: number;
  kapha: number;
  dominant: string;
  percent: {
    vata: number;
    pitta: number;
    kapha: number;
  };
  ml_prediction?: {
    predicted: string;
    confidence: number;
    probabilities: Record<string, number>;
  };
}

export interface Props {
  scores: PrakritiScores;
  therapyRecommendations?: any;
}

const PrakritiSummaryCard: React.FC<Props> = ({ scores, therapyRecommendations }) => {
  const [activeTab, setActiveTab] = useState('analysis');

  const getColorClass = (type: string) => {
    switch (type) {
      case 'vata':
        return 'bg-blue-500';
      case 'pitta':
        return 'bg-red-500';
      case 'kapha':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDescription = (type: string) => {
    switch (type) {
      case 'vata':
        return 'Air & Space - Creative, Quick, Light';
      case 'pitta':
        return 'Fire & Water - Focused, Intense, Warm';
      case 'kapha':
        return 'Earth & Water - Steady, Calm, Strong';
      default:
        return '';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Custom SVG Pie Chart Component
  const CustomPieChart: React.FC<{ scores: PrakritiScores }> = ({ scores }) => {
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    
    // Calculate stroke lengths
    const vataLength = (scores.percent.vata / 100) * circumference;
    const pittaLength = (scores.percent.pitta / 100) * circumference;
    const kaphaLength = (scores.percent.kapha / 100) * circumference;
    
    // Calculate offsets for stacking
    const vataOffset = 0;
    const pittaOffset = -vataLength;
    const kaphaOffset = -(vataLength + pittaLength);

    return (
      <div className="flex items-center justify-center">
        <div className="relative w-64 h-64">
          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="20"
            />
            
            {/* Vata arc */}
            <motion.circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="18"
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 }}
              animate={{ 
                strokeDasharray: `${vataLength} ${circumference}`,
                strokeDashoffset: vataOffset
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            
            {/* Pitta arc */}
            <motion.circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#ef4444"
              strokeWidth="18"
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 }}
              animate={{ 
                strokeDasharray: `${pittaLength} ${circumference}`,
                strokeDashoffset: pittaOffset
              }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            />
            
            {/* Kapha arc */}
            <motion.circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#22c55e"
              strokeWidth="18"
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 }}
              animate={{ 
                strokeDasharray: `${kaphaLength} ${circumference}`,
                strokeDashoffset: kaphaOffset
              }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
            />

            {/* Rotating shimmer effect */}
            <defs>
              <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            <motion.circle
              cx="100"
              cy="100"
              r={radius + 5}
              fill="none"
              stroke="url(#shimmer)"
              strokeWidth="2"
              strokeDasharray="8 4"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: '50% 50%' }}
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              className="text-center bg-white rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-lg border-2 border-gray-100"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <div className="text-xl font-bold text-gray-800 capitalize">
                {scores.ml_prediction ? scores.ml_prediction.predicted : scores.dominant}
              </div>
              <div className="text-xs text-gray-600">
                {scores.ml_prediction ? 'AI Prediction' : 'Traditional'}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  };

  // Custom 3D Bar Chart Component
  const Custom3DBarChart: React.FC<{ scores: PrakritiScores }> = ({ scores }) => {
    const maxHeight = 200;
    const bars = [
      { key: 'vata', label: 'Vata', percent: scores.percent.vata, color: '#3b82f6' },
      { key: 'pitta', label: 'Pitta', percent: scores.percent.pitta, color: '#ef4444' },
      { key: 'kapha', label: 'Kapha', percent: scores.percent.kapha, color: '#22c55e' },
    ];

    return (
      <div className="flex items-end justify-center space-x-8 h-64">
        {bars.map((bar, index) => (
          <div key={bar.key} className="flex flex-col items-center">
            <div className="relative">
              {/* 3D Bar */}
              <motion.div
                className="relative"
                style={{ 
                  width: 60,
                  background: `linear-gradient(135deg, ${bar.color}, ${bar.color}dd)`
                }}
                initial={{ height: 0 }}
                animate={{ height: (bar.percent / 100) * maxHeight }}
                transition={{ duration: 1.2, delay: index * 0.2, ease: 'easeOut' }}
              >
                {/* 3D effect - top */}
                <div 
                  className="absolute -top-2 left-0 w-full h-4"
                  style={{
                    background: `linear-gradient(45deg, ${bar.color}ee, ${bar.color}bb)`,
                    transform: 'skewX(-45deg) scaleY(0.5)'
                  }}
                />
                
                {/* 3D effect - right side */}
                <div 
                  className="absolute top-0 -right-2 w-4 h-full"
                  style={{
                    background: `linear-gradient(135deg, ${bar.color}cc, ${bar.color}99)`,
                    transform: 'skewY(-45deg) scaleX(0.5)'
                  }}
                />

                {/* Percentage label */}
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.2 + 0.8 }}
                >
                  {bar.percent}%
                </motion.div>
              </motion.div>
            </div>

            {/* Label */}
            <div className="mt-4 text-center">
              <div className="font-semibold text-gray-800">{bar.label}</div>
              <div className="text-xs text-gray-600 mt-1">{getDescription(bar.key)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'analysis'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Prakriti Analysis
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'charts'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Visual Charts
          </button>
          {therapyRecommendations && (
            <button
              onClick={() => setActiveTab('therapies')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'therapies'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Recommended Therapies
            </button>
          )}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'analysis' && (
          <div>
            {/* ML Confidence Badge */}
            {scores.ml_prediction && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <motion.div 
                      className="w-3 h-3 bg-blue-500 rounded-full mr-2"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      AI Prediction Confidence
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${getConfidenceColor(scores.ml_prediction.confidence)}`}>
                    {Math.round(scores.ml_prediction.confidence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${scores.ml_prediction.confidence * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Enhanced Progress Bars */}
            <div className="space-y-6 mb-6">
              {['vata', 'pitta', 'kapha'].map((dosha, index) => (
                <div key={dosha}>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="font-semibold text-gray-800 text-lg capitalize">{dosha}</span>
                      <span className="text-sm text-gray-500 ml-2 block">{getDescription(dosha)}</span>
                    </div>
                    <motion.span 
                      className={`text-2xl font-bold ${
                        dosha === 'vata' ? 'text-blue-600' :
                        dosha === 'pitta' ? 'text-red-600' : 'text-green-600'
                      }`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.2, duration: 0.5, type: 'spring' }}
                    >
                      {scores.percent[dosha as keyof typeof scores.percent]}%
                    </motion.span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner overflow-hidden">
                    <motion.div
                      className={`h-4 rounded-full shadow-sm relative overflow-hidden ${
                        dosha === 'vata' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                        dosha === 'pitta' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${scores.percent[dosha as keyof typeof scores.percent]}%` }}
                      transition={{ duration: 1.5, delay: index * 0.3 }}
                    >
                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ 
                          duration: 2, 
                          delay: index * 0.3 + 1, 
                          ease: 'easeInOut' 
                        }}
                      />
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced Dominant Type Card */}
            <motion.div 
              className="p-6 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl border border-purple-200 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              <div className="text-center">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Your Dominant Constitution</h4>
                <motion.p 
                  className="text-3xl font-bold text-gray-800 capitalize mb-2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  {scores.dominant} Prakriti
                </motion.p>
                <p className="text-sm text-gray-600 mb-4">{getDescription(scores.dominant)}</p>
                <div className="flex justify-center">
                  <motion.div 
                    className={`w-16 h-16 ${getColorClass(scores.dominant)} rounded-full flex items-center justify-center shadow-xl`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ 
                      boxShadow: [
                        '0 10px 20px rgba(0,0,0,0.1)',
                        '0 20px 40px rgba(0,0,0,0.2)',
                        '0 10px 20px rgba(0,0,0,0.1)'
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <span className="text-white font-bold text-xl capitalize">
                      {scores.dominant[0].toUpperCase()}
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-8">
            {/* Custom Pie Chart */}
            <motion.div 
              className="bg-gray-50 rounded-xl p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h4 className="text-lg font-semibold text-gray-800 mb-6 text-center">Prakriti Distribution</h4>
              <CustomPieChart scores={scores} />
              
              {/* Enhanced Legend */}
              <div className="flex justify-center mt-8 space-x-8">
                {[
                  { key: 'vata', color: '#3b82f6', percent: scores.percent.vata },
                  { key: 'pitta', color: '#ef4444', percent: scores.percent.pitta },
                  { key: 'kapha', color: '#22c55e', percent: scores.percent.kapha }
                ].map((item, index) => (
                  <motion.div 
                    key={item.key}
                    className="flex items-center bg-white p-3 rounded-lg shadow-sm border"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                  >
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <span className="text-sm font-medium capitalize">{item.key}</span>
                      <span className="text-lg font-bold ml-2" style={{ color: item.color }}>
                        {item.percent}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* 3D Bar Chart */}
            <motion.div 
              className="bg-gray-50 rounded-xl p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h4 className="text-lg font-semibold text-gray-800 mb-6 text-center">Constitution Comparison</h4>
              <Custom3DBarChart scores={scores} />
            </motion.div>

            {/* Chart Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'vata', color: 'blue', percent: scores.percent.vata, element: 'Air & Space' },
                { key: 'pitta', color: 'red', percent: scores.percent.pitta, element: 'Fire & Water' },
                { key: 'kapha', color: 'green', percent: scores.percent.kapha, element: 'Earth & Water' }
              ].map((item, index) => (
                <motion.div
                  key={item.key}
                  className={`text-center p-6 bg-${item.color}-50 rounded-lg border border-${item.color}-200 shadow-sm`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div 
                    className={`text-3xl font-bold text-${item.color}-600 mb-2`}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                  >
                    {item.percent}%
                  </motion.div>
                  <div className={`text-sm text-${item.color}-800 font-medium capitalize mb-1`}>
                    {item.key}
                  </div>
                  <div className="text-xs text-gray-600">{item.element}</div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'therapies' && therapyRecommendations && (
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Primary Therapies */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <motion.div 
                  className="w-3 h-3 bg-green-500 rounded-full mr-2"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                Recommended Therapies
              </h4>
              <div className="grid gap-3">
                {therapyRecommendations.primary?.map((therapy: string, index: number) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                    <span className="text-gray-700 font-medium">{therapy}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Yoga Recommendations */}
            {therapyRecommendations.yoga && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                  Yoga Practices
                </h4>
                <div className="grid gap-3">
                  {therapyRecommendations.yoga.map((practice: string, index: number) => (
                    <motion.div 
                      key={index} 
                      className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className="text-blue-600 mr-3 text-lg">🧘</span>
                      <span className="text-gray-700">{practice}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Lifestyle Tips */}
            {therapyRecommendations.lifestyle && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2" />
                  Lifestyle Recommendations
                </h4>
                <div className="space-y-3">
                  {therapyRecommendations.lifestyle.map((tip: string, index: number) => (
                    <motion.div 
                      key={index} 
                      className="flex items-start p-3 bg-orange-50 rounded-lg border border-orange-200"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className="text-orange-500 mr-3 mt-1 text-sm">●</span>
                      <span className="text-gray-700">{tip}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Level */}
            {therapyRecommendations.confidence_level && (
              <motion.div 
                className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-700">Recommendation Confidence</span>
                  <motion.span 
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      therapyRecommendations.confidence_level === 'high' 
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : therapyRecommendations.confidence_level === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                  >
                    {therapyRecommendations.confidence_level.toUpperCase()}
                  </motion.span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Recommended Duration:</span>
                  <span className="font-semibold">{therapyRecommendations.recommended_duration || '8-12 weeks'}</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PrakritiSummaryCard;