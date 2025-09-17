// apps/web/src/pages/auth/PatientRegister.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

interface RegistrationData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  emergencyContact: string;
  emergencyName: string;
  emergencyRelation: string;
  address: string;
  
  // Enhanced health information
  chronicConditions: string[];
  currentMedications: string[];
  allergies: string[];
  previousSurgeries: string[];
  familyHistory: string[];
  
  // Lifestyle information
  occupation: string;
  exerciseFrequency: string;
  sleepPattern: string;
  dietaryPreferences: string[];
  smokingStatus: string;
  alcoholConsumption: string;
  stressLevel: number;
  
  // Ayurvedic specific
  previousAyurvedicTreatment: boolean;
  specificConcerns: string[];
  treatmentGoals: string[];
  
  // Consent
  consent: boolean;
  healthDataConsent: boolean;
  treatmentConsent: boolean;
  communicationConsent: boolean;
  termsAccepted: boolean;
}

const PatientRegister: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    emergencyContact: '',
    emergencyName: '',
    emergencyRelation: '',
    address: '',
    chronicConditions: [],
    currentMedications: [],
    allergies: [],
    previousSurgeries: [],
    familyHistory: [],
    occupation: '',
    exerciseFrequency: '',
    sleepPattern: '',
    dietaryPreferences: [],
    smokingStatus: '',
    alcoholConsumption: '',
    stressLevel: 5,
    previousAyurvedicTreatment: false,
    specificConcerns: [],
    treatmentGoals: [],
    consent: false,
    healthDataConsent: false,
    treatmentConsent: false,
    communicationConsent: false,
    termsAccepted: false
  });

  const totalPages = 2;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      // Sync consent with healthDataConsent for backward compatibility
      if (name === 'healthDataConsent') {
        setFormData(prev => ({
          ...prev,
          consent: checked
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleArrayInput = (field: keyof RegistrationData, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }));
  };

  const validateCurrentPage = (): boolean => {
    switch (currentPage) {
      case 1:
        if (!formData.firstName.trim() || !formData.lastName.trim() || 
            !formData.dateOfBirth || !formData.gender || !formData.email.trim()) {
          setError('Please fill in all required fields');
          return false;
        }
        if (!formData.emergencyName.trim() || !formData.emergencyContact.trim() || !formData.emergencyRelation) {
          setError('Please provide emergency contact information');
          return false;
        }
        break;
      case 2:
        if (!formData.healthDataConsent || !formData.termsAccepted) {
          setError('Please accept the required terms and conditions');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateCurrentPage()) {
      setCurrentPage(prev => Math.min(prev + 1, totalPages));
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCurrentPage()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const phone = sessionStorage.getItem('pendingPhone');
      const response = await api.register({
        ...formData,
        phone
      });

      localStorage.setItem('registrationData', JSON.stringify(formData));
      localStorage.setItem('user', JSON.stringify(response.user));
      api.setToken(response.token);
      navigate('/auth/prakriti-questionnaire');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CustomCheckbox = ({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) => (
    <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-opacity-10 hover:bg-yellow-400">
      <div 
        className={`custom-checkbox ${checked ? 'checked' : ''}`}
        onClick={onChange}
      />
      <span className="text-sm" style={{ color: '#6b4423' }}>
        {children}
      </span>
    </label>
  );

  return (
    <>
      {/* Ayurvedic Animations & Styles */}
      <style>{`
        @keyframes rotateMandala {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatHerb {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.15; }
          25% { transform: translate(30px, -40px) rotate(90deg) scale(1.1); opacity: 0.2; }
          50% { transform: translate(-20px, -60px) rotate(180deg) scale(0.9); opacity: 0.1; }
          75% { transform: translate(-40px, -20px) rotate(270deg) scale(1.05); opacity: 0.18; }
        }
        @keyframes ayurvedicBreathe {
          0%, 100% { transform: scale(0.8); opacity: 0.3; filter: blur(2px); }
          50% { transform: scale(1.2); opacity: 0.6; filter: blur(0px); }
        }
        @keyframes pulseExpand {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes goldenShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .herb-float-1 { animation: floatHerb 25s infinite ease-in-out; }
        .herb-float-2 { animation: floatHerb 30s infinite ease-in-out; animation-delay: -5s; }
        .herb-float-3 { animation: floatHerb 22s infinite ease-in-out; animation-delay: -10s; }
        .herb-float-4 { animation: floatHerb 28s infinite ease-in-out; animation-delay: -15s; }
        .mandala-rotate { animation: rotateMandala 60s linear infinite; }
        .breathe-1 { animation: ayurvedicBreathe 6s ease-in-out infinite; }
        .breathe-2 { animation: ayurvedicBreathe 6s ease-in-out infinite reverse; animation-delay: -3s; }
        .pulse-ring-1 { animation: pulseExpand 4s ease-out infinite; }
        .pulse-ring-2 { animation: pulseExpand 4s ease-out infinite; animation-delay: 1s; }
        .pulse-ring-3 { animation: pulseExpand 4s ease-out infinite; animation-delay: 2s; }
        .golden-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent);
          background-size: 200% 100%;
          animation: goldenShimmer 3s linear infinite;
        }
        .fade-in-up { animation: fadeInUp 0.6s ease-out; }
        .custom-checkbox {
          display: inline-block;
          width: 18px;
          height: 18px;
          background: rgba(255, 248, 220, 0.6);
          border: 2px solid #daa520;
          border-radius: 4px;
          position: relative;
          transition: all 0.3s;
          flex-shrink: 0;
        }
        .custom-checkbox.checked {
          background: linear-gradient(135deg, #b8860b, #daa520);
        }
        .custom-checkbox.checked::after {
          content: "";
          position: absolute;
          left: 5px;
          top: 2px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .ayurvedic-input {
          background: rgba(255, 248, 220, 0.6);
          border: 2px solid rgba(218, 165, 32, 0.3);
          border-radius: 8px;
          padding: 12px;
          transition: all 0.3s;
          color: #2c1810;
        }
        .ayurvedic-input:focus {
          outline: none;
          border-color: #daa520;
          box-shadow: 0 0 0 3px rgba(218, 165, 32, 0.1);
        }
        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
        }
        .compact-checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 6px;
        }
      `}</style>

      <div className="min-h-screen py-8 px-4 relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at top left, rgba(255, 183, 77, 0.15), transparent 40%),
            radial-gradient(ellipse at bottom right, rgba(139, 69, 19, 0.2), transparent 40%),
            radial-gradient(ellipse at center, rgba(255, 140, 0, 0.1), transparent 60%),
            linear-gradient(135deg, #2c1810 0%, #3d2817 25%, #4a3420 50%, #3d2817 75%, #2c1810 100%)
          `
        }}>

        {/* Mandala overlay */}
        <div className="fixed inset-0 opacity-5 pointer-events-none mandala-rotate"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 80% 80%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 80% 20%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 20% 80%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 50% 50%, transparent 40%, rgba(255, 183, 77, 0.1) 40.5%, transparent 41%)
            `
          }}
        />

        {/* Floating herbs */}
        <div className="fixed w-10 h-10 top-[10%] left-[10%] rounded-full herb-float-1 opacity-15"
          style={{ background: 'radial-gradient(circle, #8b6914 0%, transparent 70%)' }} />
        <div className="fixed w-15 h-15 top-[70%] right-[15%] rounded-full herb-float-2 opacity-15"
          style={{ background: 'radial-gradient(circle, #cd853f 0%, transparent 70%)' }} />
        <div className="fixed w-9 h-9 bottom-[15%] left-[50%] rounded-full herb-float-3 opacity-15"
          style={{ background: 'radial-gradient(circle, #daa520 0%, transparent 70%)' }} />
        <div className="fixed w-11 h-11 top-[50%] left-[5%] rounded-full herb-float-4 opacity-15"
          style={{ background: 'radial-gradient(circle, #b8860b 0%, transparent 70%)' }} />

        {/* Breathing light */}
        <div className="fixed w-96 h-96 md:w-[600px] md:h-[600px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="absolute inset-0 rounded-full breathe-1"
            style={{ background: 'radial-gradient(circle, rgba(255, 183, 77, 0.4), rgba(218, 165, 32, 0.1) 40%, transparent 70%)' }} />
          <div className="absolute w-4/5 h-4/5 top-[10%] left-[10%] rounded-full breathe-2"
            style={{ background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3), rgba(184, 134, 11, 0.15) 30%, transparent 60%)' }} />
        </div>

        {/* Pulse rings */}
        <div className="fixed w-[800px] h-[800px] top-1/2 left-1/2 border border-yellow-400/20 rounded-full pulse-ring-1" />
        <div className="fixed w-[800px] h-[800px] top-1/2 left-1/2 border border-yellow-400/20 rounded-full pulse-ring-2" />
        <div className="fixed w-[800px] h-[800px] top-1/2 left-1/2 border border-yellow-400/20 rounded-full pulse-ring-3" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Progress Bar */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: '#ffd700' }}>
                Step {currentPage} of {totalPages}
              </span>
              <span className="text-sm" style={{ color: '#daa520' }}>
                {Math.round((currentPage / totalPages) * 100)}% Complete
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: 'rgba(139, 69, 19, 0.3)' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(currentPage / totalPages) * 100}%` }}
                transition={{ duration: 0.5 }}
                className="h-2 rounded-full"
                style={{ background: 'linear-gradient(90deg, #b8860b, #daa520, #ffd700)' }}
              />
            </div>
          </motion.div>

          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative rounded-3xl p-8 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 248, 220, 0.95), rgba(250, 240, 190, 0.92))',
              boxShadow: '0 30px 60px rgba(139, 69, 19, 0.4), 0 15px 35px rgba(184, 134, 11, 0.3)',
              border: '1px solid rgba(218, 165, 32, 0.3)'
            }}
          >
            {/* Golden shimmer overlay */}
            <div className="absolute inset-0 golden-shimmer opacity-5 pointer-events-none" />

            <AnimatePresence mode="wait">
              {/* Page 1: Personal Information, Emergency Contact & Health Overview */}
              {currentPage === 1 && (
                <motion.div
                  key="page1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl"
                      style={{
                        background: 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)',
                        boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                      }}
                    >
                      🌿
                    </motion.div>
                    <h2 className="text-3xl font-bold mb-2" style={{ color: '#2c1810' }}>
                      Welcome to SwastyaSync
                    </h2>
                    <p style={{ color: '#6b4423' }}>Let's set up your profile efficiently</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Personal Information */}
                    <div className="xl:col-span-1 space-y-4">
                      <h3 className="font-semibold text-lg mb-4" style={{ color: '#8b6914' }}>
                        Personal Details
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            First Name *
                          </label>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            className="w-full ayurvedic-input"
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Last Name *
                          </label>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            className="w-full ayurvedic-input"
                            placeholder="Last name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Date of Birth *
                          </label>
                          <input
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            required
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full ayurvedic-input"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Gender *
                          </label>
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            required
                            className="w-full ayurvedic-input"
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full ayurvedic-input"
                          placeholder="your.email@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                          Address
                        </label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          rows={2}
                          className="w-full ayurvedic-input"
                          placeholder="Your address"
                        />
                      </div>

                      {/* Emergency Contact */}
                      <h3 className="font-semibold text-lg mt-6 mb-4" style={{ color: '#8b6914' }}>
                        Emergency Contact *
                      </h3>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                          Name *
                        </label>
                        <input
                          type="text"
                          name="emergencyName"
                          value={formData.emergencyName}
                          onChange={handleChange}
                          required
                          className="w-full ayurvedic-input"
                          placeholder="Contact name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Phone *
                          </label>
                          <input
                            type="tel"
                            name="emergencyContact"
                            value={formData.emergencyContact}
                            onChange={handleChange}
                            required
                            className="w-full ayurvedic-input"
                            placeholder="Phone number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Relation *
                          </label>
                          <select
                            name="emergencyRelation"
                            value={formData.emergencyRelation}
                            onChange={handleChange}
                            required
                            className="w-full ayurvedic-input"
                          >
                            <option value="">Select</option>
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Child">Child</option>
                            <option value="Friend">Friend</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Health & Lifestyle Information */}
                    <div className="xl:col-span-2 space-y-6">
                      <h3 className="font-semibold text-lg mb-4" style={{ color: '#8b6914' }}>
                        Health & Lifestyle Overview
                      </h3>
                      
                      {/* Compact lifestyle grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Occupation
                          </label>
                          <input
                            type="text"
                            name="occupation"
                            value={formData.occupation}
                            onChange={handleChange}
                            className="w-full ayurvedic-input"
                            placeholder="Your profession"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Exercise
                          </label>
                          <select
                            name="exerciseFrequency"
                            value={formData.exerciseFrequency}
                            onChange={handleChange}
                            className="w-full ayurvedic-input"
                          >
                            <option value="">Select</option>
                            <option value="sedentary">Sedentary</option>
                            <option value="light">Light</option>
                            <option value="moderate">Moderate</option>
                            <option value="active">Active</option>
                            <option value="very_active">Very Active</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Sleep Pattern
                          </label>
                          <select
                            name="sleepPattern"
                            value={formData.sleepPattern}
                            onChange={handleChange}
                            className="w-full ayurvedic-input"
                          >
                            <option value="">Select</option>
                            <option value="early_bird">Early Bird</option>
                            <option value="normal">Normal</option>
                            <option value="night_owl">Night Owl</option>
                            <option value="irregular">Irregular</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Smoking Status
                          </label>
                          <select
                            name="smokingStatus"
                            value={formData.smokingStatus}
                            onChange={handleChange}
                            className="w-full ayurvedic-input"
                          >
                            <option value="">Select</option>
                            <option value="never">Never</option>
                            <option value="former">Former</option>
                            <option value="current">Current</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Alcohol Consumption
                          </label>
                          <select
                            name="alcoholConsumption"
                            value={formData.alcoholConsumption}
                            onChange={handleChange}
                            className="w-full ayurvedic-input"
                          >
                            <option value="">Select</option>
                            <option value="never">Never</option>
                            <option value="rarely">Rarely</option>
                            <option value="occasional">Occasional</option>
                            <option value="moderate">Moderate</option>
                            <option value="frequent">Frequent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Stress Level: {formData.stressLevel}
                          </label>
                          <input
                            type="range"
                            name="stressLevel"
                            min="1"
                            max="10"
                            value={formData.stressLevel}
                            onChange={handleChange}
                            className="w-full"
                            style={{ accentColor: '#daa520' }}
                          />
                          <div className="flex justify-between text-xs mt-1" style={{ color: '#8b6914' }}>
                            <span>Low (1)</span>
                            <span>High (10)</span>
                          </div>
                        </div>
                      </div>

                      {/* Essential Health Conditions */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-md mb-3" style={{ color: '#8b6914' }}>
                            Common Allergies
                          </h4>
                          <div className="compact-checkbox-grid">
                            {['Food Allergies', 'Medications', 'Environmental', 'Skin Allergies', 'None', 'Other'].map(allergy => (
                              <CustomCheckbox
                                key={allergy}
                                checked={formData.allergies.includes(allergy)}
                                onChange={() => handleArrayInput('allergies', allergy, !formData.allergies.includes(allergy))}
                              >
                                {allergy}
                              </CustomCheckbox>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Medications and Family History */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Current Medications (if any)
                          </label>
                          <textarea
                            value={formData.currentMedications.join(', ')}
                            onChange={(e) => setFormData(prev => ({ ...prev, currentMedications: e.target.value.split(', ').filter(med => med.trim()) }))}
                            rows={2}
                            className="w-full ayurvedic-input"
                            placeholder="List medications separated by commas"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Family Medical History
                          </label>
                          <textarea
                            value={formData.familyHistory.join(', ')}
                            onChange={(e) => setFormData(prev => ({ ...prev, familyHistory: e.target.value.split(', ').filter(history => history.trim()) }))}
                            rows={2}
                            className="w-full ayurvedic-input"
                            placeholder="Heart disease, diabetes, cancer, etc."
                          />
                        </div>
                      </div>

                      {/* Ayurvedic Section */}
                      <div className="mt-6">
                        <h4 className="font-medium text-md mb-4" style={{ color: '#8b6914' }}>
                          Ayurvedic Assessment
                        </h4>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-3" style={{ color: '#6b4423' }}>
                            Previous Ayurvedic treatment?
                          </label>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="previousAyurvedicTreatment"
                                checked={formData.previousAyurvedicTreatment === true}
                                onChange={() => setFormData(prev => ({ ...prev, previousAyurvedicTreatment: true }))}
                                style={{ accentColor: '#daa520' }}
                              />
                              <span style={{ color: '#6b4423' }}>Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="previousAyurvedicTreatment"
                                checked={formData.previousAyurvedicTreatment === false}
                                onChange={() => setFormData(prev => ({ ...prev, previousAyurvedicTreatment: false }))}
                                style={{ accentColor: '#daa520' }}
                              />
                              <span style={{ color: '#6b4423' }}>No</span>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium text-sm mb-3" style={{ color: '#8b6914' }}>
                              Primary Health Concerns
                            </h5>
                            <div className="compact-checkbox-grid">
                              {['Digestive Issues', 'Sleep Problems', 'Stress & Anxiety', 'Weight Management', 'Joint Pain', 'Fatigue', 'Other'].map(concern => (
                                <CustomCheckbox
                                  key={concern}
                                  checked={formData.specificConcerns.includes(concern)}
                                  onChange={() => handleArrayInput('specificConcerns', concern, !formData.specificConcerns.includes(concern))}
                                >
                                  {concern}
                                </CustomCheckbox>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium text-sm mb-3" style={{ color: '#8b6914' }}>
                              Treatment Goals
                            </h5>
                            <div className="compact-checkbox-grid">
                              {['Prevention & Wellness', 'Disease Management', 'Mental Peace', 'Physical Strength', 'Better Sleep', 'Energy Enhancement', 'Other'].map(goal => (
                                <CustomCheckbox
                                  key={goal}
                                  checked={formData.treatmentGoals.includes(goal)}
                                  onChange={() => handleArrayInput('treatmentGoals', goal, !formData.treatmentGoals.includes(goal))}
                                >
                                  {goal}
                                </CustomCheckbox>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h5 className="font-medium text-sm mb-3" style={{ color: '#8b6914' }}>
                            Dietary Preferences
                          </h5>
                          <div className="compact-checkbox-grid">
                            {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Ayurvedic Diet', 'No Restrictions', 'Other'].map(diet => (
                              <CustomCheckbox
                                key={diet}
                                checked={formData.dietaryPreferences.includes(diet)}
                                onChange={() => handleArrayInput('dietaryPreferences', diet, !formData.dietaryPreferences.includes(diet))}
                              >
                                {diet}
                              </CustomCheckbox>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Page 2: Consent & Final Details */}
              {currentPage === 2 && (
                <motion.div
                  key="page2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl"
                      style={{
                        background: 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)',
                        boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                      }}
                    >
                      📋
                    </motion.div>
                    <h2 className="text-3xl font-bold mb-2" style={{ color: '#2c1810' }}>
                      Final Step - Consent & Privacy
                    </h2>
                    <p style={{ color: '#6b4423' }}>Review and accept our terms to complete your registration</p>
                  </div>

                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Additional Health Details */}
                    <div className="mb-8 p-6 rounded-2xl" 
                      style={{ 
                        background: 'rgba(255, 248, 220, 0.3)', 
                        border: '2px solid rgba(218, 165, 32, 0.2)' 
                      }}
                    >
                      <h3 className="font-semibold text-lg mb-4" style={{ color: '#8b6914' }}>
                        Additional Information (Optional)
                      </h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Previous Surgeries (if any)
                          </label>
                          <textarea
                            value={formData.previousSurgeries.join(', ')}
                            onChange={(e) => setFormData(prev => ({ ...prev, previousSurgeries: e.target.value.split(', ').filter(surgery => surgery.trim()) }))}
                            rows={2}
                            className="w-full ayurvedic-input"
                            placeholder="List any previous surgeries"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#6b4423' }}>
                            Additional Notes
                          </label>
                          <textarea
                            rows={2}
                            className="w-full ayurvedic-input"
                            placeholder="Any other health information you'd like to share"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Consent Section */}
                    <div className="space-y-4">
                      <div className="p-6 rounded-2xl" 
                        style={{ 
                          background: 'rgba(255, 248, 220, 0.4)', 
                          border: '2px solid rgba(218, 165, 32, 0.2)' 
                        }}
                      >
                        <CustomCheckbox
                          checked={formData.healthDataConsent}
                          onChange={() => handleChange({ target: { name: 'healthDataConsent', type: 'checkbox', checked: !formData.healthDataConsent } } as any)}
                        >
                          <div>
                            <strong style={{ color: '#8b6914' }}>Health Data Consent *</strong>
                            <br />
                            <span>I consent to the collection, processing, and storage of my health information for personalized Ayurvedic treatment. My data will be kept confidential and secure.</span>
                          </div>
                        </CustomCheckbox>
                      </div>

                      <div className="p-6 rounded-2xl" 
                        style={{ 
                          background: 'rgba(255, 248, 220, 0.4)', 
                          border: '2px solid rgba(218, 165, 32, 0.2)' 
                        }}
                      >
                        <CustomCheckbox
                          checked={formData.treatmentConsent}
                          onChange={() => handleChange({ target: { name: 'treatmentConsent', type: 'checkbox', checked: !formData.treatmentConsent } } as any)}
                        >
                          <div>
                            <strong style={{ color: '#8b6914' }}>Treatment Understanding</strong>
                            <br />
                            <span>I understand that Ayurvedic treatments are complementary and should not replace conventional medical care for serious conditions.</span>
                          </div>
                        </CustomCheckbox>
                      </div>

                      <div className="p-6 rounded-2xl" 
                        style={{ 
                          background: 'rgba(255, 248, 220, 0.4)', 
                          border: '2px solid rgba(218, 165, 32, 0.2)' 
                        }}
                      >
                        <CustomCheckbox
                          checked={formData.communicationConsent}
                          onChange={() => handleChange({ target: { name: 'communicationConsent', type: 'checkbox', checked: !formData.communicationConsent } } as any)}
                        >
                          <div>
                            <strong style={{ color: '#8b6914' }}>Communication Preferences</strong>
                            <br />
                            <span>I agree to receive appointment reminders, health tips, and treatment updates via SMS, email, and in-app notifications. I can opt out anytime.</span>
                          </div>
                        </CustomCheckbox>
                      </div>

                      <div className="p-6 rounded-2xl" 
                        style={{ 
                          background: 'rgba(255, 248, 220, 0.4)', 
                          border: '2px solid rgba(218, 165, 32, 0.2)' 
                        }}
                      >
                        <CustomCheckbox
                          checked={formData.termsAccepted}
                          onChange={() => handleChange({ target: { name: 'termsAccepted', type: 'checkbox', checked: !formData.termsAccepted } } as any)}
                        >
                          <div>
                            <strong style={{ color: '#8b6914' }}>Terms and Conditions *</strong>
                            <br />
                            <span>I have read and agree to the Terms of Service and Privacy Policy. I understand my rights regarding data protection and can withdraw consent anytime.</span>
                          </div>
                        </CustomCheckbox>
                      </div>

                      <div className="p-6 rounded-2xl" 
                        style={{ 
                          background: 'rgba(255, 248, 220, 0.4)', 
                          border: '2px solid rgba(218, 165, 32, 0.2)' 
                        }}
                      >
                        <CustomCheckbox
                          checked={formData.consent}
                          onChange={() => handleChange({ target: { name: 'consent', type: 'checkbox', checked: !formData.consent } } as any)}
                        >
                          <div>
                            <strong style={{ color: '#8b6914' }}>General Consent</strong>
                            <br />
                            <span>I consent to the collection and processing of my health data for personalized Ayurvedic treatment purposes.</span>
                          </div>
                        </CustomCheckbox>
                      </div>
                    </div>

                    <div className="mt-8 p-6 rounded-xl text-center" 
                      style={{ 
                        background: 'rgba(184, 134, 11, 0.1)', 
                        border: '1px solid rgba(218, 165, 32, 0.3)' 
                      }}
                    >
                      <p className="text-sm" style={{ color: '#8b6914' }}>
                        Thank you for choosing SwastyaSync! Our Ayurvedic practitioners will review your profile and create a personalized treatment plan based on your unique constitution and health needs. You'll receive a Prakriti assessment next to determine your body type.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-xl flex items-center gap-3"
                style={{ 
                  background: 'rgba(205, 133, 63, 0.1)',
                  border: '2px solid rgba(205, 133, 63, 0.3)',
                  color: '#a0522d'
                }}
              >
                <span className="text-xl">⚠️</span>
                <span className="font-medium">{error}</span>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6" style={{ borderTop: '2px solid rgba(218, 165, 32, 0.2)' }}>
              <button
                type="button"
                onClick={currentPage === 1 ? () => navigate(-1) : handlePrevious}
                className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 hover:-translate-y-0.5"
                style={{
                  background: 'rgba(139, 69, 19, 0.1)',
                  color: '#8b6914',
                  border: '2px solid rgba(218, 165, 32, 0.3)'
                }}
              >
                {currentPage === 1 ? '← Back' : '← Previous'}
              </button>

              {currentPage < totalPages ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)',
                    color: '#2c1810',
                    boxShadow: '0 4px 15px rgba(184, 134, 11, 0.4)'
                  }}
                >
                  Final Step →
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !formData.healthDataConsent || !formData.termsAccepted}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                    loading || !formData.healthDataConsent || !formData.termsAccepted
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105 hover:-translate-y-0.5'
                  }`}
                  style={{
                    background: loading || !formData.healthDataConsent || !formData.termsAccepted
                      ? 'rgba(139, 69, 19, 0.3)'
                      : 'linear-gradient(135deg, #228b22, #32cd32, #7cfc00)',
                    color: loading || !formData.healthDataConsent || !formData.termsAccepted
                      ? '#8b6914'
                      : '#2c1810',
                    boxShadow: loading || !formData.healthDataConsent || !formData.termsAccepted
                      ? 'none'
                      : '0 4px 15px rgba(124, 252, 0, 0.4)'
                  }}
                >
                  {loading ? 'Creating Profile...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default PatientRegister;