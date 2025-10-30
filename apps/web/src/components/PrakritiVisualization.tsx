// apps/web/src/components/PrakritiVisualization.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface PrakritiScores {
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

interface Props {
  scores: PrakritiScores;
}

const PrakritiVisualization: React.FC<Props> = ({ scores }) => {
  const [activeChart, setActiveChart] = useState('pie');
  
  // Colors for the doshas
  const COLORS = {
    vata: '#3b82f6',    // blue
    pitta: '#ef4444',   // red
    kapha: '#22c55e'    // green
  };

  // Prepare data for charts
  const pieData = [
    { name: 'Vata', value: scores.percent.vata, color: COLORS.vata },
    { name: 'Pitta', value: scores.percent.pitta, color: COLORS.pitta },
    { name: 'Kapha', value: scores.percent.kapha, color: COLORS.kapha }
  ];

  const barData = [
    { name: 'Vata', percentage: scores.percent.vata, color: COLORS.vata },
    { name: 'Pitta', percentage: scores.percent.pitta, color: COLORS.pitta },
    { name: 'Kapha', percentage: scores.percent.kapha, color: COLORS.kapha }
  ];

  const radarData = [
    { dosha: 'Vata', value: scores.percent.vata, fullMark: 100 },
    { dosha: 'Pitta', value: scores.percent.pitta, fullMark: 100 },
    { dosha: 'Kapha', value: scores.percent.kapha, fullMark: 100 }
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-800">{label}</p>
          <p className="text-gray-600">
            Percentage: <span className="font-semibold">{payload[0].value}%</span>
          </p>
          {scores.ml_prediction && (
            <p className="text-sm text-gray-500 mt-1">
              AI Confidence: {Math.round(scores.ml_prediction.confidence * 100)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Chart Selector */}
      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap">
          <button
            onClick={() => setActiveChart('pie')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeChart === 'pie'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pie Chart
          </button>
          <button
            onClick={() => setActiveChart('bar')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeChart === 'bar'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setActiveChart('radar')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeChart === 'radar'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Radar Chart
          </button>
          <button
            onClick={() => setActiveChart('detailed')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeChart === 'detailed'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Detailed View
          </button>
        </nav>
      </div>

      <div className="p-6">
        {/* Chart Content */}
        {activeChart === 'pie' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-80"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Prakriti Distribution</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${Number(value).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {activeChart === 'bar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-80"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Dosha Strengths</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="percentage" name="Percentage">
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {activeChart === 'radar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-80"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Dosha Comparison</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dosha" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Dosha Strength"
                    dataKey="value"
                    stroke={COLORS[scores.dominant as keyof typeof COLORS] || COLORS.vata}
                    fill={COLORS[scores.dominant as keyof typeof COLORS] || COLORS.vata}
                    fillOpacity={0.6}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {activeChart === 'detailed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Detailed Prakriti Analysis</h3>
            
            {/* Dominant Dosha Card */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
              <div className="text-center">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Your Dominant Constitution</h4>
                <p className="text-3xl font-bold text-gray-800 capitalize mb-2">
                  {scores.dominant} Prakriti
                </p>
                <div className="flex justify-center my-4">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: COLORS[scores.dominant as keyof typeof COLORS] || COLORS.vata }}
                  >
                    <span className="text-white font-bold text-2xl capitalize">
                      {scores.dominant[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600">
                  {scores.dominant === 'vata' && 'Air & Space - Creative, Quick, Light'}
                  {scores.dominant === 'pitta' && 'Fire & Water - Focused, Intense, Warm'}
                  {scores.dominant === 'kapha' && 'Earth & Water - Steady, Calm, Strong'}
                </p>
              </div>
            </div>

            {/* Dosha Percentages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(scores.percent).map(([dosha, percentage]) => (
                <div 
                  key={dosha} 
                  className="bg-white rounded-lg p-4 border shadow-sm"
                  style={{ 
                    borderColor: (COLORS[dosha as keyof typeof COLORS] || COLORS.vata) + '40',
                    backgroundColor: (COLORS[dosha as keyof typeof COLORS] || COLORS.vata) + '05'
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold text-gray-800 capitalize">{dosha}</h5>
                    <span 
                      className="text-xl font-bold"
                      style={{ color: COLORS[dosha as keyof typeof COLORS] || COLORS.vata }}
                    >
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: COLORS[dosha as keyof typeof COLORS] || COLORS.vata
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ML Prediction Info */}
            {scores.ml_prediction && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">AI-Powered Analysis</h4>
                  <div className="flex items-center bg-blue-100 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-blue-800">ML Enhanced</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700">Prediction Confidence</span>
                      <span className="font-semibold text-gray-800">
                        {Math.round(scores.ml_prediction.confidence * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${scores.ml_prediction.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm text-gray-600">Predicted Dosha</p>
                      <p className="font-semibold text-gray-800 capitalize">
                        {scores.ml_prediction.predicted}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm text-gray-600">Traditional Analysis</p>
                      <p className="font-semibold text-gray-800 capitalize">
                        {scores.dominant}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Chart Information */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-2">About Your Prakriti Analysis</h4>
          <p className="text-sm text-gray-600">
            This visualization shows your unique Ayurvedic constitution based on your questionnaire responses. 
            {scores.ml_prediction 
              ? " The AI-powered analysis enhances traditional methods with machine learning for more accurate results."
              : " The analysis is based on traditional Ayurvedic principles."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrakritiVisualization;