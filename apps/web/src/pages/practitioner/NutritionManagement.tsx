// apps/web/src/pages/practitioner/NutritionManagement.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PractitionerNutritionManager from '../../components/PractitionerNutritionManager';

const NutritionManagement: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/practitioner');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-800">Nutrition Management</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Ayurvedic Nutrition Management</h2>
          <p className="text-gray-600 mt-2">
            Manage personalized nutrition plans for your patients based on their Prakriti constitution
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <PractitionerNutritionManager />
        </div>
      </main>
    </div>
  );
};

export default NutritionManagement;