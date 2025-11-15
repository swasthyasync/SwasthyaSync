// apps/web/src/pages/patient/Dashboard.tsx - UPDATED to use backend API
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';




import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, authService, User as SupabaseUser } from '../../utils/supabase';
import { profileService } from '../../services/profileService';
import ProfileManager from '../../components/ProfileManager';
import AppointmentBooking from '../../components/AppointmentBooking';
import ChatWidget from '../../components/ChatWidget';
import PrakritiSummaryCard from '../../components/PrakritiSummaryCard';
import api from '../../utils/api';
import PrakritiVisualizationEnhanced from '../../components/PrakritiVisualizationEnhanced';
import NutritionDashboard from '../../components/NutritionDashboard';

/* ---------- types ---------- */
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

interface User {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  role?: string;
}

interface MentalHealthScore {
  level: 'green' | 'yellow' | 'red';
  score: number;
}

interface Appointment {
  id: string;
  doctorName: string;
  date: string;
  time: string;
  type: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

interface HealthMetric {
  label: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
  icon: string;
}

interface AppUser {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  role?: string;
}

/* ---------- component ---------- */
const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [prakritiScores, setPrakritiScores] = useState<PrakritiScores | null>(null);
  const [mentalHealth, setMentalHealth] = useState<MentalHealthScore | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('dashboard');

