// apps/web/src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Intro / Landing
import Intro from './pages/auth/Intro';

// Auth Pages
import PhoneEntry from './pages/auth/PhoneEntry';
import OTPVerify from './pages/auth/OTPVerify';
import PatientRegister from './pages/auth/PatientRegister';
import PrakritiQuestionnaire from './pages/auth/PrakritiQuestionnaire';

// Dashboard Pages
import PatientDashboard from './pages/patient/Dashboard';
import PractitionerDashboard from './pages/practitioner/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';

// Protected Route Component
interface User {
  id: string;
  role: 'patient' | 'practitioner' | 'admin';
  name: string;
}

const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for user in localStorage
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/phone" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'practitioner':
        return <Navigate to="/practitioner/dashboard" replace />;
      case 'patient':
        return <Navigate to="/patient/dashboard" replace />;
      default:
        return <Navigate to="/auth/phone" replace />;
    }
  }

  return <>{children}</>;
};

// Universal Dashboard Component (role-based view)
const UniversalDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!user) {
    return <Navigate to="/auth/phone" replace />;
  }

  // Render different dashboard based on role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'practitioner':
      return <PractitionerDashboard />;
    case 'patient':
      return <PatientDashboard />;
    default:
      return <Navigate to="/auth/phone" replace />;
  }
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Intro / Landing Page (default) */}
          <Route path="/" element={<Intro />} />

          {/* Auth Routes */}
          <Route path="/auth/phone" element={<PhoneEntry />} />
          <Route path="/auth/verify-otp" element={<OTPVerify />} />
          <Route path="/auth/register" element={<PatientRegister />} />
          <Route path="/auth/prakriti-questionnaire" element={<PrakritiQuestionnaire />} />
          
          {/* Universal Dashboard - shows different content based on role */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <UniversalDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Role-specific Routes */}
          <Route 
            path="/patient/*" 
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <Routes>
                  <Route path="dashboard" element={<PatientDashboard />} />
                </Routes>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/practitioner/*" 
            element={
              <ProtectedRoute allowedRoles={['practitioner']}>
                <Routes>
                  <Route path="dashboard" element={<PractitionerDashboard />} />
                </Routes>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                </Routes>
              </ProtectedRoute>
            } 
          />
          
          {/* Default fallback: keep existing behaviour — navigate to phone entry */}
          <Route path="*" element={<Navigate to="/auth/phone" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
