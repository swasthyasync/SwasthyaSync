// apps/web/src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, authService, User } from './utils/supabase';
import { ToastProvider } from './components/ToastProvider';
import { Toaster } from 'react-hot-toast';

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
import NutritionManagement from './pages/practitioner/NutritionManagement';
import AdminDashboard from './pages/admin/Dashboard';

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[ProtectedRoute] Checking authentication...');
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          console.log('[ProtectedRoute] User authenticated:', currentUser.id, 'Role:', currentUser.role);
        } else {
          console.log('[ProtectedRoute] No authenticated user found');
        }
      } catch (error) {
        console.error('[ProtectedRoute] Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[ProtectedRoute] Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to /auth/phone');
    return <Navigate to="/auth/phone" replace />;
  }

  console.log('[ProtectedRoute] User found:', user.id, 'Role:', user.role);
  console.log('[ProtectedRoute] Allowed roles:', allowedRoles);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('[ProtectedRoute] User role not allowed, current role:', user.role, 'Allowed roles:', allowedRoles);
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'practitioner':
        return <Navigate to="/practitioner/dashboard" replace />;
      case 'patient':
         return <Navigate to="/patient/dashboard" replace />;   // ✅ FIXED
      default:
        return <Navigate to="/auth/phone" replace />;
    }
  }

  console.log('[ProtectedRoute] User authorized, rendering children');
  return <>{children}</>;
};

// Universal Dashboard Component (role-based view)
const UniversalDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('[UniversalDashboard] Error getting user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
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
      <ToastProvider>
        <div className="min-h-screen">
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
              <Routes>
                <Route 
                  path="dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['patient']}>
                      <PatientDashboard />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            } 
          />

          
            <Route 
    path="/practitioner/*" 
    element={
      <ProtectedRoute allowedRoles={['practitioner']}>
        <Routes>
          <Route path="dashboard" element={<PractitionerDashboard />} />
          <Route path="nutrition" element={<NutritionManagement />} />
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
          
          {/* Default fallback: navigate to phone entry */}
          <Route path="*" element={<Navigate to="/auth/phone" replace />} />
        </Routes>
        </div>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </ToastProvider>
    </Router>
  );
}

export default App;