// src/components/ProfileManager.tsx
import React, { useState, useEffect } from 'react';

interface UserProfile {
  id: string;
  // Basic Information (Auto-populated from registration)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  
  // Emergency Contact (Auto-populated from registration)
  emergencyContact: string;
  emergencyName: string;
  emergencyRelation?: string;
  
  // Health Information (Auto-populated from questionnaire)
  prakritiType?: string;
  dominantDosha?: string;
  mentalHealthScore?: number;
  chronicConditions?: string[];
  currentMedications?: string[];
  allergies?: string[];
  
  // Lifestyle Information (Editable)
  occupation?: string;
  exerciseFrequency?: string;
  sleepPattern?: string;
  dietaryPreferences?: string[];
  smokingStatus?: string;
  alcoholConsumption?: string;
  stressLevel?: number;
  
  // Ayurvedic Assessment Data (Auto-populated)
  assessmentDate?: string;
  lastConsultation?: string;
  treatmentPlan?: string;
  
  // System Fields
  profileCompleteness: number;
  lastUpdated: string;
  registrationDate: string;
  isVerified: boolean;
}

interface ProfileManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FieldConfig {
  key: keyof UserProfile;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'multiselect' | 'number' | 'range';
  editable: boolean;
  required?: boolean;
  options?: string[];
  validation?: (value: any) => string | null;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({ isOpen, onClose }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
    }
  }, [isOpen]);

  const loadUserProfile = async () => {
    setLoading(true);
    
    try {
      // Load from localStorage first (registration data + questionnaire results)
      const registrationData = JSON.parse(localStorage.getItem('registrationData') || '{}');
      const prakritiResults = JSON.parse(localStorage.getItem('prakritiResults') || '{}');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Combine all data sources
      const mockProfile: UserProfile = {
        id: user.id || 'user_123',
        // Auto-populated from registration
        firstName: registrationData.firstName || user.firstName || '',
        lastName: registrationData.lastName || user.lastName || '',
        email: registrationData.email || user.email || '',
        phone: registrationData.phone || user.phone || '',
        dateOfBirth: registrationData.dateOfBirth || '',
        gender: registrationData.gender || '',
        address: registrationData.address || '',
        emergencyContact: registrationData.emergencyContact || '',
        emergencyName: registrationData.emergencyName || '',
        emergencyRelation: registrationData.emergencyRelation || '',
        
        // Auto-populated from Prakriti questionnaire
        prakritiType: prakritiResults.scores?.dominant ? `${prakritiResults.scores.dominant.charAt(0).toUpperCase()}${prakritiResults.scores.dominant.slice(1)}` : undefined,
        dominantDosha: prakritiResults.scores?.dominant || undefined,
        mentalHealthScore: prakritiResults.mentalHealth?.score || undefined,
        assessmentDate: prakritiResults.completedAt || new Date().toISOString().split('T')[0],
        
        // Health information from registration
        chronicConditions: registrationData.chronicConditions || [],
        currentMedications: registrationData.currentMedications || [],
        allergies: registrationData.allergies || [],
        
        // Lifestyle from registration (editable)
        occupation: registrationData.occupation || '',
        exerciseFrequency: registrationData.exerciseFrequency || '',
        sleepPattern: registrationData.sleepPattern || '',
        dietaryPreferences: registrationData.dietaryPreferences || [],
        smokingStatus: registrationData.smokingStatus || '',
        alcoholConsumption: registrationData.alcoholConsumption || '',
        stressLevel: registrationData.stressLevel || 5,
        
        // System fields
        profileCompleteness: calculateProfileCompleteness(registrationData),
        lastUpdated: new Date().toISOString(),
        registrationDate: user.createdAt || new Date().toISOString(),
        isVerified: true
      };

      setUserProfile(mockProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompleteness = (data: any): number => {
    const fields = ['firstName', 'lastName', 'email', 'dateOfBirth', 'gender', 'emergencyName', 'emergencyContact'];
    const filledFields = fields.filter(field => data[field] && data[field].toString().trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const fieldConfigs: FieldConfig[] = [
    // Personal Information (mostly non-editable)
    { key: 'firstName', label: 'First Name', type: 'text', editable: false, required: true },
    { key: 'lastName', label: 'Last Name', type: 'text', editable: false, required: true },
    { key: 'email', label: 'Email Address', type: 'email', editable: true, required: true },
    { key: 'phone', label: 'Phone Number', type: 'tel', editable: false, required: true },
    { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', editable: false, required: true },
    { key: 'gender', label: 'Gender', type: 'select', editable: false, options: ['male', 'female', 'other'] },
    { key: 'address', label: 'Address', type: 'textarea', editable: true },
    
    // Emergency Contact (limited editing)
    { key: 'emergencyName', label: 'Emergency Contact Name', type: 'text', editable: true, required: true },
    { key: 'emergencyContact', label: 'Emergency Contact Number', type: 'tel', editable: true, required: true },
    { key: 'emergencyRelation', label: 'Relationship', type: 'select', editable: true, 
      options: ['Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'] },
    
    // Lifestyle Information (fully editable)
    { key: 'occupation', label: 'Occupation', type: 'text', editable: true },
    { key: 'exerciseFrequency', label: 'Exercise Frequency', type: 'select', editable: true,
      options: ['sedentary', 'light', 'moderate', 'active', 'very_active'] },
    { key: 'sleepPattern', label: 'Sleep Pattern', type: 'select', editable: true,
      options: ['early_bird', 'normal', 'night_owl'] },
    { key: 'smokingStatus', label: 'Smoking Status', type: 'select', editable: true,
      options: ['never', 'former', 'current'] },
    { key: 'alcoholConsumption', label: 'Alcohol Consumption', type: 'select', editable: true,
      options: ['never', 'rarely', 'occasional', 'moderate', 'frequent'] },
    { key: 'stressLevel', label: 'Current Stress Level', type: 'range', editable: true }
  ];

  const handleEdit = () => {
    setEditableData({ ...userProfile });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditableData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update profile
      if (userProfile && editableData) {
        const updatedProfile = {
          ...userProfile,
          ...editableData,
          lastUpdated: new Date().toISOString(),
          profileCompleteness: calculateProfileCompleteness({ ...userProfile, ...editableData })
        };
        setUserProfile(updatedProfile);
        
        // Update localStorage
        const currentRegistration = JSON.parse(localStorage.getItem('registrationData') || '{}');
        localStorage.setItem('registrationData', JSON.stringify({ ...currentRegistration, ...editableData }));
      }
      
      setIsEditing(false);
      setEditableData({});
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (config: FieldConfig) => {
    const value = isEditing ? editableData[config.key] : userProfile?.[config.key];
    const isDisabled = !config.editable || !isEditing;

    return (
      <div key={config.key} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {config.label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
          {!config.editable && <span className="text-gray-400 ml-1">(Auto-filled)</span>}
        </label>
        
        {config.type === 'textarea' ? (
          <textarea
            value={value as string || ''}
            onChange={(e) => isEditing && setEditableData(prev => ({ ...prev, [config.key]: e.target.value }))}
            disabled={isDisabled}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
              isDisabled ? 'bg-gray-50 text-gray-500' : 'bg-white'
            }`}
            rows={3}
          />
        ) : config.type === 'select' ? (
          <select
            value={value as string || ''}
            onChange={(e) => isEditing && setEditableData(prev => ({ ...prev, [config.key]: e.target.value }))}
            disabled={isDisabled}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              isDisabled ? 'bg-gray-50 text-gray-500' : 'bg-white'
            }`}
          >
            <option value="">Select {config.label}</option>
            {config.options?.map(option => (
              <option key={option} value={option} className="capitalize">
                {option.replace('_', ' ')}
              </option>
            ))}
          </select>
        ) : config.type === 'range' ? (
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={value as number || 5}
              onChange={(e) => isEditing && setEditableData(prev => ({ ...prev, [config.key]: parseInt(e.target.value) }))}
              disabled={isDisabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low (1)</span>
              <span className="font-medium">Current: {value || 5}</span>
              <span>High (10)</span>
            </div>
          </div>
        ) : (
          <input
            type={config.type}
            value={value as string || ''}
            onChange={(e) => isEditing && setEditableData(prev => ({ ...prev, [config.key]: e.target.value }))}
            disabled={isDisabled}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              isDisabled ? 'bg-gray-50 text-gray-500' : 'bg-white'
            }`}
          />
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {userProfile?.firstName} {userProfile?.lastName}
                </h2>
                <p className="text-gray-600">{userProfile?.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Profile Completeness */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Completeness</span>
              <span className="text-sm font-bold text-indigo-600">
                {userProfile?.profileCompleteness}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${userProfile?.profileCompleteness}%` }}
              />
            </div>
          </div>

          {/* Section Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'personal', label: 'Personal Information' },
                { id: 'health', label: 'Health Profile' },
                { id: 'lifestyle', label: 'Lifestyle' },
                { id: 'ayurvedic', label: 'Ayurvedic Assessment' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeSection === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Edit/Save Controls */}
          <div className="flex justify-end mb-6">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    saving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* Section Content */}
          {activeSection === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fieldConfigs
                .filter(config => ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'address'].includes(config.key))
                .map(config => renderField(config))}
              
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-800 mb-4 border-t pt-4">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {fieldConfigs
                    .filter(config => ['emergencyName', 'emergencyContact', 'emergencyRelation'].includes(config.key))
                    .map(config => renderField(config))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'health' && (
            <div className="space-y-6">
              {/* Auto-populated Health Data */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-800 mb-3">Medical Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chronic Conditions
                    </label>
                    <div className="space-y-1">
                      {userProfile?.chronicConditions?.map((condition, index) => (
                        <span key={index} className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-sm mr-2">
                          {condition}
                        </span>
                      )) || <span className="text-gray-500">None reported</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Medications
                    </label>
                    <div className="space-y-1">
                      {userProfile?.currentMedications?.map((medication, index) => (
                        <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2">
                          {medication}
                        </span>
                      )) || <span className="text-gray-500">None reported</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allergies
                    </label>
                    <div className="space-y-1">
                      {userProfile?.allergies?.map((allergy, index) => (
                        <span key={index} className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm mr-2">
                          {allergy}
                        </span>
                      )) || <span className="text-gray-500">None reported</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mental Health Score
                    </label>
                    <div className="text-2xl font-bold text-green-600">
                      {userProfile?.mentalHealthScore ? `${userProfile.mentalHealthScore}/100` : 'Not assessed'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'lifestyle' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fieldConfigs
                .filter(config => ['occupation', 'exerciseFrequency', 'sleepPattern', 'smokingStatus', 'alcoholConsumption', 'stressLevel'].includes(config.key))
                .map(config => renderField(config))}
            </div>
          )}

          {activeSection === 'ayurvedic' && (
            <div className="space-y-6">
              {/* Prakriti Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-purple-800 mb-4">Your Prakriti Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {userProfile?.dominantDosha ? userProfile.dominantDosha.charAt(0).toUpperCase() + userProfile.dominantDosha.slice(1) : 'Not Assessed'}
                    </div>
                    <div className="text-sm text-gray-600">Dominant Dosha</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600 mb-1">
                      {userProfile?.prakritiType || 'Not Assessed'}
                    </div>
                    <div className="text-sm text-gray-600">Constitution Type</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {userProfile?.assessmentDate ? new Date(userProfile.assessmentDate).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Assessment Date</div>
                  </div>
                </div>
              </div>

              {/* Treatment History */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Treatment History</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Consultation
                      </label>
                      <div className="text-gray-800">
                        {userProfile?.lastConsultation || 'No previous consultations'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Treatment Plan
                      </label>
                      <div className="text-gray-800">
                        {userProfile?.treatmentPlan || 'No active treatment plan'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;