  // UI states
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Modal states
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showAppointmentBooking, setShowAppointmentBooking] = useState(false);

  // Focus visualization
  const [focusVisualization, setFocusVisualization] = useState(false);
  const chartRef = useRef<HTMLDivElement | null>(null);
  
  console.log('[Debug] Rendering Dashboard, prakritiScores:', prakritiScores);

  // Helper function to parse JSONB fields
  const parseJsonbFields = (data: any): any => {
    if (!data) return data;
    
    const parsedData = { ...data };
    
    // Parse array fields that might be stored as JSON strings
    const arrayFields = [
      'chronic_conditions',
      'allergies',
      'family_history',
      'specific_concerns',
      'treatment_goals',
      'dietary_preferences'
    ];
    
    const objectFields = [
      'current_medications',
      'previous_surgeries'
    ];
    
    // Parse array fields
    for (const field of arrayFields) {
      if (typeof (data as any)[field] === 'string') {
        try {
          (parsedData as any)[field] = JSON.parse((data as any)[field]);
        } catch (e) {
          console.warn(`[Dashboard] Failed to parse ${field} as JSON:`, (data as any)[field]);
          // Keep as string if parsing fails, but convert to array if it's a comma-separated string
          if (typeof (data as any)[field] === 'string' && (data as any)[field].includes(',')) {
            (parsedData as any)[field] = (data as any)[field].split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          } else if (typeof (data as any)[field] === 'string' && (data as any)[field].length > 0) {
            (parsedData as any)[field] = [(data as any)[field]];
          } else {
            (parsedData as any)[field] = [];
          }
        }
      } else if (Array.isArray((data as any)[field])) {
        // Already an array, keep as is
        (parsedData as any)[field] = (data as any)[field];
      } else {
        // Not a string or array, convert to empty array
        (parsedData as any)[field] = [];
      }
    }
    
    // Parse object fields
    for (const field of objectFields) {
      if (typeof (data as any)[field] === 'string') {
        try {
          (parsedData as any)[field] = JSON.parse((data as any)[field]);
        } catch (e) {
          console.warn(`[Dashboard] Failed to parse ${field} as JSON:`, (data as any)[field]);
          // Keep as original value if parsing fails
          (parsedData as any)[field] = (data as any)[field];
        }
      }
    }
    
    return parsedData;
  };

  // Fetch prakriti scores and user data
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let subscription: any = null;
    
    const fetchPrakritiData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/questionnaire/latest');
        console.log('[Debug] Fetched prakriti data:', response);
        if (response) {
          const { scores, mentalHealth: mental, dominant } = response;
          
          // Only set scores if they're available and have the required structure
          if (scores && scores.vata != null && scores.pitta != null && scores.kapha != null) {
            // Parse scores if they're a string
            let parsedScores = scores;
            if (typeof scores === 'string') {
              try {
                parsedScores = JSON.parse(scores);
              } catch (e) {
                console.warn('Failed to parse scores string:', e);
                parsedScores = scores;
              }
            }
            
            const normalizedScores = {
              vata: parsedScores.vata,
              pitta: parsedScores.pitta,
              kapha: parsedScores.kapha,
              dominant: dominant || 'vata',
              percent: {
                vata: Math.round((parsedScores.vata || 0) * 100),
                pitta: Math.round((parsedScores.pitta || 0) * 100),
                kapha: Math.round((parsedScores.kapha || 0) * 100)
              },
              ml_prediction: parsedScores.ml_prediction
            };
            setPrakritiScores(normalizedScores);
            
            // Clear polling interval once we have valid data
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          } else {
            console.warn('Invalid scores structure:', scores);
            setPrakritiScores(null);
          }

          if (mental) {
            // Parse mental health if it's a string
            let parsedMental = mental;
            if (typeof mental === 'string') {
              try {
                parsedMental = JSON.parse(mental);
              } catch (e) {
                console.warn('Failed to parse mental health string:', e);
                parsedMental = mental;
              }
            }
            
            setMentalHealth({
              score: typeof parsedMental === 'object' ? parsedMental.score : parsedMental,
              level: typeof parsedMental === 'object' ? parsedMental.level : (parsedMental > 75 ? 'green' : parsedMental > 50 ? 'yellow' : 'red')
            });
          }
        } else {
          console.warn('No questionnaire data found');
        }
      } catch (err) {
        console.error('Failed to fetch prakriti data:', err);
        setError('Failed to load health data');
      } finally {
        setLoading(false);
      }
    };

    // Set up real-time subscription to questionnaire changes
    const setupRealTimeSubscription = () => {
      if (user?.id) {
        subscription = supabase
          .channel('questionnaire-changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'questionnaire_answers',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('Questionnaire data changed, fetching latest...', payload);
              // Fetch updated data when changes occur
              fetchPrakritiData();
            }
          )
          .subscribe();
      }
    };

    // Initial fetch
    fetchPrakritiData();
    
    // Set up real-time subscription
    setupRealTimeSubscription();
    
    // Set up polling as fallback (every 10 seconds for 1 minute max)
    let pollCount = 0;
    pollInterval = setInterval(() => {
      pollCount++;
      if (pollCount < 6) { // Stop polling after 1 minute
        fetchPrakritiData();
      } else if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }, 10000);

    // Clean up interval and subscription on component unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user?.id]);

  /* ---------- theme CSS injection ---------- */
  useEffect(() => {
    const css = `
      :root{
        --bg-dark-1: #2c1810;
        --bg-dark-2: #3d2817;
        --bg-dark-3: #4a3420;
        --accent-gold-1: #b8860b;
        --accent-gold-2: #daa520;
        --accent-gold-3: #ffd700;
        --muted-brown: #8b6914;
        --card-bg: rgba(255,248,220,0.95);
        --card-border: rgba(218,165,32,0.3);
        --text-dark: #2c1810;
        --muted-text: #6b4423;
        --glass-yellow: rgba(255,215,0,0.12);
        --scroll-track: rgba(218,165,32,0.08);
        --light-bg: #fffaf2;
        --light-surface: #fffdf7;
        --light-muted: #6b4b2a;
      }

      /* Keyframes */
      @keyframes rotateMandala { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes floatHerb {
        0%,100% { transform: translate(0,0) rotate(0deg) scale(1); opacity: .14; }
        25% { transform: translate(30px,-40px) rotate(90deg) scale(1.06); opacity: .18; }
        50% { transform: translate(-20px,-60px) rotate(180deg) scale(.95); opacity: .12; }
        75% { transform: translate(-40px,-20px) rotate(270deg) scale(1.03); opacity: .16; }
      }
      @keyframes ayurvedicBreathe {
        0%,100% { transform: scale(0.9); opacity: 0.2; filter: blur(2px); }
        50% { transform: scale(1.06); opacity: 0.5; filter: blur(0px); }
      }
      @keyframes pulseExpand {
        0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.8; }
        100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; }
      }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0);} }
      @keyframes goldenPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(218,165,32,0.32); } 50% { box-shadow: 0 0 0 10px rgba(218,165,32,0); } }

      .mandala-rotate { animation: rotateMandala 60s linear infinite; pointer-events: none; }
      .herb-float-1 { animation: floatHerb 28s infinite ease-in-out; pointer-events: none; }
      .herb-float-2 { animation: floatHerb 30s infinite ease-in-out; animation-delay: -6s; pointer-events: none; }
      .breathe-1 { animation: ayurvedicBreathe 6s ease-in-out infinite; pointer-events: none; }
      .pulse-ring { animation: pulseExpand 4s ease-out infinite; pointer-events: none; }
      .fade-in { animation: fadeIn 0.45s ease-out forwards; }
      .golden-pulse { animation: goldenPulse 2s ease-in-out infinite; }

      .custom-radio { width:20px; height:20px; border-radius:50%; border:2px solid var(--accent-gold-2); background: rgba(255,248,220,0.6); position:relative; transition:all .3s; flex-shrink:0; }
      .custom-radio.checked { background: linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2)); box-shadow: 0 0 0 3px rgba(218,165,32,0.18); }
      .custom-radio.checked::after { content:""; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:8px; height:8px; background:#fff; border-radius:50%; }

      .ayurveda-card {
        background: linear-gradient(135deg, rgba(255,248,220,0.95), rgba(250,240,190,0.92));
        box-shadow: 0 20px 40px rgba(139,69,19,0.18), 0 10px 25px rgba(184,134,11,0.08);
        border: 1px solid var(--card-border);
        border-radius: 1rem;
        transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
      }
      .ayurveda-card:hover { transform: translateY(-6px) scale(1.01); box-shadow: 0 28px 60px rgba(139,69,19,0.22), 0 18px 40px rgba(184,134,11,0.12); }
      .ayurveda-card:focus { outline: none; box-shadow: 0 0 0 4px rgba(218,165,32,0.12); }
      .ayurveda-card.selected { border-color: rgba(218,165,32,0.6); box-shadow: 0 28px 70px rgba(184,134,11,0.2); }
      .card-title { color: var(--text-dark); }
      .card-sub { color: var(--muted-text); }

      .ayurveda-page {
        min-height: 100vh;
        position: relative;
        overflow: hidden;
        padding-top: 0;
        padding-bottom: 3rem;
        background:
          radial-gradient(ellipse at top left, rgba(255,183,77,0.12), transparent 30%),
          radial-gradient(ellipse at bottom right, rgba(139,69,19,0.12), transparent 30%),
          linear-gradient(135deg, var(--bg-dark-1) 0%, var(--bg-dark-2) 25%, var(--bg-dark-3) 50%, var(--bg-dark-2) 75%, var(--bg-dark-1) 100%);
        color: var(--card-bg);
      }
      .ayurveda-page[data-theme='light'] {
        background:
          radial-gradient(ellipse at top left, rgba(255,240,210,0.6), transparent 20%),
          radial-gradient(ellipse at bottom right, rgba(245,232,210,0.6), transparent 25%),
          linear-gradient(180deg, var(--light-bg) 0%, var(--light-surface) 100%);
        color: var(--text-dark);
      }
      .ayurveda-page[data-theme='light'] .ayurveda-card {
        background: linear-gradient(135deg, #fffdf7 0%, #fffbf2 100%);
        box-shadow: 0 12px 30px rgba(34, 11, 4, 0.06);
        border: 1px solid rgba(218,165,32,0.06);
      }
      .ayurveda-page[data-theme='light'] .card-sub { color: var(--light-muted); }

      .ayurveda-page[data-theme='light'] .mandala-rotate { opacity: 0.06; }
      .ayurveda-page .mandala-rotate { opacity: 0.05; }

      .custom-scrollbar::-webkit-scrollbar { width:8px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: var(--scroll-track); border-radius:4px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2)); border-radius:4px; }

      @media (prefers-reduced-motion: reduce) {
        .mandala-rotate, .herb-float-1, .herb-float-2, .breathe-1, .pulse-ring, .golden-pulse { animation: none !important; }
        .ayurveda-card:hover { transform: none; box-shadow: 0 10px 20px rgba(0,0,0,0.08); }
      }

      .header-brand { display:flex; align-items:center; gap:0.75rem; }
      .brand-mark { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:700; color:white; background: linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2)); box-shadow: 0 6px 18px rgba(184,134,11,0.18); }
      .search-input { background: rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.04); color: inherit; width: 220px; transition: all 0.18s ease; }
      .search-input:focus { outline:none; box-shadow: 0 4px 18px rgba(218,165,32,0.08); transform: translateY(-1px); background: rgba(255,255,255,0.09); }
    `;
    const el = document.createElement('style');
    el.id = 'ayurveda-theme-inline';
    el.innerHTML = css;
    document.head.appendChild(el);
    return () => {
      const e = document.getElementById('ayurveda-theme-inline');
      if (e) e.remove();
    };
  }, []);

  // Persist theme preference
  useEffect(() => {
    const saved = localStorage.getItem('uiTheme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('uiTheme', theme);
  }, [theme]);


  // Add this useEffect for debugging
useEffect(() => {
  console.log('[Debug] prakritiScores updated:', prakritiScores);
  if (prakritiScores) {
    console.log('[Debug] ML Prediction:', prakritiScores.ml_prediction);
    console.log('[Debug] Percentages:', prakritiScores.percent);
  }
}, [prakritiScores]);

  /* ---------- Load data from Supabase ONLY ---------- */
 /* ---------- Auth startup + subscribe to Supabase auth changes ---------- */
// Replace the useEffect and loadDashboardData in Dashboard.tsx

useEffect(() => {
  let mounted = true;

  const init = async () => {
    try {
      console.log('[Dashboard:init] Starting authentication check...');

      // Method 1: Try Supabase session first
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.user?.id && !error) {
        console.log('[Dashboard:init] Valid Supabase session found:', session.user.id);
        if (mounted) {
          await loadDashboardData(session.user.id);
        }
        return;
      }

      // Method 2: Check localStorage for user data (fallback)
      const storedUserJson = localStorage.getItem('user');
      if (storedUserJson) {
        try {
          const parsed = JSON.parse(storedUserJson);
          if (parsed?.id) {
            console.log('[Dashboard:init] Found user in localStorage:', parsed.id);
            if (mounted) {
              await loadDashboardData(parsed.id);
            }
            return;
          }
        } catch (e) {
          console.warn('[Dashboard:init] Failed to parse localStorage user:', e);
        }
      }

      // Method 3: Check location state (from questionnaire completion)
      if (location.state?.prakritiScores) {
        // Direct prakritiScores from questionnaire
        setPrakritiScores(location.state.prakritiScores);
        console.log('[Dashboard] Loaded prakritiScores from location state:', location.state.prakritiScores);
      } else if (location.state?.fromQuestionnaire && location.state?.prakritiResults) {
        // Legacy format support
        const results = location.state.prakritiResults;
        setPrakritiScores({
          vata: results.scores.vata,
          pitta: results.scores.pitta,
          kapha: results.scores.kapha,
          dominant: results.dominant,
          percent: results.percent
        });
        if (results.mentalHealth) {
          setMentalHealth({
            level: results.mentalHealth.level,
            score: results.mentalHealth.score
          });
        }
        setLoading(false);
        return;
      }

      // No valid authentication found
      console.warn('[Dashboard:init] No authentication found - redirecting to login');
      navigate('/auth/phone');

    } catch (err) {
      console.error('[Dashboard:init] Initialization failed:', err);
      if (mounted) {
        navigate('/auth/phone');
      }
    }
  };

  // Listen for auth state changes (only for Supabase sessions)
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Dashboard] Auth state changed:', event);
    
    if (event === 'SIGNED_IN' && session?.user?.id && mounted) {
      await loadDashboardData(session.user.id);
    } else if (event === 'SIGNED_OUT') {
      setUser(null);
      setPrakritiScores(null);
      // Clear localStorage as well
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/auth/phone');
    }
  });

  init();

  return () => {
    mounted = false;
    authListener?.subscription?.unsubscribe();
  };
}, [location.state, navigate]);

