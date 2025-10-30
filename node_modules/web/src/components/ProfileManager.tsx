import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { profileService, UserProfile } from '../services/profileService';
import { supabase } from '../utils/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ProfileManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [syncMessage, setSyncMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UserProfile | null>(null);
  
  const profileSubscriptionRef = useRef<RealtimeChannel | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to parse JSON fields in profile data
  const parseProfileData = (profile: any): UserProfile => {
    if (!profile) return profile;
    
    // Use the profileService's parsing function for consistency
    return profileService.parseProfileFields(profile);
  };

  const tabs = [
    { id: 'personal', label: 'Personal Details', icon: '👤' },
    { id: 'medical', label: 'Medical History', icon: '🏥' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '🌿' },
    { id: 'emergency', label: 'Emergency Contact', icon: '🆘' },
  ];

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[ProfileManager] Initializing profile...');

        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[ProfileManager] Session data:', session);
        
        let currentUserId = session?.user?.id;

        // Fallback: Try localStorage if no session
        if (!currentUserId) {
          const storedUser = localStorage.getItem('user');
          console.log('[ProfileManager] No session, checking localStorage:', storedUser);
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              console.log('[ProfileManager] Parsed user from localStorage:', parsed);
              if (parsed?.id) {
                currentUserId = parsed.id;
                console.log('[ProfileManager] Using user from localStorage:', parsed.id);
              }
            } catch (e) {
              console.error('[ProfileManager] Failed parsing localStorage user:', e);
              setError('Failed to load user data');
              setLoading(false);
              return;
            }
          }
        }

        if (!currentUserId) {
          console.error('[ProfileManager] No user ID found');
          setError('No user ID found. Please log in again.');
          setLoading(false);
          return;
        }

        setUserId(currentUserId);
        console.log('[ProfileManager] Current user ID:', currentUserId);

        // Fetch complete profile from database
        try {
          const completeProfile = await profileService.getCompleteProfile(currentUserId);
          console.log('[ProfileManager] Complete profile:', completeProfile);

          if (completeProfile?.profile) {
            setProfile(completeProfile.profile);
            setFormData(completeProfile.profile);
            setHasChanges(false);
            console.log('[ProfileManager] Profile loaded successfully');
          } else {
            console.warn('[ProfileManager] No profile data found');
          }
        } catch (dbErr) {
          console.error('[ProfileManager] Database fetch error:', dbErr);
          setError('Failed to fetch profile from database');
        }

        // Subscribe to real-time profile changes
        profileSubscriptionRef.current = profileService.subscribeToProfile(
          currentUserId,
          (updatedProfile) => {
            console.log('[ProfileManager] Profile updated in real-time:', updatedProfile);
            if (updatedProfile) {
              setProfile(updatedProfile);
              if (!saving) {
                setFormData(updatedProfile);
                setHasChanges(false);
              }
            }
          }
        );

        // Set up auto-refresh every 5 seconds
        autoRefreshRef.current = setInterval(async () => {
          const refreshed = await profileService.getCompleteProfile(currentUserId);
          console.log('[ProfileManager] Auto-refresh profile:', refreshed);
          if (refreshed?.profile && !saving && !hasChanges) {
            setProfile(refreshed.profile);
            setFormData(refreshed.profile);
          }
        }, 5000);

        setLoading(false);
      } catch (err) {
        console.error('[ProfileManager] Initialization error:', err);
        setError('Failed to initialize profile manager');
        setLoading(false);
      }
    };

    if (isOpen) {
      initializeProfile();
    }

    return () => {
      // Clean up subscriptions and intervals
      if (profileSubscriptionRef.current) {
        supabase.removeChannel(profileSubscriptionRef.current);
      }
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [isOpen]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
    });
    setHasChanges(true);
  };

  const handleArrayFieldChange = (fieldName: string, value: string) => {
    const arrayValue = value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    setFormData(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        [fieldName]: arrayValue
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!userId || !formData) return;
    
    try {
      setSaving(true);
      setSyncStatus('syncing');
      setSyncMessage('💾 Saving changes to Ayurvedic profile...');

      const updatedProfile = await profileService.updateProfile(userId, formData);

      if (updatedProfile) {
        setProfile(updatedProfile);
        setFormData(updatedProfile);
        setHasChanges(false);
        setSyncStatus('synced');
        setSyncMessage('✨ Ayurvedic profile updated successfully!');
      }
    } catch (err) {
      console.error('[ProfileManager] Save error:', err);
      setSyncStatus('error');
      setSyncMessage('❌ Failed to save profile');
    } finally {
      setSaving(false);
      setTimeout(() => {
        setSyncMessage('');
      }, 3000);
    }
  };

  const handleRefresh = async () => {
    if (!userId) return;
    
    try {
      setSyncStatus('syncing');
      setSyncMessage('🔄 Refreshing profile...');

      const completeProfile = await profileService.getCompleteProfile(userId);

      if (completeProfile?.profile) {
        setProfile(completeProfile.profile);
        setFormData(completeProfile.profile);
        setHasChanges(false);
        setSyncStatus('synced');
        setSyncMessage('✨ Profile refreshed from database!');
      }
    } catch (err) {
      console.error('[ProfileManager] Refresh error:', err);
      setSyncStatus('error');
      setSyncMessage('❌ Failed to refresh profile');
    } finally {
      setTimeout(() => {
        setSyncMessage('');
      }, 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-4xl h-[90vh] bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-2xl flex flex-col border-4 border-amber-200"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* Header */}
            <motion.div
              className="sticky top-0 z-40 bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 px-8 py-6 flex justify-between items-center border-b-2 border-amber-800 shadow-lg"
            >
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ayurvedic Profile Manager</h2>
                  <p className="text-amber-100 text-sm">Manage your personalized health information</p>
                </div>
              </motion.div>
              
              <motion.div
                className="flex items-center gap-2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={syncStatus === 'syncing' || loading}
                  className="p-2 bg-yellow-400/20 hover:bg-yellow-400/30 rounded-full transition-all backdrop-blur-sm disabled:opacity-50"
                  title="Refresh Profile"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-full transition-all backdrop-blur-sm"
                  title="Close"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Sync Status */}
            <AnimatePresence>
              {syncMessage && (
                <motion.div
                  className={`px-6 py-3 text-sm font-medium ${
                    syncStatus === 'synced' ? 'bg-green-100 text-green-800' :
                    syncStatus === 'syncing' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="flex items-center gap-2">
                    {syncStatus === 'synced' && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {syncStatus === 'syncing' && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {syncStatus === 'error' && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>{syncMessage}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            {error && (
              <motion.div
                className="px-6 py-3 bg-red-50 text-red-800 text-sm border-b border-red-200"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                  </svg>
                  <div>
                    <p className="font-medium">Error Loading Profile</p>
                    <p className="text-xs mt-1">{error}</p>
                    {userId && <p className="text-xs mt-1">User ID: {userId}</p>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tabs */}
            <motion.div
              className="flex border-b-2 border-amber-200 bg-yellow-50 overflow-x-auto"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-amber-600 text-amber-900 bg-amber-100'
                      : 'border-transparent text-amber-700 hover:text-amber-900 hover:bg-amber-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </motion.button>
              ))}
            </motion.div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-amber-900 mt-4 font-medium">Loading your Ayurvedic profile...</p>
                  </div>
                </div>
              ) : !formData ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-amber-900 font-semibold">No profile data found</p>
                    <p className="text-amber-700 text-sm mt-2">User ID: {userId || 'Not available'}</p>
                    <button 
                      onClick={handleRefresh} 
                      className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                    >
                      Try Refreshing
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Personal Details Tab */}
                  {activeTab === 'personal' && (
                    <motion.div
                      className="space-y-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl border-2 border-amber-200">
                        <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                          <span>📝</span> Personal Information
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">First Name</label>
                            <input
                              type="text"
                              name="first_name"
                              value={formData?.first_name || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Last Name</label>
                            <input
                              type="text"
                              name="last_name"
                              value={formData?.last_name || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Email (Read-only)</label>
                            <input
                              type="email"
                              name="email"
                              value={formData?.email || ''}
                              disabled
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg text-amber-900 bg-amber-100 placeholder-amber-400 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Phone (Read-only)</label>
                            <input
                              type="tel"
                              name="phone"
                              value={formData?.phone || ''}
                              disabled
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg text-amber-900 bg-amber-100 placeholder-amber-400 cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Date of Birth</label>
                            <input
                              type="date"
                              name="date_of_birth"
                              value={formData?.date_of_birth || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Gender</label>
                            <select
                              name="gender"
                              value={formData?.gender || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50"
                            >
                              <option value="">Select Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Address</label>
                            <textarea
                              name="address"
                              value={formData?.address || ''}
                              onChange={handleProfileChange}
                              rows={2}
                              placeholder="Enter your address"
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">City</label>
                            <input
                              type="text"
                              name="city"
                              value={formData?.city || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                              placeholder="Enter your city"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">State</label>
                            <input
                              type="text"
                              name="state"
                              value={formData?.state || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                              placeholder="Enter your state"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Country</label>
                            <input
                              type="text"
                              name="country"
                              value={formData?.country || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                              placeholder="Enter your country"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Zip Code</label>
                            <input
                              type="text"
                              name="zip_code"
                              value={formData?.zip_code || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                              placeholder="Enter your zip code"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Phone Number</label>
                            <input
                              type="text"
                              name="phone_number"
                              value={formData?.phone_number || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                              placeholder="Enter your phone number"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Occupation</label>
                            <input
                              type="text"
                              name="occupation"
                              value={formData?.occupation || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                              placeholder="Your occupation"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Medical History Tab */}
                  {activeTab === 'medical' && (
                    <motion.div
                      className="space-y-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl border-2 border-amber-200">
                        <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                          <span>🩺</span> Medical History
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Chronic Conditions</label>
                            <textarea
                              placeholder="Comma-separated (e.g., Diabetes, Hypertension)"
                              value={Array.isArray(formData?.chronic_conditions) ? formData.chronic_conditions.join(', ') : (formData?.chronic_conditions || '')}
                              onChange={(e) => handleArrayFieldChange('chronic_conditions', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Allergies</label>
                            <textarea
                              placeholder="Comma-separated (e.g., Penicillin, Pollen)"
                              value={Array.isArray(formData?.allergies) ? formData.allergies.join(', ') : (formData?.allergies || '')}
                              onChange={(e) => handleArrayFieldChange('allergies', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Family History</label>
                            <textarea
                              placeholder="Comma-separated (e.g., Heart disease, Diabetes)"
                              value={Array.isArray(formData?.family_history) ? formData.family_history.join(', ') : (formData?.family_history || '')}
                              onChange={(e) => handleArrayFieldChange('family_history', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Current Medications</label>
                            <input
                              type="text"
                              placeholder="Comma-separated (e.g., Aspirin 100mg, Metformin 500mg)"
                              value={Array.isArray(formData?.current_medications) ? formData.current_medications.join(', ') : (typeof formData?.current_medications === 'string' ? formData.current_medications : '')}
                              onChange={(e) => handleArrayFieldChange('current_medications', e.target.value)}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Previous Surgeries</label>
                            <input
                              type="text"
                              placeholder="Comma-separated (e.g., Appendectomy (2015), Wisdom tooth extraction (2020))"
                              value={Array.isArray(formData?.previous_surgeries) ? formData.previous_surgeries.join(', ') : (typeof formData?.previous_surgeries === 'string' ? formData.previous_surgeries : '')}
                              onChange={(e) => handleArrayFieldChange('previous_surgeries', e.target.value)}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl border-2 border-amber-200">
                        <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                          <span>💊</span> Ayurvedic Treatment History
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="flex items-center gap-2 text-amber-900">
                              <input
                                type="checkbox"
                                name="previous_ayurvedic_treatment"
                                checked={!!formData?.previous_ayurvedic_treatment}
                                onChange={handleProfileChange}
                                className="rounded text-amber-600 focus:ring-amber-500"
                              />
                              <span className="font-medium">Previous Ayurvedic Treatment</span>
                            </label>
                            <p className="text-xs text-amber-700 mt-1">Check if you've had Ayurvedic treatments before</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Lifestyle Tab */}
                  {activeTab === 'lifestyle' && (
                    <motion.div
                      className="space-y-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl border-2 border-amber-200">
                        <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                          <span>🏃</span> Lifestyle Factors
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Exercise Frequency</label>
                            <select
                              name="exercise_frequency"
                              value={formData?.exercise_frequency || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50"
                            >
                              <option value="">Select frequency</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Several times a week</option>
                              <option value="monthly">Occasionally</option>
                              <option value="rarely">Rarely</option>
                              <option value="never">Never</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Sleep Pattern</label>
                            <select
                              name="sleep_pattern"
                              value={formData?.sleep_pattern || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50"
                            >
                              <option value="">Select pattern</option>
                              <option value="excellent">Excellent (7-9 hours)</option>
                              <option value="good">Good (6-7 hours)</option>
                              <option value="fair">Fair (5-6 hours)</option>
                              <option value="poor">Poor (&lt;5 hours)</option>
                              <option value="irregular">Irregular</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Smoking Status</label>
                            <select
                              name="smoking_status"
                              value={formData?.smoking_status || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50"
                            >
                              <option value="">Select status</option>
                              <option value="never">Never smoked</option>
                              <option value="former">Former smoker</option>
                              <option value="occasional">Occasional smoker</option>
                              <option value="regular">Regular smoker</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Alcohol Consumption</label>
                            <select
                              name="alcohol_consumption"
                              value={formData?.alcohol_consumption || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50"
                            >
                              <option value="">Select consumption</option>
                              <option value="never">Never</option>
                              <option value="rarely">Rarely</option>
                              <option value="socially">Socially</option>
                              <option value="regularly">Regularly</option>
                              <option value="heavily">Heavily</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Stress Level</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                name="stress_level"
                                min="1"
                                max="10"
                                value={formData?.stress_level || 5}
                                onChange={handleProfileChange}
                                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-amber-900 font-medium w-8">
                                {formData?.stress_level || 5}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-amber-700 mt-1">
                              <span>Low</span>
                              <span>High</span>
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Dietary Preferences</label>
                            <textarea
                              placeholder="Comma-separated (e.g., Vegetarian, Vegan, Gluten-free)"
                              value={Array.isArray(formData?.dietary_preferences) ? formData.dietary_preferences.join(', ') : (formData?.dietary_preferences || '')}
                              onChange={(e) => handleArrayFieldChange('dietary_preferences', e.target.value)}
                              rows={2}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl border-2 border-amber-200">
                        <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                          <span>🎯</span> Health Goals
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Specific Health Concerns</label>
                            <textarea
                              placeholder="Comma-separated health concerns (e.g., Acne, Weight loss)"
                              value={Array.isArray(formData?.specific_concerns) ? formData.specific_concerns.join(', ') : (formData?.specific_concerns || '')}
                              onChange={(e) => handleArrayFieldChange('specific_concerns', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Treatment Goals</label>
                            <textarea
                              placeholder="Comma-separated treatment goals (e.g., Better sleep, Weight management)"
                              value={Array.isArray(formData?.treatment_goals) ? formData.treatment_goals.join(', ') : (formData?.treatment_goals || '')}
                              onChange={(e) => handleArrayFieldChange('treatment_goals', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Emergency Contact Tab */}
                  {activeTab === 'emergency' && (
                    <motion.div
                      className="space-y-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl border-2 border-amber-200">
                        <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                          <span>🆘</span> Emergency Contact Information
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Emergency Contact Name</label>
                            <input
                              type="text"
                              name="emergency_name"
                              value={formData?.emergency_name || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                              placeholder="Full name of emergency contact"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Emergency Contact Phone</label>
                            <input
                              type="tel"
                              name="emergency_contact"
                              value={formData?.emergency_contact || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                              placeholder="+91 XXXXX XXXXX"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-amber-900 mb-2">Relationship</label>
                            <input
                              type="text"
                              name="emergency_relation"
                              value={formData?.emergency_relation || ''}
                              onChange={handleProfileChange}
                              className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-amber-900 bg-amber-50 placeholder-amber-400"
                              placeholder="e.g., Spouse, Parent, Sibling"
                            />
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg border-2 border-orange-300 mt-4">
                          <p className="text-sm text-orange-900 font-medium flex items-start gap-2">
                            <span>🚨</span>
                            <span>Emergency contact information will be securely stored and only accessed in case of medical emergencies according to Ayurvedic protocols.</span>
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer Actions */}
            {!loading && formData && (
              <motion.div
                className="sticky bottom-0 bg-gradient-to-r from-amber-100 to-orange-100 border-t-2 border-amber-200 px-6 py-4 flex justify-end gap-3"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-6 py-2 border-2 border-amber-300 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                >
                  Cancel
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileManager;