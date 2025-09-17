// apps/web/src/pages/practitioner/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PractitionerDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Practitioner Dashboard</h1>
        <div>
          <button
            onClick={() => navigate('/practitioner/patients')}
            className="px-3 py-2 bg-indigo-600 text-white rounded-md"
          >
            View Patients
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Upcoming Consultations</h2>
            <p className="text-sm text-gray-500 mt-2">No upcoming sessions</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Patient Alerts</h2>
            <p className="text-sm text-gray-500 mt-2">No alerts</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => navigate('/practitioner/new-prescription')}
                className="px-3 py-2 bg-green-600 text-white rounded"
              >
                New Prescription
              </button>
              <button
                onClick={() => navigate('/practitioner/schedule')}
                className="px-3 py-2 bg-yellow-600 text-white rounded"
              >
                Manage Schedule
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PractitionerDashboard;
