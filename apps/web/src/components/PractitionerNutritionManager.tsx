// apps/web/src/components/PractitionerNutritionManager.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import NutritionDashboard from './NutritionDashboard';
import './NutritionDashboard.css';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  prakriti_type?: string;
}

interface DietRecommendation {
  id: string;
  user_id: string;
  prakriti_type: string;
  recommendations: string[];
  foods_to_favor: any;
  foods_to_avoid: any;
  meal_timing: any;
  created_at: string;
  recommendation_type: string;
}

const PractitionerNutritionManager: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [dietRecommendations, setDietRecommendations] = useState<DietRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [newRecommendation, setNewRecommendation] = useState({
    recommendations: [''] as string[],
    foods_to_favor: [''] as string[],
    foods_to_avoid: [''] as string[],
    meal_timing: '',
    notes: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientDietRecommendations();
    }
  }, [selectedPatient]);

  const fetchPatients = async () => {
    try {
      // Fetch patients associated with this practitioner
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, prakriti_assessment')
        .eq('role', 'patient')
        .limit(50);

      if (error) throw error;
      
      const formattedPatients = (data || []).map(patient => ({
        id: patient.id,
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        prakriti_type: patient.prakriti_assessment || ''
      }));
      
      setPatients(formattedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDietRecommendations = async () => {
    if (!selectedPatient) return;

    try {
      const { data, error } = await supabase
        .from('diet_recommendations')
        .select('*')
        .eq('user_id', selectedPatient)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDietRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching patient diet recommendations:', error);
    }
  };

  const handleSaveRecommendation = async () => {
    if (!selectedPatient) return;

    setSaving(true);
    try {
      // Get the patient's prakriti type
      const patient = patients.find(p => p.id === selectedPatient);
      const prakritiType = patient?.prakriti_type || 'unknown';

      const { data, error } = await supabase
        .from('diet_recommendations')
        .insert([
          {
            user_id: selectedPatient,
            prakriti_type: prakritiType,
            recommendations: newRecommendation.recommendations.filter(r => r.trim() !== ''),
            foods_to_favor: newRecommendation.foods_to_favor.filter(f => f.trim() !== ''),
            foods_to_avoid: newRecommendation.foods_to_avoid.filter(f => f.trim() !== ''),
            meal_timing: newRecommendation.meal_timing,
            notes: newRecommendation.notes,
            recommendation_type: 'practitioner'
          }
        ])
        .select();

      if (error) throw error;
      
      // Refresh recommendations
      fetchPatientDietRecommendations();
      
      // Reset form
      setNewRecommendation({
        recommendations: [''],
        foods_to_favor: [''],
        foods_to_avoid: [''],
        meal_timing: '',
        notes: ''
      });
      
      alert('Recommendation saved successfully!');
    } catch (error) {
      console.error('Error saving recommendation:', error);
      alert('Failed to save recommendation');
    } finally {
      setSaving(false);
    }
  };

  const addRecommendationField = () => {
    setNewRecommendation(prev => ({
      ...prev,
      recommendations: [...prev.recommendations, '']
    }));
  };

  const addFavorFoodField = () => {
    setNewRecommendation(prev => ({
      ...prev,
      foods_to_favor: [...prev.foods_to_favor, '']
    }));
  };

  const addAvoidFoodField = () => {
    setNewRecommendation(prev => ({
      ...prev,
      foods_to_avoid: [...prev.foods_to_avoid, '']
    }));
  };

  const updateRecommendationField = (index: number, value: string) => {
    setNewRecommendation(prev => {
      const newRecs = [...prev.recommendations];
      newRecs[index] = value;
      return { ...prev, recommendations: newRecs };
    });
  };

  const updateFavorFoodField = (index: number, value: string) => {
    setNewRecommendation(prev => {
      const newFoods = [...prev.foods_to_favor];
      newFoods[index] = value;
      return { ...prev, foods_to_favor: newFoods };
    });
  };

  const updateAvoidFoodField = (index: number, value: string) => {
    setNewRecommendation(prev => {
      const newFoods = [...prev.foods_to_avoid];
      newFoods[index] = value;
      return { ...prev, foods_to_avoid: newFoods };
    });
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">Nutrition Management</h2>
        </div>
      </div>

      {/* Patient Selection */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Select Patient</h5>
            </div>
            <div className="card-body">
              <select
                className="form-select"
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name} {patient.prakriti_type && `(${patient.prakriti_type})`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedPatient && (
        <>
          {/* Tab Navigation */}
          <div className="row mb-4">
            <div className="col-12">
              <ul className="nav nav-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'recommendations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recommendations')}
                  >
                    Create Recommendations
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    Nutrition Dashboard
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    Patient History
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Create New Recommendation Tab */}
          {activeTab === 'recommendations' && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Create New Nutrition Recommendation</h5>
                  </div>
                  <div className="card-body">
                    {/* General Recommendations */}
                    <div className="mb-4">
                      <label className="form-label fw-bold">General Recommendations</label>
                      {newRecommendation.recommendations.map((rec, index) => (
                        <div className="mb-2" key={index}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`Recommendation ${index + 1}`}
                            value={rec}
                            onChange={(e) => updateRecommendationField(index, e.target.value)}
                          />
                        </div>
                      ))}
                      <button 
                        type="button" 
                        className="btn btn-outline-primary btn-sm"
                        onClick={addRecommendationField}
                      >
                        + Add Recommendation
                      </button>
                    </div>

                    {/* Foods to Favor */}
                    <div className="mb-4">
                      <label className="form-label fw-bold">Foods to Favor</label>
                      {newRecommendation.foods_to_favor.map((food, index) => (
                        <div className="mb-2" key={index}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`Food ${index + 1}`}
                            value={food}
                            onChange={(e) => updateFavorFoodField(index, e.target.value)}
                          />
                        </div>
                      ))}
                      <button 
                        type="button" 
                        className="btn btn-outline-primary btn-sm"
                        onClick={addFavorFoodField}
                      >
                        + Add Food
                      </button>
                    </div>

                    {/* Foods to Avoid */}
                    <div className="mb-4">
                      <label className="form-label fw-bold">Foods to Avoid</label>
                      {newRecommendation.foods_to_avoid.map((food, index) => (
                        <div className="mb-2" key={index}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`Food ${index + 1}`}
                            value={food}
                            onChange={(e) => updateAvoidFoodField(index, e.target.value)}
                          />
                        </div>
                      ))}
                      <button 
                        type="button" 
                        className="btn btn-outline-primary btn-sm"
                        onClick={addAvoidFoodField}
                      >
                        + Add Food
                      </button>
                    </div>

                    {/* Meal Timing */}
                    <div className="mb-4">
                      <label className="form-label fw-bold">Meal Timing Guidelines</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Enter meal timing recommendations..."
                        value={newRecommendation.meal_timing}
                        onChange={(e) => setNewRecommendation(prev => ({ ...prev, meal_timing: e.target.value }))}
                      ></textarea>
                    </div>

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="form-label fw-bold">Additional Notes</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Any additional notes..."
                        value={newRecommendation.notes}
                        onChange={(e) => setNewRecommendation(prev => ({ ...prev, notes: e.target.value }))}
                      ></textarea>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={handleSaveRecommendation}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Recommendation'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nutrition Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Patient Nutrition Dashboard</h5>
                  </div>
                  <div className="card-body">
                    <NutritionDashboard />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Patient Diet History Tab */}
          {activeTab === 'history' && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Patient Diet History</h5>
                  </div>
                  <div className="card-body">
                    {dietRecommendations.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Prakriti Type</th>
                              <th>Type</th>
                              <th>Recommendations</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dietRecommendations.map((rec) => (
                              <tr key={rec.id}>
                                <td>{new Date(rec.created_at).toLocaleDateString()}</td>
                                <td>{rec.prakriti_type}</td>
                                <td>{rec.recommendation_type}</td>
                                <td>
                                  {rec.recommendations?.slice(0, 2).map((rec: string, idx: number) => (
                                    <div key={idx} className="small">{rec}</div>
                                  ))}
                                  {rec.recommendations && rec.recommendations.length > 2 && (
                                    <div className="small text-muted">+{rec.recommendations.length - 2} more</div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted">No diet recommendations found for this patient.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedPatient && (
        <div className="row">
          <div className="col-12">
            <div className="alert alert-info">
              Please select a patient to view and manage their nutrition recommendations.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PractitionerNutritionManager;