// Replace the loadDashboardData function in your Dashboard.tsx (around line 300-450)

const loadDashboardData = async (userId: string) => {
  try {
    setLoading(true);
    setError('');
    console.log('[Dashboard] Loading data for authenticated user:', userId);

    // Step 1: Get user profile using the profileService for consistent data handling
    let userData = null;
    let useLocalStorageFallback = false;

    try {
      // Use the profileService to get user data with proper JSONB parsing
      const completeProfile = await profileService.getCompleteProfile(userId);
      console.log('[Dashboard] Complete profile from profileService:', completeProfile);

      if (completeProfile?.profile) {
        userData = completeProfile.profile;
        console.log('[Dashboard] User found in database:', userData.first_name, userData.last_name);
      } else {
        console.warn('[Dashboard] No user found in database, trying localStorage fallback');
        useLocalStorageFallback = true;
      }
    } catch (dbError) {
      console.warn('[Dashboard] Database connection error, using localStorage fallback:', dbError);
      useLocalStorageFallback = true;
    }

    // Handle user data (from database or localStorage)
    let formattedUser: AppUser;

    if (userData && !useLocalStorageFallback) {
      // User data already parsed by profileService
      console.log('[Dashboard] Using profileService parsed user data:', userData);

      // Use database data
      formattedUser = {
        id: userData.id,
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || '',
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        email: userData.email,
        role: userData.role
      };
    } else {
      // Fallback to localStorage
      const storedUserJson = localStorage.getItem('user');
      if (storedUserJson) {
        try {
          const parsed = JSON.parse(storedUserJson);
          formattedUser = {
            id: parsed.id,
            name: `${parsed.first_name || ''} ${parsed.last_name || ''}`.trim() || parsed.name || '',
            first_name: parsed.first_name,
            last_name: parsed.last_name,
            phone: parsed.phone,
            email: parsed.email,
            role: parsed.role || 'patient'
          };
          console.log('[Dashboard] Using localStorage user data:', formattedUser.name);
        } catch (parseError) {
          throw new Error('Failed to parse localStorage user data');
        }
      } else {
        throw new Error('No user data available in database or localStorage');
      }
    }

    console.log('[Dashboard] Formatted user data:', formattedUser);
    setUser(formattedUser);

    // Step 2: Get questionnaire data from Supabase (with error handling)
    try {
      const { data: questionnaireData, error: questionnaireError } = await supabase
        .from('questionnaire_answers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (questionnaireError) {
        console.warn('[Dashboard] Questionnaire query error (non-fatal):', questionnaireError);
      }

      if (questionnaireData && questionnaireData.length > 0) {
        const latest = questionnaireData[0];
        console.log('[Dashboard] Questionnaire data found for user');
        
        // Parse scores with proper type safety
        let scoresData: any = {};
        try {
          scoresData = typeof latest.scores === 'string' 
            ? JSON.parse(latest.scores) 
            : (latest.scores || {});
          
          if (!scoresData || typeof scoresData !== 'object') {
            scoresData = {};
          }
        } catch (e) {
          console.warn('[Dashboard] Error parsing scores:', e);
          scoresData = {};
        }
        
        // Parse mental health
        let mentalHealthData = null;
        try {
          mentalHealthData = typeof latest.mental_health_score === 'string'
            ? JSON.parse(latest.mental_health_score)
            : latest.mental_health_score;
        } catch (e) {
          console.warn('[Dashboard] Error parsing mental health score:', e);
        }

        // Create scores object with safe property access
        const rawVata = scoresData && typeof scoresData === 'object' ? scoresData.vata : undefined;
        const rawPitta = scoresData && typeof scoresData === 'object' ? scoresData.pitta : undefined;
        const rawKapha = scoresData && typeof scoresData === 'object' ? scoresData.kapha : undefined;
        const rawDominant = scoresData && typeof scoresData === 'object' ? scoresData.dominant : undefined;
        const rawPercent = scoresData && typeof scoresData === 'object' ? scoresData.percent : undefined;

        const scores: PrakritiScores = {
          vata: Number(rawVata || 0),
          pitta: Number(rawPitta || 0),
          kapha: Number(rawKapha || 0),
          dominant: rawDominant || latest.final_prakriti_assessment || latest.dominant || 'vata',
          percent: rawPercent || calculateDefaultPercents(scoresData)
        };

        // Add ML prediction if available
        if (latest.ml_predictions) {
          try {
            const mlPrediction = typeof latest.ml_predictions === 'string'
              ? JSON.parse(latest.ml_predictions)
              : latest.ml_predictions;
            
            if (mlPrediction && typeof mlPrediction === 'object') {
              scores.ml_prediction = {
                predicted: mlPrediction.predicted || scores.dominant,
                confidence: Number(mlPrediction.confidence || latest.confidence_score || 0),
                probabilities: mlPrediction.probabilities || {}
              };
            }
          } catch (e) {
            console.warn('[Dashboard] Error parsing ML predictions:', e);
          }
        }

        setPrakritiScores(scores);
        console.log('[Dashboard] Prakriti scores set:', scores);
        console.log('[Debug] Prakriti Scores:', scores);

        // Set mental health
        if (mentalHealthData && typeof mentalHealthData === 'object') {
          setMentalHealth({
            level: mentalHealthData.level || 'green',
            score: Number(mentalHealthData.score || 50)
          });
        }
      } else {
        console.log('[Dashboard] No questionnaire data found for user - new user');
        setPrakritiScores(null);
        setMentalHealth(null);
      }
    } catch (questionnaireError) {
      console.warn('[Dashboard] Error loading questionnaire (non-fatal):', questionnaireError);
      // Continue without questionnaire data
      setPrakritiScores(null);
      setMentalHealth(null);
    }

    // Load mock data
    loadMockAppointments();
    loadHealthMetrics();

  } catch (err: any) {
    console.error('[Dashboard] Error loading dashboard data:', err);
    setError(err?.message || 'Failed to load dashboard data');
  } finally {
    setLoading(false);
  }
};

