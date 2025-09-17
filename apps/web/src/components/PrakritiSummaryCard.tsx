// apps/web/src/components/PrakritiSummaryCard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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
  const [chartData, setChartData] = useState<any>(null);
  const [barData, setBarData] = useState<any>(null);

  useEffect(() => {
    // Prepare pie chart data
    const pieData = {
      labels: ['Vata', 'Pitta', 'Kapha'],
      datasets: [
        {
          label: 'Prakriti Distribution',
          data: [scores.percent.vata, scores.percent.pitta, scores.percent.kapha],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)', // Blue for Vata
            'rgba(239, 68, 68, 0.8)',  // Red for Pitta
            'rgba(34, 197, 94, 0.8)',  // Green for Kapha
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(34, 197, 94, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };

    // Prepare bar chart data
    const barChartData = {
      labels: ['Vata', 'Pitta', 'Kapha'],
      datasets: [
        {
          label: 'Prakriti Percentage',
          data: [scores.percent.vata, scores.percent.pitta, scores.percent.kapha],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(34, 197, 94, 0.8)',
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(34, 197, 94, 1)',
          ],
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };

    setChartData(pieData);
    setBarData(barChartData);
  }, [scores]);

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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 14,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.parsed}%`;
          }
        }
      }
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      },
    },
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
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-700">
                      AI Prediction Confidence
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${getConfidenceColor(scores.ml_prediction.confidence)}`}>
                    {Math.round(scores.ml_prediction.confidence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${scores.ml_prediction.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Progress Bars */}
            <div className="space-y-6 mb-6">
              {/* Vata */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="font-semibold text-gray-800 text-lg">Vata</span>
                    <span className="text-sm text-gray-500 ml-2 block">{getDescription('vata')}</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{scores.percent.vata}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-4 rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${scores.percent.vata}%` }}
                  />
                </div>
              </div>

              {/* Pitta */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="font-semibold text-gray-800 text-lg">Pitta</span>
                    <span className="text-sm text-gray-500 ml-2 block">{getDescription('pitta')}</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{scores.percent.pitta}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-red-400 to-red-600 h-4 rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${scores.percent.pitta}%` }}
                  />
                </div>
              </div>

              {/* Kapha */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="font-semibold text-gray-800 text-lg">Kapha</span>
                    <span className="text-sm text-gray-500 ml-2 block">{getDescription('kapha')}</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{scores.percent.kapha}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${scores.percent.kapha}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Dominant Type */}
            <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
              <div className="text-center">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Your Dominant Constitution</h4>
                <p className="text-3xl font-bold text-gray-800 capitalize mb-2">{scores.dominant} Prakriti</p>
                <p className="text-sm text-gray-600">{getDescription(scores.dominant)}</p>
                <div className="mt-4 flex justify-center">
                  <div className={`w-16 h-16 ${getColorClass(scores.dominant)} rounded-full flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-lg capitalize">{scores.dominant[0].toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'charts' && chartData && barData && (
          <div className="space-y-8">
            {/* Pie Chart */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-6 text-center">Prakriti Distribution</h4>
              <div className="h-80 flex justify-center">
                <div className="w-80">
                  <Pie data={chartData} options={chartOptions} />
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-6 text-center">Constitution Percentages</h4>
              <div className="h-80">
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            {/* Chart Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{scores.percent.vata}%</div>
                <div className="text-sm text-blue-800 font-medium">Vata</div>
                <div className="text-xs text-gray-600 mt-1">Air & Space</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">{scores.percent.pitta}%</div>
                <div className="text-sm text-red-800 font-medium">Pitta</div>
                <div className="text-xs text-gray-600 mt-1">Fire & Water</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{scores.percent.kapha}%</div>
                <div className="text-sm text-green-800 font-medium">Kapha</div>
                <div className="text-xs text-gray-600 mt-1">Earth & Water</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'therapies' && therapyRecommendations && (
          <div className="space-y-6">
            {/* Primary Therapies */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                Recommended Therapies
              </h4>
              <div className="grid gap-3">
                {therapyRecommendations.primary?.map((therapy: string, index: number) => (
                  <div key={index} className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-gray-700 font-medium">{therapy}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Yoga Recommendations */}
            {therapyRecommendations.yoga && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  Yoga Practices
                </h4>
                <div className="grid gap-3">
                  {therapyRecommendations.yoga.map((practice: string, index: number) => (
                    <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                      <span className="text-blue-600 mr-3 text-lg">🧘</span>
                      <span className="text-gray-700">{practice}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lifestyle Tips */}
            {therapyRecommendations.lifestyle && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  Lifestyle Recommendations
                </h4>
                <div className="space-y-3">
                  {therapyRecommendations.lifestyle.map((tip: string, index: number) => (
                    <div key={index} className="flex items-start p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <span className="text-orange-500 mr-3 mt-1 text-sm">●</span>
                      <span className="text-gray-700">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Level */}
            {therapyRecommendations.confidence_level && (
              <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-700">Recommendation Confidence</span>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    therapyRecommendations.confidence_level === 'high' 
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : therapyRecommendations.confidence_level === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {therapyRecommendations.confidence_level.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Recommended Duration:</span>
                  <span className="font-semibold">{therapyRecommendations.recommended_duration || '8-12 weeks'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrakritiSummaryCard;