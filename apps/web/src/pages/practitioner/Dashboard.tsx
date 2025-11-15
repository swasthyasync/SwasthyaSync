// apps/web/src/pages/practitioner/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import ChatWidget from '../../components/ChatWidget';
import NutritionDashboard from '../../components/NutritionDashboard';

interface Thread {
  id: string;
  title?: string;
  patient_id: string;
  patient?: {
    first_name: string;
    last_name: string;
  };
  status: string;
  updated_at: string;
  unread_count?: number;
}

interface Appointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  type: string;
  status: string;
}

const PractitionerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [practitioner, setPractitioner] = useState<any>(null);
  const [activeThreads, setActiveThreads] = useState<Thread[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    unreadMessages: 0,
    pendingReviews: 0
  });
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get current practitioner
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth/practitioner');
        return;
      }

      // Get practitioner details
      const { data: practitionerData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (practitionerData) {
        setPractitioner(practitionerData);
      }

      // Load active chat threads
      const { data: threads } = await supabase
        .from('chat_threads')
        .select(`
          *,
          patient:users!chat_threads_patient_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('practitioner_id', user.id)
        .eq('status', 'open')
        .order('updated_at', { ascending: false });

      if (threads) {
        // Get unread count for each thread
        const threadsWithUnread = await Promise.all(
          threads.map(async (thread) => {
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .eq('is_read', false)
              .neq('sender_id', user.id);

            return { ...thread, unread_count: count || 0 };
          })
        );

        setActiveThreads(threadsWithUnread);
        
        // Calculate total unread messages
        const totalUnread = threadsWithUnread.reduce((sum, t) => sum + (t.unread_count || 0), 0);
        setStats(prev => ({ ...prev, unreadMessages: totalUnread }));
      }

      // Load today's appointments
      const today = new Date().toISOString().split('T')[0];
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:users!appointments_patient_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('practitioner_id', user.id)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true });

      if (appointmentsData) {
        const formattedAppointments = appointmentsData.map(apt => ({
          id: apt.id,
          patient_name: `${apt.patient?.first_name} ${apt.patient?.last_name}`,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          type: apt.type,
          status: apt.status
        }));
        setAppointments(formattedAppointments);
        setStats(prev => ({ ...prev, todayAppointments: formattedAppointments.length }));
      }

      // Get pending questionnaire reviews
      const { count: pendingCount } = await supabase
        .from('questionnaire_answers')
        .select('*', { count: 'exact', head: true })
        .eq('requires_practitioner_review', true)
        .eq('practitioner_validated', false);

      setStats(prev => ({ ...prev, pendingReviews: pendingCount || 0 }));

      // Get total patients
      const { count: patientCount } = await supabase
        .from('chat_threads')
        .select('patient_id', { count: 'exact', head: true })
        .eq('practitioner_id', user.id);

      setStats(prev => ({ ...prev, totalPatients: patientCount || 0 }));

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/auth/practitioner');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">👨‍⚕️</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    Dr. {practitioner?.first_name} {practitioner?.last_name}
                  </h1>
                  <p className="text-xs text-gray-500">Practitioner Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/practitioner/patients')}
                className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                View All Patients
              </button>
              <button
                onClick={() => navigate('/practitioner/schedule')}
                className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
              >
                Manage Schedule
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeView === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView('nutrition')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeView === 'nutrition'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Nutrition Management
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Patients</span>
                  <span className="text-2xl">👥</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalPatients}</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Today's Appointments</span>
                  <span className="text-2xl">📅</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats.todayAppointments}</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Unread Messages</span>
                  <span className="text-2xl">💬</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.unreadMessages}
                  {stats.unreadMessages > 0 && (
                    <span className="ml-2 w-2 h-2 bg-red-500 rounded-full inline-block animate-pulse"></span>
                  )}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Pending Reviews</span>
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats.pendingReviews}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Today's Appointments */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Today's Schedule</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {appointments.length > 0 ? (
                    appointments.map((apt) => (
                      <div key={apt.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-gray-800">{apt.patient_name}</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {apt.appointment_time}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{apt.type}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No appointments today</p>
                  )}
                </div>
              </div>

              {/* Active Patient Conversations */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Active Conversations</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activeThreads.length > 0 ? (
                    activeThreads.map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => setSelectedThreadId(thread.id)}
                        className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {thread.patient?.first_name} {thread.patient?.last_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {thread.title || 'Health Consultation'}
                            </p>
                          </div>
                          {thread.unread_count && thread.unread_count > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                              {thread.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Last activity: {new Date(thread.updated_at).toLocaleString()}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No active conversations</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/practitioner/prescriptions/new')}
                    className="w-full p-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors"
                  >
                    📝 Create Prescription
                  </button>
                  <button
                    onClick={() => navigate('/practitioner/questionnaires/review')}
                    className="w-full p-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg font-medium transition-colors"
                  >
                    📋 Review Questionnaires
                  </button>
                  <button
                    onClick={() => navigate('/practitioner/nutrition')}
                    className="w-full p-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-medium transition-colors"
                  >
                    🍽️ Nutrition Management
                  </button>
                  <button
                    onClick={() => navigate('/practitioner/reports')}
                    className="w-full p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors"
                  >
                    📊 Generate Reports
                  </button>
                  <button
                    onClick={() => navigate('/practitioner/availability')}
                    className="w-full p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
                  >
                    🗓️ Set Availability
                  </button>
                </div>
              </div>
            </div>

            {/* Patient Health Alerts */}
            <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Patient Health Alerts</h2>
              <div className="text-center text-gray-500 py-8">
                <span className="text-4xl mb-4 block">🔔</span>
                <p>No critical health alerts at this time</p>
              </div>
            </div>
          </>
        )}

        {/* Nutrition View */}
        {activeView === 'nutrition' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Nutrition Management</h2>
              <p className="text-gray-600 mt-2">
                View and manage personalized nutrition plans for your patients
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Patient
              </label>
              <select
                value={selectedPatientId || ''}
                onChange={(e) => setSelectedPatientId(e.target.value || null)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Select a patient to view nutrition data</option>
                {activeThreads.map((thread) => (
                  <option key={thread.id} value={thread.patient_id}>
                    {thread.patient?.first_name} {thread.patient?.last_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPatientId ? (
              <NutritionDashboard />
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🍽️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Patient Selected</h3>
                <p className="text-gray-500">
                  Select a patient from the dropdown to view their personalized nutrition dashboard
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Chat Widget - For practitioner view */}
      <ChatWidget 
        initialThreadId={selectedThreadId} 
        isPractitionerView={true}
      />
    </div>
  );
};

export default PractitionerDashboard;