// Helper function to calculate percentages with proper type safety
const calculateDefaultPercents = (scoresData: any): { vata: number; pitta: number; kapha: number } => {
  // Ensure scoresData is an object and has the expected properties
  if (!scoresData || typeof scoresData !== 'object') {
    return { vata: 33, pitta: 33, kapha: 34 };
  }

  // Safe property access with fallbacks
  const vataValue = scoresData.hasOwnProperty('vata') ? scoresData.vata : 0;
  const pittaValue = scoresData.hasOwnProperty('pitta') ? scoresData.pitta : 0;
  const kaphaValue = scoresData.hasOwnProperty('kapha') ? scoresData.kapha : 0;

  const vata = Number(vataValue) || 0;
  const pitta = Number(pittaValue) || 0;
  const kapha = Number(kaphaValue) || 0;
  const total = vata + pitta + kapha;
  
  if (total === 0) {
    return { vata: 33, pitta: 33, kapha: 34 };
  }
  
  return {
    vata: Math.round((vata / total) * 100),
    pitta: Math.round((pitta / total) * 100),
    kapha: Math.round((kapha / total) * 100)
  };
};
  const loadMockAppointments = () => {
    const mockAppointments: Appointment[] = [
      {
        id: '1',
        doctorName: 'Dr. Priya Sharma',
        date: '2025-09-28',
        time: '10:00 AM',
        type: 'Prakriti Analysis',
        status: 'upcoming'
      },
      {
        id: '2',
        doctorName: 'Dr. Raj Kumar',
        date: '2025-09-20',
        time: '2:30 PM',
        type: 'Follow-up Consultation',
        status: 'completed'
      }
    ];
    setAppointments(mockAppointments);
  };

  const loadHealthMetrics = () => {
    const metrics: HealthMetric[] = [
      {
        label: 'Blood Pressure',
        value: '120/80',
        unit: 'mmHg',
        status: 'good',
        icon: '❤️'
      },
      {
        label: 'Weight',
        value: 68,
        unit: 'kg',
        status: 'good',
        icon: '⚖️'
      },
      {
        label: 'Sleep Quality',
        value: 85,
        unit: '%',
        status: 'good',
        icon: '😴'
      },
      {
        label: 'Stress Level',
        value: 6,
        unit: '/10',
        status: 'warning',
        icon: '🧘'
      }
    ];
    setHealthMetrics(metrics);
  };

  const handleTakeQuestionnaire = () => {
  navigate('/auth/prakriti-questionnaire', {
    state: { userId: user?.id }
  });
};

 const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
    setUser(null);
    setPrakritiScores(null);
    navigate('/auth/phone');
  } catch (error) {
    console.error('[Dashboard] Logout error:', error);
  }
};

  const getColorClass = (type: string) => {
    switch (type) {
      case 'vata': return 'bg-blue-500';
      case 'pitta': return 'bg-red-500';
      case 'kapha': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getDescription = (type: string) => {
    switch (type) {
      case 'vata': return 'Air & Space - Creative, Quick, Light';
      case 'pitta': return 'Fire & Water - Focused, Intense, Warm';
      case 'kapha': return 'Earth & Water - Steady, Calm, Strong';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  /* ---------- ENHANCED animated Prakriti Donut + mini-bar graph ---------- */
  const circumference = 2 * Math.PI * 30; // r=30

  const EnhancedPrakritiVisualization: React.FC<{ scores: PrakritiScores, focus?: boolean }> = ({ scores, focus }) => {
    // compute stroke lengths
    const vLen = (scores.percent.vata / 100) * circumference;
    const pLen = (scores.percent.pitta / 100) * circumference;
    const kLen = (scores.percent.kapha / 100) * circumference;

    // offsets for stacking
    const vOffset = 0;
    const pOffset = -vLen;
    const kOffset = -(vLen + pLen);

    // small array for bars
    const bars = [
      { key: 'vata', label: 'Vata', pct: scores.percent.vata, color: '#3b82f6' },
      { key: 'pitta', label: 'Pitta', pct: scores.percent.pitta, color: '#ef4444' },
      { key: 'kapha', label: 'Kapha', pct: scores.percent.kapha, color: '#22c55e' },
    ];

    return (
      <div ref={chartRef} className="bg-gray-50 rounded-xl p-6 ayurveda-card custom-scrollbar" style={{ overflow: 'visible' }}>
        <h4 className="text-lg font-semibold text-gray-800 mb-6 text-center">Prakriti Distribution</h4>

        <div className="h-80 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Animated donut */}
          <div style={{ width: 260, height: 260, position: 'relative' }}>
            <svg viewBox="0 0 100 100" className="w-full h-full" style={{ overflow: 'visible' }}>
              {/* subtle background ring */}
              <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(34,11,4,0.06)" strokeWidth="12" />

              {/* Vata */}
              <motion.circle
                cx="50" cy="50" r="30" fill="none" stroke="#3b82f6" strokeWidth="10"
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 }}
                animate={{ strokeDasharray: `${vLen} ${circumference}`, strokeDashoffset: vOffset }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />

              {/* Pitta */}
              <motion.circle
                cx="50" cy="50" r="30" fill="none" stroke="#ef4444" strokeWidth="10"
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 }}
                animate={{ strokeDasharray: `${pLen} ${circumference}`, strokeDashoffset: pOffset }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.12 }}
              />

              {/* Kapha */}
              <motion.circle
                cx="50" cy="50" r="30" fill="none" stroke="#22c55e" strokeWidth="10"
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 }}
                animate={{ strokeDasharray: `${kLen} ${circumference}`, strokeDashoffset: kOffset }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.24 }}
              />

              {/* rotating sheen */}
              <defs>
                <linearGradient id="sheen" x1="0" x2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                </linearGradient>
              </defs>
              <motion.circle
                cx="50" cy="50" r="33" fill="none" stroke="url(#sheen)" strokeWidth="2"
                strokeDasharray="4 6"
                initial={{ rotate: 0, opacity: 0.6 }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                style={{ transformOrigin: '50% 50%' }}
              />
            </svg>

            {/* center info with pulsing ring */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0.85 }}
                animate={{ scale: focus ? [1, 1.1, 1] : [1, 1.02, 1], opacity: [1, 0.9, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(78,139,58,0.12)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(245,245,240,0.95))'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#2c1810', textTransform: 'capitalize' }}>{scores.dominant}</div>
                  <div style={{ fontSize: 12, color: '#6b4423' }}>Dominant</div>
                </div>
              </motion.div>

              {/* pulsing halo */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0.25 }}
                animate={{ scale: [0.9, 1.4], opacity: [0.25, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  border: `1px solid rgba(78,139,58,0.06)`,
                  top: 'calc(50% - 80px)',
                  left: 'calc(50% - 80px)',
                  pointerEvents: 'none'
                }}
              />
            </div>
          </div>

          {/* Mini bar visualization */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">Dosha Strengths</div>
                <div className="text-xs text-gray-500">Interactive</div>
              </div>
            </div>

            <div className="space-y-3">
              {bars.map((b, i) => (
                <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 76, fontSize: 13, fontWeight: 700, color: '#333' }}>{b.label}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: '#f1f3f5', height: 14, borderRadius: 8, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${b.pct}%` }}
                        transition={{ duration: 0.9, delay: 0.08 * i, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${b.color}, ${b.color}bb)` }}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{b.pct}%</div>
                  </div>
                </div>
              ))}
            </div>

            {/* small tips with micro-animations */}
            <div className="mt-6 p-3 rounded-lg" style={{ background: 'rgba(78,139,58,0.04)' }}>
              <div className="text-sm font-medium" style={{ color: '#2c1810' }}>Tip</div>
              <div className="text-xs" style={{ color: '#5a4a2f' }}>
                Tap each card on dashboard to explore — the visualization will animate and highlight findings.
              </div>
            </div>
          </div>
        </div>

        {/* legend */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-lg font-bold text-blue-600">{scores.percent.vata}%</div>
            <div className="text-sm text-blue-800 font-medium">Vata</div>
            <div className="text-xs text-gray-600 mt-1">Air & Space</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-lg font-bold text-red-600">{scores.percent.pitta}%</div>
            <div className="text-sm text-red-800 font-medium">Pitta</div>
            <div className="text-xs text-gray-600 mt-1">Fire & Water</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-lg font-bold text-green-600">{scores.percent.kapha}%</div>
            <div className="text-sm text-green-800 font-medium">Kapha</div>
            <div className="text-xs text-gray-600 mt-1">Earth & Water</div>
          </div>
        </div>
      </div>
    );
  };

  /* ---------- helper - toggle theme, keyboard selection ---------- */
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const onCardKey = (e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedCard(prev => prev === id ? null : id);
    }
  };

  /* ---------- focus visualization effect: scroll into view & trigger pulsing ---------- */
  useEffect(() => {
    if (activeView === 'health' && focusVisualization && chartRef.current) {
      // scroll chart into view smoothly
      chartRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // after a short delay remove focus flag so animation doesn't loop forever
      const t = setTimeout(() => setFocusVisualization(false), 1400);
      return () => clearTimeout(t);
    }
  }, [activeView, focusVisualization]);

  /* ---------- loading / error / no-user states ---------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ayurveda-page" data-theme={theme}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800 mx-auto mb-4" />
          <p className={theme === 'dark' ? 'text-amber-100' : 'text-gray-700'}>Loading your dashboard...</p>
          <p className={theme === 'dark' ? 'text-amber-200' : 'text-gray-500'}>Analyzing your Prakriti results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center ayurveda-page" data-theme={theme}>
        <div className="text-center max-w-md mx-auto p-6 ayurveda-card">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h3 className="font-bold">Error Loading Dashboard</h3>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg transition-colors mr-3"
            style={{ background: 'linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2))', color: '#2c1810' }}
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/auth/phone')}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'rgba(255,248,220,0.85)', border: '1px solid var(--card-border)', color: '#6b4423' }}
          >
            Login Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center ayurveda-page" data-theme={theme}>
        <div className="text-center ayurveda-card p-8">
          <p className={theme === 'dark' ? 'text-amber-100' : 'text-gray-700'}>No user data found. Redirecting to login...</p>
          <button
            onClick={() => navigate('/auth/phone')}
            className="mt-4 px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2))', color: '#2c1810' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------- small helper used previously ---------- */
  const renderPrakritiChart = () => {
    if (!prakritiScores) return null;
    return <EnhancedPrakritiVisualization scores={prakritiScores} focus={focusVisualization} />;
  };

  /* ---------- main render ---------- */
  return (
    <div className="ayurveda-page" data-theme={theme}>
      {/* Mandala overlay */}
      <div className="fixed inset-0 opacity-6 pointer-events-none mandala-rotate" style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, transparent 30%, rgba(255,183,77,0.08) 30.5%, transparent 31%),
          radial-gradient(circle at 80% 80%, transparent 30%, rgba(255,183,77,0.08) 30.5%, transparent 31%),
          radial-gradient(circle at 50% 50%, transparent 40%, rgba(255,183,77,0.08) 40.5%, transparent 41%)
        `
      }} />

      {/* Floating herbs */}
      <div className="fixed w-10 h-10 top-[8%] left-[8%] rounded-full herb-float-1" style={{ background: 'radial-gradient(circle, #8b6914 0%, transparent 70%)', opacity: 0.12 }} />
      <div className="fixed w-14 h-14 top-[72%] right-[12%] rounded-full herb-float-2" style={{ background: 'radial-gradient(circle, #cd853f 0%, transparent 70%)', opacity: 0.12 }} />

      {/* Breathing light */}
      <div className="fixed w-96 h-96 md:w-[600px] md:h-[600px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="absolute inset-0 rounded-full breathe-1" style={{ background: 'radial-gradient(circle, rgba(255,183,77,0.32), rgba(218,165,32,0.06) 40%, transparent 70%)' }} />
      </div>

      {/* Pulse rings (kept visual but subtle) */}
      <div className="fixed w-[800px] h-[800px] top-1/2 left-1/2 border border-yellow-400/10 rounded-full pulse-ring" />
      <div className="fixed w-[900px] h-[900px] top-1/2 left-1/2 border border-yellow-400/8 rounded-full pulse-ring" />

      {/* Header */}
      <header className="bg-white/30 backdrop-blur-sm sticky top-0 z-40" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="header-brand">
                <div className="brand-mark" title="Swastya Sync">
                  🕉️
                </div>
                <div>
                  <div className="text-lg font-bold" style={{ color: theme === 'dark' ? 'var(--accent-gold-3)' : '#6b4423' }}>Swastya Sync</div>
                  <div className="text-xs card-sub">Personalized Ayurvedic Care</div>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center ml-8 space-x-6">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'dashboard'
                      ? 'bg-amber-100/10 text-amber-200'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('health')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'health'
                      ? 'bg-amber-100/10 text-amber-200'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Health Profile
                </button>
                {prakritiScores && (
                  <button
                    onClick={() => setActiveView('visualization')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === 'visualization'
                        ? 'bg-amber-100/10 text-amber-200'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Visualization
                  </button>
                )}
                <button
                  onClick={() => setActiveView('appointments')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'appointments'
                      ? 'bg-amber-100/10 text-amber-200'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Appointments
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-white hover:bg-white/10"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Header Right: search, theme toggle, profile */}
            <div className="hidden md:flex items-center space-x-3">
              <input
                placeholder="Search records, tips, doctors..."
                className="search-input hidden sm:block"
                aria-label="Search"
                onFocus={(e) => e.currentTarget.setAttribute('placeholder', 'Search (e.g. ' + (prakritiScores?.dominant || 'vata') + ')')}
                onBlur={(e) => e.currentTarget.setAttribute('placeholder', 'Search records, tips, doctors...')}
              />

              <button
                onClick={toggleTheme}
                title="Toggle theme"
                className="px-3 py-2 rounded-md transition-colors"
                style={{
                  background: theme === 'dark'
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
                    : 'rgba(34,34,34,0.04)',
                  color: theme === 'dark' ? '#fffaf2' : 'var(--muted-brown)'
                }}
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>

              <button
                onClick={() => setShowProfileManager(true)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <div className="w-8 h-8" style={{
                  background: 'linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2))',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(184,134,11,0.18)',
                  color: '#2c1810',
                  fontWeight: 700
                }}>
                  {user?.name?.[0] || user?.first_name?.[0] || 'U'}
                </div>
                <span className="hidden md:block" style={{ color: theme === 'dark' ? 'white' : 'var(--muted-brown)' }}>
                  {user.name || `${user.first_name} ${user.last_name}`}
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#6b4423' }}
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden py-4 px-4 border-t border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium text-left ${
                    activeView === 'dashboard'
                      ? 'bg-amber-100/10 text-amber-200'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => { setActiveView('health'); setMobileMenuOpen(false); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium text-left ${
                    activeView === 'health'
                      ? 'bg-amber-100/10 text-amber-200'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Health Profile
                </button>
                {prakritiScores && (
                  <button
                    onClick={() => { setActiveView('visualization'); setMobileMenuOpen(false); }}
                    className={`px-3 py-2 rounded-md text-sm font-medium text-left ${
                      activeView === 'visualization'
                        ? 'bg-amber-100/10 text-amber-200'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Visualization
                  </button>
                )}
                <button
                  onClick={() => { setActiveView('appointments'); setMobileMenuOpen(false); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium text-left ${
                    activeView === 'appointments'
                      ? 'bg-amber-100/10 text-amber-200'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Appointments
                </button>
                
                {/* Mobile profile actions */}
                <div className="pt-4 mt-4 border-t border-white/10">
                  <button
                    onClick={() => { setShowProfileManager(true); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: theme === 'dark' ? 'var(--accent-gold-3)' : 'var(--muted-brown)' }}>
                Welcome back, {user.name || user.first_name}!
              </h2>
              <p className={theme === 'dark' ? 'text-amber-200' : 'text-gray-700'}>
                Here's your personalized health dashboard based on your Prakriti assessment.
              </p>
            </div>

            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Prakriti Type Card */}
              <div
                tabIndex={0}
                role="button"
                onClick={() => setSelectedCard(prev => prev === 'dominant' ? null : 'dominant')}
                onKeyDown={(e) => onCardKey(e, 'dominant')}
                className={`bg-white rounded-xl p-6 border-t-4 border-indigo-500 transform transition-transform ayurveda-card ${selectedCard === 'dominant' ? 'selected golden-pulse' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium card-title">Dominant Constitution</h3>
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-gray-800 capitalize mb-1">
                  {prakritiScores?.dominant || 'Not Assessed'}
                </p>
                {prakritiScores?.ml_prediction && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-green-600 font-medium">
                      AI Confidence: {Math.round((prakritiScores.ml_prediction.confidence ?? 0) * 100)}%
                    </span>
                  </div>
                )}
                <p className="text-xs card-sub mt-1">Your primary constitution</p>
              </div>

              {/* Mental Health Card */}
              <div
                tabIndex={0}
                role="button"
                onClick={() => setSelectedCard(prev => prev === 'mental' ? null : 'mental')}
                onKeyDown={(e) => onCardKey(e, 'mental')}
                className={`bg-white rounded-xl p-6 border-t-4 border-green-500 ayurveda-card ${selectedCard === 'mental' ? 'selected golden-pulse' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium card-title">Mental Wellness</h3>
                  <div className={`w-4 h-4 rounded-full ${
                    mentalHealth?.level === 'green' ? 'bg-green-500' :
                    mentalHealth?.level === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {mentalHealth?.score || 'N/A'}{mentalHealth?.score ? '/100' : ''}
                </p>
                <p className="text-xs card-sub mt-1">Current assessment</p>
              </div>

              {/* Visualize Results Card - NEW: clickable to open health view & focus visualization */}
              <div
                tabIndex={0}
                role="button"
                onClick={() => { setActiveView('visualization'); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveView('visualization'); } }}
                className={`bg-white rounded-xl p-6 border-t-4 border-teal-500 ayurveda-card ${selectedCard === 'visualize' ? 'selected golden-pulse' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium card-title">Visualize Results</h3>
                  <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-800 mb-1">Open animated charts</p>
                <p className="text-xs card-sub mt-1">Click to view interactive Prakriti visualizations</p>
              </div>

              {/* Profile Completeness */}
              <div
                tabIndex={0}
                role="button"
                onClick={() => setSelectedCard(prev => prev === 'profile' ? null : 'profile')}
                onKeyDown={(e) => onCardKey(e, 'profile')}
                className={`bg-white rounded-xl p-6 border-t-4 border-orange-500 ayurveda-card ${selectedCard === 'profile' ? 'selected golden-pulse' : ''}`}

              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium card-title">Profile Complete</h3>
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {prakritiScores ? '100%' : '60%'}
                </p>
                <p className="text-xs card-sub mt-1">
                  {prakritiScores ? 'All assessments complete' : 'Prakriti assessment pending'}
                </p>
              </div>
            </div>

            {/* Health Metrics */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4" style={{ color: theme === 'dark' ? 'var(--accent-gold-3)' : 'var(--muted-brown)' }}>Health Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {healthMetrics.map((metric, index) => (
                  <div
                    key={index}
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelectedCard(prev => prev === metric.label ? null : metric.label)}
                    onKeyDown={(e) => onCardKey(e, metric.label)}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(metric.status)} ayurveda-card ${selectedCard === metric.label ? 'selected' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{metric.icon}</span>
                      <div className={`w-3 h-3 rounded-full ${
                        metric.status === 'good' ? 'bg-green-500' :
                        metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                    <h4 className="font-medium text-gray-800">{metric.label}</h4>
                    <p className="text-xl font-bold text-gray-800">
                      {metric.value} {metric.unit}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <button
                onClick={handleTakeQuestionnaire}
                className="bg-white rounded-xl p-6 hover:shadow-xl transition-all text-left group ayurveda-card"
                aria-label="Take Prakriti Assessment"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Prakriti Assessment</h4>
                <p className="text-sm text-gray-600 mb-4">
                  {prakritiScores ? 'Retake your constitution analysis' : 'Discover your unique constitution'}
                </p>
                <div className="text-amber-700 font-medium text-sm group-hover:text-amber-800">
                  {prakritiScores ? 'Retake Assessment →' : 'Take Assessment →'}
                </div>
              </button>

              <button
                onClick={() => setShowAppointmentBooking(true)}
                className="bg-white rounded-xl p-6 hover:shadow-xl transition-all text-left group ayurveda-card"
                aria-label="Book Appointment"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Book Appointment</h4>
                <p className="text-sm text-gray-600 mb-4">Schedule consultation with Ayurvedic experts</p>
                <div className="text-green-600 font-medium text-sm group-hover:text-green-700">
                  Book Now →
                </div>
              </button>

              <button
                onClick={() => setShowProfileManager(true)}
                className="bg-white rounded-xl p-6 hover:shadow-xl transition-all text-left group ayurveda-card"
                aria-label="Manage Profile"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Manage Profile</h4>
                <p className="text-sm text-gray-600 mb-4">Update personal and health information</p>
                <div className="text-purple-600 font-medium text-sm group-hover:text-purple-700">
                  Edit Profile →
                </div>
              </button>

              <button
                className="bg-white rounded-xl p-6 hover:shadow-xl transition-all text-left group ayurveda-card"
                disabled={!prakritiScores}
                onClick={() => setActiveView('nutrition')}
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Personalized Diet</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Nutrition plan for {prakritiScores?.dominant || 'your constitution'}
                </p>
                <div className={`font-medium text-sm ${
                  prakritiScores ? 'text-orange-600 group-hover:text-orange-700' : 'text-gray-400'
                }`}>
                  {prakritiScores ? 'View Plan →' : 'Assessment Required'}
                </div>
              </button>
            </div>
          </>
        )}

        {/* Health Profile View - ENHANCED */}
{activeView === 'health' && (
  <>
    <div className="mb-8">
      <h2 className="text-3xl font-bold mb-2" style={{ color: theme === 'dark' ? 'var(--accent-gold-3)' : 'var(--muted-brown)' }}>Health Profile</h2>
      <p className={theme === 'dark' ? 'text-amber-200' : 'text-gray-700'}>Comprehensive view of your health data and Prakriti analysis</p>
    </div>

    {prakritiScores ? (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold" style={{ color: theme === 'dark' ? 'var(--accent-gold-3)' : 'var(--muted-brown)' }}>Your Comprehensive Prakriti Analysis</h3>
          {prakritiScores.ml_prediction && (
            <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-full border border-blue-200">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium text-blue-800">
                Powered by AI & Traditional Analysis
              </span>
            </div>
          )}
        </div>
                {/* USE THE ENHANCED PRAKRITI SUMMARY CARD */}
                <PrakritiSummaryCard scores={prakritiScores} />

                {/* ADDITIONAL ORIGINAL VISUALIZATION FOR COMPARISON */}
                <div className="mt-8 ayurveda-card overflow-hidden">
                  <div className="p-6">
                    <h4 className="text-xl font-bold mb-6 text-center text-gray-800">Interactive Dashboard Visualization</h4>
                    
                    {prakritiScores.ml_prediction && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span className="text-sm font-medium text-gray-700">
                              AI Prediction Confidence
                            </span>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {Math.round(prakritiScores.ml_prediction.confidence * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${prakritiScores.ml_prediction.confidence * 100}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Enhanced animated visual */}
                      {renderPrakritiChart()}

                      <div className="space-y-6">
                        {['vata', 'pitta', 'kapha'].map((dosha) => (
                          <div key={dosha}>
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <span className="font-semibold text-gray-800 text-lg capitalize">{dosha}</span>
                                <span className="text-sm text-gray-500 ml-2 block">{getDescription(dosha)}</span>
                              </div>
                              <span className={`text-2xl font-bold ${
                                dosha === 'vata' ? 'text-blue-600' :
                                dosha === 'pitta' ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {prakritiScores.percent[dosha as keyof typeof prakritiScores.percent]}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                              <motion.div
                                className={`h-4 rounded-full transition-all duration-1000 shadow-sm ${
                                  dosha === 'vata' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                                  dosha === 'pitta' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                                  'bg-gradient-to-r from-green-400 to-green-600'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${prakritiScores.percent[dosha as keyof typeof prakritiScores.percent]}%` }}
                                transition={{ duration: 1.5, delay: 0.3 }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 ayurveda-card">
                      <div className="text-center">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Your Dominant Constitution</h4>
                        <p className="text-3xl font-bold text-gray-800 capitalize mb-2">
                          {prakritiScores.dominant} Prakriti
                        </p>
                        <p className="text-sm text-gray-600">{getDescription(prakritiScores.dominant)}</p>
                        <div className="mt-4 flex justify-center">
                          <motion.div 
                            className={`w-16 h-16 ${getColorClass(prakritiScores.dominant)} rounded-full flex items-center justify-center shadow-lg`}
                            whileHover={{ scale: 1.1 }}
                            animate={{ 
                              boxShadow: [
                                '0 10px 20px rgba(0,0,0,0.1)',
                                '0 20px 40px rgba(0,0,0,0.2)',
                                '0 10px 20px rgba(0,0,0,0.1)'
                              ]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                          >
                            <span className="text-white font-bold text-lg capitalize">
                              {prakritiScores.dominant[0].toUpperCase()}
                            </span>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            
            {/* NEW: Enhanced Visualization Component */}
            <div className="mt-8 ayurveda-card overflow-hidden">
              <div className="p-6">
                <h4 className="text-xl font-bold mb-6 text-center text-gray-800">Enhanced ML Visualization</h4>
                <PrakritiVisualizationEnhanced  scores={prakritiScores} />
              </div>
            </div>
          </div>
            ) : (
              <div className="mb-8">
                <div className="ayurveda-card p-8 text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Complete Your Prakriti Assessment</h3>
                  <p className="text-gray-600 mb-6">
                    Discover your unique Ayurvedic constitution and get personalized health recommendations with ML-powered analysis.
                  </p>
                  <button
                    onClick={handleTakeQuestionnaire}
                    className="px-6 py-3 rounded-lg transition-colors"
                    style={{ background: 'linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2))', color: '#2c1810' }}
                  >
                    Take Assessment Now
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="ayurveda-card p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Health Recommendations</h4>
                {prakritiScores ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-800 mb-2">Diet Guidelines</h5>
                      <p className="text-sm text-blue-700">
                        {prakritiScores.dominant === 'vata' && 'Focus on warm, moist, grounding foods. Avoid cold, dry foods.'}
                        {prakritiScores.dominant === 'pitta' && 'Choose cooling, sweet, bitter foods. Avoid hot, spicy dishes.'}
                        {prakritiScores.dominant === 'kapha' && 'Prefer light, warm, spicy foods. Limit heavy, oily foods.'}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h5 className="font-medium text-green-800 mb-2">Lifestyle Tips</h5>
                      <p className="text-sm text-green-700">
                        {prakritiScores.dominant === 'vata' && 'Maintain regular routines, get adequate rest, practice calming activities.'}
                        {prakritiScores.dominant === 'pitta' && 'Stay cool, avoid overexertion, practice moderation in all activities.'}
                        {prakritiScores.dominant === 'kapha' && 'Stay active, wake up early, engage in stimulating activities.'}
                      </p>
                    </div>
                    {prakritiScores.ml_prediction && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h5 className="font-medium text-purple-800 mb-2">AI Insights</h5>
                        <p className="text-sm text-purple-700">
                          Our machine learning model analyzed your responses with {Math.round(prakritiScores.ml_prediction.confidence * 100)}% confidence. 
                          The AI prediction aligns with traditional Ayurvedic analysis.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Complete your Prakriti assessment to receive personalized recommendations.
                  </p>
                )}
              </div>

              <div className="ayurveda-card p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Mental Wellness</h4>
                {mentalHealth ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">Current Score</span>
                      <span className={`text-2xl font-bold ${
                        mentalHealth.level === 'green' ? 'text-green-600' :
                        mentalHealth.level === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                      }`}>{mentalHealth.score}/100</span>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h5 className="font-medium text-green-800 mb-2">Wellness Tips</h5>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Practice daily meditation or mindfulness</li>
                        <li>• Maintain regular sleep schedule</li>
                        <li>• Engage in physical activities you enjoy</li>
                        <li>• Connect with supportive friends and family</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Mental wellness assessment not available.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Visualization View - NEW IMPLEMENTATION */}
        {activeView === 'visualization' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: theme === 'dark' ? 'var(--accent-gold-3)' : 'var(--muted-brown)' }}>Prakriti Visualization</h2>
              <p className={theme === 'dark' ? 'text-amber-200' : 'text-gray-700'}>Interactive charts and graphs showing your Prakriti analysis</p>
            </div>

            {prakritiScores ? (
              <div className="mb-8">
                <PrakritiVisualizationEnhanced  scores={prakritiScores} />
              </div>
            ) : (
              <div className="mb-8">
                <div className="ayurveda-card p-8 text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Complete Your Prakriti Assessment</h3>
                  <p className="text-gray-600 mb-6">
                    Discover your unique Ayurvedic constitution and visualize your results with interactive charts.
                  </p>
                  <button
                    onClick={handleTakeQuestionnaire}
                    className="px-6 py-3 rounded-lg transition-colors"
                    style={{ background: 'linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2))', color: '#2c1810' }}
                  >
                    Take Assessment Now
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Appointments View (unchanged) */}
        {activeView === 'appointments' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: theme === 'dark' ? 'var(--accent-gold-3)' : 'var(--muted-brown)' }}>Appointments</h2>
                <p className={theme === 'dark' ? 'text-amber-200' : 'text-gray-700'}>Manage your consultations and health appointments</p>
              </div>
              <button
                onClick={() => setShowAppointmentBooking(true)}
                className="px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                style={{ background: 'linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2))', color: '#2c1810' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Book New Appointment</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="ayurveda-card p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Appointments</h3>
                <div className="space-y-4">
                  {appointments.filter(apt => apt.status === 'upcoming').length > 0 ? (
                    appointments.filter(apt => apt.status === 'upcoming').map((appointment) => (
                      <div key={appointment.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-800">{appointment.doctorName}</h4>
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                            {appointment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{appointment.type}</p>
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p>No upcoming appointments</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="ayurveda-card p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointment History</h3>
                <div className="space-y-4">
                  {appointments.filter(apt => apt.status !== 'upcoming').length > 0 ? (
                    appointments.filter(apt => apt.status !== 'upcoming').map((appointment) => (
                      <div key={appointment.id} className="p-4 border border-gray-200 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-800">{appointment.doctorName}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            appointment.status === 'completed' ? 'bg-green-200 text-green-800' :
                            appointment.status === 'cancelled' ? 'bg-red-200 text-red-800' :
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{appointment.type}</p>
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                      <p>No appointment history</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Nutrition View */}
        {activeView === 'nutrition' && (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2" style={{ color: theme === 'dark' ? 'var(--accent-gold-3)' : 'var(--muted-brown)' }}>Personalized Nutrition Plan</h2>
                  <p className={theme === 'dark' ? 'text-amber-200' : 'text-gray-700'}>Ayurvedic diet recommendations based on your {prakritiScores?.dominant || 'Prakriti'} constitution</p>
                </div>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="px-4 py-2 rounded-lg transition-colors flex items-center"
                  style={{ background: 'rgba(255,248,220,0.85)', border: '1px solid var(--card-border)', color: '#6b4423' }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </button>
              </div>
            </div>

            {prakritiScores ? (
              <div className="mb-8">
                <NutritionDashboard />
              </div>
            ) : (
              <div className="mb-8">
                <div className="ayurveda-card p-8 text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Complete Your Prakriti Assessment</h3>
                  <p className="text-gray-600 mb-6">
                    Get personalized Ayurvedic nutrition recommendations based on your unique constitution.
                  </p>
                  <button
                    onClick={handleTakeQuestionnaire}
                    className="px-6 py-3 rounded-lg transition-colors"
                    style={{ background: 'linear-gradient(135deg, var(--accent-gold-1), var(--accent-gold-2))', color: '#2c1810' }}
                  >
                    Take Assessment Now
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Additional Information Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="ayurveda-card p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Recent Activity</h4>
            <p className="text-sm text-gray-600">
              {prakritiScores ? 
                `Prakriti assessment completed. Dominant constitution: ${prakritiScores.dominant}` :
                'No recent activity. Consider taking your Prakriti assessment.'
              }
            </p>
          </div>

          <div className="chat-panel">
            <ChatWidget />
          </div>

          <div className="ayurveda-card p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Health Tips</h4>
            <p className="text-sm text-gray-600">
              {prakritiScores?.dominant === 'vata' && 'Stay warm, eat regularly, and maintain consistent routines.'}
              {prakritiScores?.dominant === 'pitta' && 'Keep cool, avoid spicy foods, and practice stress management.'}
              {prakritiScores?.dominant === 'kapha' && 'Stay active, eat light foods, and maintain regular exercise.'}
              {!prakritiScores && 'Complete your assessment to get personalized health recommendations.'}
            </p>
          </div>

          <div className="ayurveda-card p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Support</h4>
            <p className="text-sm text-gray-600 mb-3">
              Need help with your Prakriti analysis or health recommendations? Contact our support team.
            </p>
            <button className="text-sm font-medium" style={{ color: 'var(--accent-gold-2)' }}>
              Contact Support
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500 ayurveda-card p-4">
          <p>
            Prakriti analysis and recommendations are for informational purposes only and not a substitute for professional medical advice. 
            Always consult with qualified healthcare providers for medical concerns.
          </p>
        </div>
      </main>

      {/* Modals */}
      <ProfileManager isOpen={showProfileManager} onClose={() => setShowProfileManager(false)} />
      <AppointmentBooking isOpen={showAppointmentBooking} onClose={() => setShowAppointmentBooking(false)} />
    </div>
  );
};

export default PatientDashboard;
