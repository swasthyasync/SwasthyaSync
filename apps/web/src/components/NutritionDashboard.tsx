// apps/web/src/components/NutritionDashboard.tsx - COMPLETE OPTIMIZED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import './NutritionDashboard.css';
import { ChevronRight, Search, Filter, Leaf, AlertCircle, BarChart3, X, TrendingUp, ChevronDown } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FoodItem {
  id: string;
  name_en: string;
  name_sanskrit: string;
  food_group: string;
  calories_per_100g: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  vitamins: string[];
  minerals: string[];
  rasa: string[];
  virya: string;
  vipaka: string;
  dosha_effect: string[];
  therapeutic_uses: string[];
  recommended_portion: string;
}

interface DietRecommendation {
  id: string;
  prakriti_type: string;
  recommendations: any;
  foods_to_favor: any;
  foods_to_avoid: any;
  meal_timing: any;
  created_at: string;
  recommendation_type: string;
}

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

const NutritionDashboard: React.FC<{ prakritiScores?: PrakritiScores }> = ({ prakritiScores }) => {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [dietRecommendations, setDietRecommendations] = useState<DietRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFoodGroup, setSelectedFoodGroup] = useState('');
  const [selectedDosha, setSelectedDosha] = useState('');
  const [selectedVitamin, setSelectedVitamin] = useState('');
  const [selectedMineral, setSelectedMineral] = useState('');
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [showVisualization, setShowVisualization] = useState(false);
  const [visualizationType, setVisualizationType] = useState('macro');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showFoodDetail, setShowFoodDetail] = useState(false);
  
  const [showVitaminDropdown, setShowVitaminDropdown] = useState(false);
  const [showMineralDropdown, setShowMineralDropdown] = useState(false);

  const vitaminDropdownRef = useRef<HTMLDivElement>(null);
  const mineralDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vitaminDropdownRef.current && !vitaminDropdownRef.current.contains(event.target as Node)) {
        setShowVitaminDropdown(false);
      }
      if (mineralDropdownRef.current && !mineralDropdownRef.current.contains(event.target as Node)) {
        setShowMineralDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getVitaminDescription = (vitamin: string) => {
    const descriptions: Record<string, string> = {
      'A': 'Essential for vision, immune system, and skin health',
      'B1': 'Helps convert food into energy and supports nerve function',
      'B2': 'Important for energy production and cellular function',
      'B3': 'Supports digestive system, skin, and nervous system',
      'B6': 'Important for brain development and function',
      'B12': 'Essential for nerve tissue health and red blood cell formation',
      'C': 'Antioxidant that supports immune system and skin health',
      'D': 'Helps the body absorb calcium and supports bone health',
      'E': 'Antioxidant that helps protect cells from damage',
      'K': 'Essential for blood clotting and bone health',
      'Biotin': 'Supports healthy hair, skin, and nails',
      'Folate': 'Important for DNA synthesis and cell division'
    };
    return descriptions[vitamin] || 'Essential nutrient for overall health';
  };

  const getMineralDescription = (mineral: string) => {
    const descriptions: Record<string, string> = {
      'Calcium': 'Essential for bone health and muscle function',
      'Iron': 'Important for oxygen transport in the blood',
      'Magnesium': 'Supports muscle and nerve function, blood sugar control',
      'Potassium': 'Helps regulate fluid balance and blood pressure',
      'Zinc': 'Supports immune system and wound healing',
      'Selenium': 'Antioxidant that protects cells from damage',
      'Copper': 'Helps with iron metabolism and nervous system function',
      'Manganese': 'Supports bone formation and wound healing',
      'Phosphorus': 'Essential for bone health and energy production',
      'Sodium': 'Helps maintain fluid balance and nerve function',
      'Iodine': 'Essential for thyroid function'
    };
    return descriptions[mineral] || 'Essential mineral for bodily functions';
  };

  const getVitaminBenefits = (vitamin: string) => {
    const benefits: Record<string, string[]> = {
      'A': ['Supports Vata eye health', 'Balances Pitta skin conditions', 'Strengthens Kapha immune system'],
      'B1': ['Supports Vata nervous system', 'Balances Pitta energy metabolism', 'Reduces Kapha lethargy'],
      'C': ['Supports Vata immune system', 'Balances Pitta antioxidant needs', 'Reduces Kapha inflammation'],
      'D': ['Supports Vata bone health', 'Balances Pitta calcium absorption', 'Reduces Kapha bone density issues'],
      'E': ['Supports Vata cellular protection', 'Balances Pitta skin healing', 'Reduces Kapha oxidative stress'],
    };
    return benefits[vitamin] || ['General health benefits'];
  };

  const getMineralBenefits = (mineral: string) => {
    const benefits: Record<string, string[]> = {
      'Calcium': ['Supports Vata bone health', 'Balances Pitta bone metabolism', 'Reduces Kapha calcification'],
      'Iron': ['Supports Vata blood health', 'Balances Pitta oxygenation', 'Reduces Kapha anemia'],
      'Magnesium': ['Supports Vata muscle relaxation', 'Balances Pitta nervous system', 'Reduces Kapha water retention'],
      'Potassium': ['Supports Vata nerve function', 'Balances Pitta blood pressure', 'Reduces Kapha fluid retention'],
      'Zinc': ['Supports Vata immune function', 'Balances Pitta skin healing', 'Reduces Kapha immune sluggishness'],
    };
    return benefits[mineral] || ['General health benefits'];
  };

  const calculateAverageNutrition = () => {
    if (foodItems.length === 0) return [];
    const total = foodItems.reduce((acc, food) => ({
      calories: acc.calories + food.calories_per_100g,
      protein: acc.protein + food.protein_g,
      carbs: acc.carbs + food.carbs_g,
      fat: acc.fat + food.fat_g
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const count = foodItems.length;
    return [
      { name: 'Protein', value: Math.round((total.protein / count) * 10) / 10, color: '#FF6B6B' },
      { name: 'Carbs', value: Math.round((total.carbs / count) * 10) / 10, color: '#4ECDC4' },
      { name: 'Fat', value: Math.round((total.fat / count) * 10) / 10, color: '#FFD93D' }
    ];
  };

  const getDoeshaDistribution = () => {
    const vataCount = foodItems.filter(f => f.dosha_effect.some(e => e.includes('Vata'))).length;
    const pittaCount = foodItems.filter(f => f.dosha_effect.some(e => e.includes('Pitta'))).length;
    const kaphaCount = foodItems.filter(f => f.dosha_effect.some(e => e.includes('Kapha'))).length;

    return [
      { name: 'Vata', value: vataCount, color: '#a78bfa' },
      { name: 'Pitta', value: pittaCount, color: '#f87171' },
      { name: 'Kapha', value: kaphaCount, color: '#22d3ee' }
    ];
  };

  const getFoodGroupDistribution = () => {
    const groupCounts = foodItems.reduce((acc, food) => {
      acc[food.food_group] = (acc[food.food_group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#F38181', '#A8D8EA', '#FFB6B9', '#8FD14F'];
    return Object.entries(groupCounts).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }));
  };

  const getCalorieComparison = () => {
    return foodItems.map(food => ({
      name: food.name_en.substring(0, 10),
      calories: food.calories_per_100g,
      protein: food.protein_g,
      carbs: food.carbs_g
    }));
  };

  const getMicronutritionData = () => {
    const vitaminCounts: Record<string, number> = {};
    const mineralCounts: Record<string, number> = {};

    foodItems.forEach(food => {
      food.vitamins.forEach(vitamin => {
        if (vitamin) vitaminCounts[vitamin] = (vitaminCounts[vitamin] || 0) + 1;
      });
      food.minerals.forEach(mineral => {
        if (mineral) mineralCounts[mineral] = (mineralCounts[mineral] || 0) + 1;
      });
    });

    const topVitamins = Object.entries(vitaminCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const topMinerals = Object.entries(mineralCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return { vitamins: topVitamins, minerals: topMinerals };
  };

  const getDoshaMicronutritionData = () => {
    const vataFoods = foodItems.filter(food => food.dosha_effect.some(effect => effect.includes('Vata')));
    const pittaFoods = foodItems.filter(food => food.dosha_effect.some(effect => effect.includes('Pitta')));
    const kaphaFoods = foodItems.filter(food => food.dosha_effect.some(effect => effect.includes('Kapha')));
    
    const getMicronutritionForFoods = (foods: FoodItem[]) => {
      const vitaminCounts: Record<string, number> = {};
      const mineralCounts: Record<string, number> = {};
      
      foods.forEach(food => {
        food.vitamins.forEach(vitamin => {
          if (vitamin) vitaminCounts[vitamin] = (vitaminCounts[vitamin] || 0) + 1;
        });
        food.minerals.forEach(mineral => {
          if (mineral) mineralCounts[mineral] = (mineralCounts[mineral] || 0) + 1;
        });
      });
      
      const topVitamins = Object.entries(vitaminCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
        
      const topMinerals = Object.entries(mineralCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
        
      return { vitamins: topVitamins, minerals: topMinerals };
    };
    
    return {
      vata: getMicronutritionForFoods(vataFoods),
      pitta: getMicronutritionForFoods(pittaFoods),
      kapha: getMicronutritionForFoods(kaphaFoods)
    };
  };

  const searchFoodItemsByDosha = async (dosha: string) => {
    if (!dosha) return;
    
    try {
      setLoading(true);
      setError('');

      const { data: allFoods, error: allError } = await supabase
        .from('food_items')
        .select('*')
        .limit(500);

      if (allError) throw allError;

      if (!allFoods || allFoods.length === 0) {
        setError('No food items found in database. Please check your data.');
        setFoodItems([]);
        setSearched(true);
        return;
      }

      const filtered = allFoods.filter((food: any) => {
        const effects = Array.isArray(food.dosha_effect) 
          ? food.dosha_effect 
          : typeof food.dosha_effect === 'string'
            ? JSON.parse(food.dosha_effect)
            : [];

        return effects.some((effect: string) =>
          effect.toLowerCase().includes(`reduces ${dosha.toLowerCase()}`) ||
          effect.toLowerCase().includes(`balances ${dosha.toLowerCase()}`)
        );
      });

      if (filtered.length === 0) {
        setError(`No foods found for ${dosha}. Try different filters.`);
      }
      
      setFoodItems(filtered);
      setSearched(true);

    } catch (error) {
      console.error('Error searching by dosha:', error);
      setError(`Search error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setFoodItems([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const getAllMicronutrients = () => {
    const allVitamins = new Set<string>();
    const allMinerals = new Set<string>();
    
    foodItems.forEach(food => {
      food.vitamins.forEach(vitamin => {
        if (vitamin) allVitamins.add(vitamin);
      });
      food.minerals.forEach(mineral => {
        if (mineral) allMinerals.add(mineral);
      });
    });
    
    return {
      vitamins: Array.from(allVitamins).sort(),
      minerals: Array.from(allMinerals).sort()
    };
  };

  const filterFoodsByMicronutrients = (foods: FoodItem[]) => {
    if (!selectedVitamin && !selectedMineral) return foods;
    
    return foods.filter(food => {
      const hasVitamin = selectedVitamin ? food.vitamins.includes(selectedVitamin) : true;
      const hasMineral = selectedMineral ? food.minerals.includes(selectedMineral) : true;
      return hasVitamin && hasMineral;
    });
  };

  useEffect(() => {
    fetchNutritionData();
    
    if (prakritiScores) {
      const predictedDosha = prakritiScores.ml_prediction?.predicted || prakritiScores.dominant;
      setSelectedDosha(predictedDosha);
    }
  }, [prakritiScores]);

  const fetchNutritionData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data: recommendations, error: recError } = await supabase
        .from('diet_recommendations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recError) throw recError;
      setDietRecommendations(recommendations || []);

    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const searchFoodItems = async (overrideDosha?: string) => {
    const doshaToUse = overrideDosha || selectedDosha;
    
    if (!searchTerm && !selectedFoodGroup && !doshaToUse && !prakritiScores) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      let query = supabase.from('food_items').select('*');

      if (searchTerm) {
        query = query.or(`name_en.ilike.%${searchTerm}%,name_sanskrit.ilike.%${searchTerm}%`);
      }

      if (selectedFoodGroup) {
        query = query.eq('food_group', selectedFoodGroup);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      let filtered = data || [];
      if (doshaToUse && filtered.length > 0) {
        filtered = filtered.filter((food: any) => {
          const effects = Array.isArray(food.dosha_effect)
            ? food.dosha_effect
            : typeof food.dosha_effect === 'string'
              ? JSON.parse(food.dosha_effect)
              : [];

          return effects.some((effect: string) =>
            effect.toLowerCase().includes(`reduces ${doshaToUse.toLowerCase()}`) ||
            effect.toLowerCase().includes(`balances ${doshaToUse.toLowerCase()}`)
          );
        });
      }
      
      filtered = filterFoodsByMicronutrients(filtered);

      if (filtered.length === 0 && doshaToUse) {
        setError(`No foods found matching your filters. Try adjusting them.`);
      }
      
      setFoodItems(filtered);
      setSearched(true);

    } catch (error) {
      console.error('Search error:', error);
      setError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedFoodGroup('');
    setSelectedDosha('');
    setSelectedVitamin('');
    setSelectedMineral('');
    setSearched(false);
    setError('');
    setFoodItems([]);
    setShowVisualization(false);
    setShowFoodDetail(false);
    setSelectedFood(null);
    fetchNutritionData();
  };

  const getDoshaEffectBadge = (effects: string[]) => {
    return effects.map((effect, index) => {
      let className = 'dosha-badge ';
      
      if (effect.toLowerCase().includes('reduces')) {
        className += 'reduces';
      } else if (effect.toLowerCase().includes('aggravates')) {
        className += 'aggravates';
      } else if (effect.toLowerCase().includes('balances')) {
        className += 'balances';
      } else {
        className += 'neutral';
      }
      
      return (
        <span key={index} className={className}>
          {effect.replace('Reduces ', 'R: ').replace('Aggravates ', 'A: ').replace('Balances ', 'B: ')}
        </span>
      );
    });
  };

  const getRasaBadges = (rasas: string[]) => {
    const rasaIcons: Record<string, string> = {
      'Madhura': '🍯',
      'Amla': '🍋',
      'Lavana': '🧂',
      'Katu': '🌶️',
      'Tikta': '🌿',
      'Kashaya': '🍂'
    };
    
    return rasas.map((rasa, index) => (
      <span key={index} className={`rasa-badge rasa-${rasa.toLowerCase()}`}>
        {rasaIcons[rasa] || '🌾'} {rasa}
      </span>
    ));
  };

  const getVirtyaDisplay = (virya: string) => {
    const icon = virya === 'Ushna' ? '🔥' : '❄️';
    const className = `virya-badge virya-${virya.toLowerCase()}`;
    return <span className={className}>{icon} {virya}</span>;
  };

  const getPersonalizedRecommendations = () => {
    if (!prakritiScores) return null;
    
    const predictedDosha = prakritiScores.ml_prediction?.predicted || prakritiScores.dominant;
    const confidence = prakritiScores.ml_prediction?.confidence || 0;
    
    return (
      <div className="personalized-header">
        <div className="personalized-info">
          <h3>Your Personalized Nutrition Plan</h3>
          <p>
            Based on your <strong>{predictedDosha}</strong> constitution
            {confidence > 0 && ` (ML Confidence: ${(confidence * 100).toFixed(0)}%)`}
          </p>
        </div>
        <div className="dosha-indicator">
          <span className={`dosha-badge ${predictedDosha.toLowerCase()}`}>
            {predictedDosha} Dominant
          </span>
        </div>
      </div>
    );
  };

  const micronutrients = calculateAverageNutrition();
  const doshaData = getDoeshaDistribution();
  const groupData = getFoodGroupDistribution();
  const calorieData = getCalorieComparison();
  const micronutritionData = getMicronutritionData();

  if (loading && !searched) {
    return (
      <div className="nutrition-page">
        <div className="loader-container">
          <div className="spinner"></div>
          <p className="loader-text">Loading your nutrition dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nutrition-page">
      <div className="nutrition-header">
        <div className="header-content">
          <h1 className="header-title">Ayurvedic Nutrition</h1>
          <p className="header-subtitle">
            Personalized food recommendations based on your {prakritiScores?.dominant || 'constitution'}
          </p>
        </div>
      </div>

      <div className="nutrition-container">
        {prakritiScores && (
          <section className="personalized-section">
            {getPersonalizedRecommendations()}
          </section>
        )}

        {error && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={20} style={{ color: '#ff6b6b', flexShrink: 0 }} />
            <div>
              <p style={{ color: '#ff6b6b', margin: 0, fontWeight: 500 }}>Nutrition Search Issue</p>
              <p style={{ color: '#d32f2f', margin: '4px 0 0 0', fontSize: '0.9em' }}>{error}</p>
            </div>
          </div>
        )}

        {dietRecommendations.length > 0 && (
          <section className="recommendations-section">
            <div className="section-header">
              <h2 className="section-title">Your Personalized Diet Plan</h2>
              <span className="section-badge">{dietRecommendations.length} Plans</span>
            </div>

            <div className="recommendations-grid">
              {dietRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`rec-card ${expandedRec === rec.id ? 'expanded' : ''}`}
                  onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                >
                  <div className="rec-header">
                    <div className="rec-title-group">
                      <h3 className="rec-title">{rec.prakriti_type} Constitution</h3>
                      <span className="rec-type-badge">{rec.recommendation_type}</span>
                    </div>
                    <ChevronRight className="rec-chevron" size={24} />
                  </div>

                  {expandedRec === rec.id && (
                    <div className="rec-content">
                      {rec.recommendations?.length > 0 && (
                        <div className="rec-section">
                          <h4 className="rec-section-title">📋 General Guidelines</h4>
                          <ul className="rec-list">
                            {rec.recommendations.map((guideline: string, idx: number) => (
                              <li key={idx}>{guideline}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rec.foods_to_favor?.length > 0 && (
                        <div className="rec-section">
                          <h4 className="rec-section-title">✅ Foods to Favor</h4>
                          <div className="food-tags favor">
                            {rec.foods_to_favor.map((food: string, idx: number) => (
                              <span key={idx} className="food-tag">{food}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {rec.foods_to_avoid?.length > 0 && (
                        <div className="rec-section">
                          <h4 className="rec-section-title">❌ Foods to Avoid</h4>
                          <div className="food-tags avoid">
                            {rec.foods_to_avoid.map((food: string, idx: number) => (
                              <span key={idx} className="food-tag avoid-tag">{food}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {rec.meal_timing && (
                        <div className="rec-section">
                          <h4 className="rec-section-title">⏰ Meal Timing</h4>
                          <p className="meal-timing">{rec.meal_timing}</p>
                        </div>
                      )}

                      <small className="rec-date">Created: {new Date(rec.created_at).toLocaleDateString()}</small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

    <section className="food-database-section">
          <div className="section-header">
            <h2 className="section-title">🌿 Ayurvedic Food Database</h2>
            <span className="section-badge">{foodItems.length} Foods</span>
          </div>

          <div className="search-filters-container">
            <div className="search-box">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search for foods by name (e.g., rice, dal, turmeric, ghee)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchFoodItems()}
              />
            </div>

            <div className="filters-row">
              <select
                className="filter-select"
                value={selectedFoodGroup}
                onChange={(e) => setSelectedFoodGroup(e.target.value)}
              >
                <option value="">All Food Groups</option>
                <option value="Grain">🌾 Grain</option>
                <option value="Fruit">🍎 Fruit</option>
                <option value="Vegetable">🥬 Vegetable</option>
                <option value="Dairy">🥛 Dairy</option>
                <option value="Legume">🫘 Legume</option>
                <option value="Spice">🌶️ Spice</option>
                <option value="Meat">🍖 Meat</option>
                <option value="Fish">🐟 Fish</option>
                <option value="Nut">🥜 Nut</option>
                <option value="Oil">🫗 Oil</option>
                <option value="Sweetener">🍯 Sweetener</option>
              </select>

              <select
                className="filter-select"
                value={selectedDosha}
                onChange={(e) => setSelectedDosha(e.target.value)}
              >
                <option value="">All Doshas</option>
                <option value="Vata">💨 Vata</option>
                <option value="Pitta">🔥 Pitta</option>
                <option value="Kapha">💧 Kapha</option>
              </select>

              <button className="btn-search" onClick={() => searchFoodItems()}>
                <Filter size={16} />
                Search
              </button>
              <button className="btn-clear" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>

          {searched && foodItems.length > 0 && (
            <div className="visualization-button-container">
              <button 
                className="btn-visualization"
                onClick={() => setShowVisualization(!showVisualization)}
              >
                <BarChart3 size={20} />
                Nutrition Visualization
              </button>
            </div>
          )}

          {showVisualization && searched && foodItems.length > 0 && (
            <div className="visualization-modal-overlay">
              <div className="visualization-modal">
                <div className="visualization-modal-header">
                  <div>
                    <h2 className="visualization-title">📊 Nutrition Analytics</h2>
                    <p className="visualization-subtitle">Comprehensive visualization of your food search results</p>
                  </div>
                  <button 
                    className="visualization-close-btn"
                    onClick={() => setShowVisualization(false)}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="visualization-modal-content">
                  <div className="visualization-tabs">
                    {[
                      { id: 'macro', label: '📊 Macronutrients' },
                      { id: 'dosha', label: '⚖️ Dosha Effects' },
                      { id: 'group', label: '🥘 Food Groups' },
                      { id: 'calories', label: '🔥 Calorie Comparison' },
                      { id: 'micronutrients', label: '🔬 Vitamins & Minerals' },
                      { id: 'doshaMicronutrients', label: '🧬 Dosha Micronutrients' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setVisualizationType(tab.id)}
                        className={`visualization-tab ${visualizationType === tab.id ? 'active' : ''}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {visualizationType === 'macro' && (
                    <div className="visualization-grid">
                      <div className="visualization-card">
                        <h3 className="visualization-card-title">Average Macro Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={micronutrients} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                              {micronutrients.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {visualizationType === 'dosha' && (
                    <div className="visualization-grid">
                      <div className="visualization-card">
                        <h3 className="visualization-card-title">Dosha Distribution in Results</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={doshaData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8" radius={[8, 8, 0, 0]}>
                              {doshaData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {visualizationType === 'group' && (
                    <div className="visualization-grid">
                      <div className="visualization-card">
                        <h3 className="visualization-card-title">Food Groups Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={groupData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} dataKey="value">
                              {groupData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {visualizationType === 'calories' && (
                    <div className="visualization-card">
                      <h3 className="visualization-card-title">Calorie & Nutrient Comparison</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={calorieData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="calories" fill="#FF6B6B" radius={[8, 8, 0, 0]} name="Calories (per 100g)" />
                          <Bar yAxisId="right" dataKey="protein" fill="#4ECDC4" radius={[8, 8, 0, 0]} name="Protein (g)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {visualizationType === 'micronutrients' && (
                    <div className="visualization-grid">
                      <div className="visualization-card">
                        <h3 className="visualization-card-title">Top Vitamins in Your Foods</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={micronutritionData.vitamins}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#FF6B6B" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="visualization-card">
                        <h3 className="visualization-card-title">Top Minerals in Your Foods</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={micronutritionData.minerals}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#4ECDC4" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {visualizationType === 'doshaMicronutrients' && (
                    <div className="visualization-grid">
                      <div className="visualization-card">
                        <h3 className="visualization-card-title">🔬 Vata: Vitamin Content</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={getDoshaMicronutritionData().vata.vitamins}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#a78bfa" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="visualization-card">
                        <h3 className="visualization-card-title">🔬 Pitta: Vitamin Content</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={getDoshaMicronutritionData().pitta.vitamins}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#f87171" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="visualization-card">
                        <h3 className="visualization-card-title">🔬 Kapha: Vitamin Content</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={getDoshaMicronutritionData().kapha.vitamins}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="visualization-insight">
                    <p>
                      <TrendingUp size={16} style={{ display: 'inline', marginRight: '8px' }} />
                      <strong>Insight:</strong> These visualizations update based on your search results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {searched && foodItems.length > 0 ? (
            <div className="food-items-compact-grid">
              {foodItems.map((food) => (
                <div key={food.id} className="food-card-compact">
                  <div className="food-card-header">
                    <div>
                      <h4 className="food-name">{food.name_en}</h4>
                      {food.name_sanskrit && (
                        <p className="food-sanskrit">{food.name_sanskrit}</p>
                      )}
                    </div>
                  </div>

                  <div className="food-card-body">
                    {food.rasa && (
                      <div className="food-property">
                        <span className="property-label">Rasa</span>
                        <div className="property-badges">
                          {getRasaBadges(food.rasa)}
                        </div>
                      </div>
                    )}

                    <div className="food-property">
                      <span className="property-label">Virya • Vipaka</span>
                      <div className="property-badges">
                        {getVirtyaDisplay(food.virya)}
                        <span className="vipaka-badge">{food.vipaka}</span>
                      </div>
                    </div>

                    {food.dosha_effect && (
                      <div className="food-property">
                        <span className="property-label">Dosha</span>
                        <div className="property-badges">
                          {getDoshaEffectBadge(food.dosha_effect)}
                        </div>
                      </div>
                    )}

                    {(food.vitamins.length > 0 || food.minerals.length > 0) && (
                      <div className="food-property">
                        <span className="property-label">Micronutrients</span>
                        <div className="micronutrients-summary">
                          {food.vitamins.length > 0 && (
                            <span className="micro-badge">{food.vitamins.length} Vitamins</span>
                          )}
                          {food.minerals.length > 0 && (
                            <span className="micro-badge">{food.minerals.length} Minerals</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="nutrition-table">
                      <div className="nutrition-row">
                        <span className="nut-label">Cal</span>
                        <span className="nut-value">{food.calories_per_100g}</span>
                      </div>
                      <div className="nutrition-row">
                        <span className="nut-label">Pro</span>
                        <span className="nut-value">{food.protein_g}g</span>
                      </div>
                      <div className="nutrition-row">
                        <span className="nut-label">Carbs</span>
                        <span className="nut-value">{food.carbs_g}g</span>
                      </div>
                      <div className="nutrition-row">
                        <span className="nut-label">Fat</span>
                        <span className="nut-value">{food.fat_g}g</span>
                      </div>
                    </div>

                    <button 
                      className="btn-view-details"
                      onClick={() => {
                        setSelectedFood(food);
                        setShowFoodDetail(true);
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : searched && foodItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Leaf size={56} />
              </div>
              <p className="empty-title">No foods found</p>
              <p className="empty-text">
                No foods found matching your filters. Try different search terms.
              </p>
            </div>
          ) : !searched ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Leaf size={56} />
              </div>
              <p className="empty-title">Start searching</p>
              <p className="empty-text">
                {prakritiScores
                  ? `Click "Search" to find foods that balance your ${prakritiScores.dominant} constitution`
                  : 'Enter search criteria to explore our Ayurvedic food database'}
              </p>
              {prakritiScores && (
                <button
                  className="btn-primary"
                  onClick={() => searchFoodItemsByDosha(prakritiScores.ml_prediction?.predicted || prakritiScores.dominant)}
                >
                  Show Foods for {(prakritiScores.ml_prediction?.predicted || prakritiScores.dominant).toUpperCase()}
                </button>
              )}
            </div>
          ) : null}
        </section>

        {showFoodDetail && selectedFood && (
          <div className="food-detail-modal-overlay">
            <div className="food-detail-modal">
              <div className="food-detail-header">
                <div>
                  <h2 className="food-detail-title">{selectedFood.name_en}</h2>
                  {selectedFood.name_sanskrit && (
                    <p className="food-detail-sanskrit">{selectedFood.name_sanskrit}</p>
                  )}
                </div>
                <button 
                  className="food-detail-close-btn"
                  onClick={() => setShowFoodDetail(false)}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="food-detail-content">
                <div className="food-detail-grid">
                  <div className="food-detail-card">
                    <h3 className="food-detail-card-title">📋 Basic Information</h3>
                    <div className="detail-info">
                      <span className="detail-label">Food Group:</span>
                      <span className="detail-value">{selectedFood.food_group}</span>
                    </div>
                    <div className="detail-info">
                      <span className="detail-label">Recommended Portion:</span>
                      <span className="detail-value">{selectedFood.recommended_portion}</span>
                    </div>
                  </div>
                  
                  <div className="food-detail-card">
                    <h3 className="food-detail-card-title">🌱 Ayurvedic Properties</h3>
                    <div className="detail-info">
                      <span className="detail-label">Rasa (Taste):</span>
                      <div className="detail-badges">
                        {selectedFood.rasa && getRasaBadges(selectedFood.rasa)}
                      </div>
                    </div>
                    <div className="detail-info">
                      <span className="detail-label">Virya (Potency):</span>
                      <div className="detail-badges">
                        {getVirtyaDisplay(selectedFood.virya)}
                      </div>
                    </div>
                    <div className="detail-info">
                      <span className="detail-label">Vipaka (Post-Digestive):</span>
                      <div className="detail-badges">
                        <span className="vipaka-badge">{selectedFood.vipaka}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="food-detail-card">
                    <h3 className="food-detail-card-title">⚖️ Dosha Effects</h3>
                    <div className="detail-info">
                      <span className="detail-label">Effects:</span>
                      <div className="detail-badges">
                        {getDoshaEffectBadge(selectedFood.dosha_effect)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="food-detail-card">
                    <h3 className="food-detail-card-title">📊 Macronutrients (per 100g)</h3>
                    <div className="detail-info">
                      <span className="detail-label">Calories:</span>
                      <span className="detail-value">{selectedFood.calories_per_100g}</span>
                    </div>
                    <div className="detail-info">
                      <span className="detail-label">Protein:</span>
                      <span className="detail-value">{selectedFood.protein_g}g</span>
                    </div>
                    <div className="detail-info">
                      <span className="detail-label">Carbs:</span>
                      <span className="detail-value">{selectedFood.carbs_g}g</span>
                    </div>
                    <div className="detail-info">
                      <span className="detail-label">Fat:</span>
                      <span className="detail-value">{selectedFood.fat_g}g</span>
                    </div>
                    <div className="detail-info">
                      <span className="detail-label">Fiber:</span>
                      <span className="detail-value">{selectedFood.fiber_g}g</span>
                    </div>
                  </div>
                  
                  {selectedFood.vitamins.length > 0 && (
                    <div className="food-detail-card">
                      <h3 className="food-detail-card-title">🔬 Vitamins</h3>
                      <div className="micronutrient-list">
                        {selectedFood.vitamins.map((vitamin, idx) => (
                          <div key={idx} className="micronutrient-item">
                            <span className="vitamin-tag">{vitamin}</span>
                            <p className="micro-desc">{getVitaminDescription(vitamin)}</p>
                            <div className="micro-benefits">
                              {getVitaminBenefits(vitamin).map((benefit, bIdx) => (
                                <span key={bIdx} className="benefit-small">{benefit}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedFood.minerals.length > 0 && (
                    <div className="food-detail-card">
                      <h3 className="food-detail-card-title">🧂 Minerals</h3>
                      <div className="micronutrient-list">
                        {selectedFood.minerals.map((mineral, idx) => (
                          <div key={idx} className="micronutrient-item">
                            <span className="mineral-tag">{mineral}</span>
                            <p className="micro-desc">{getMineralDescription(mineral)}</p>
                            <div className="micro-benefits">
                              {getMineralBenefits(mineral).map((benefit, bIdx) => (
                                <span key={bIdx} className="benefit-small">{benefit}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedFood.therapeutic_uses.length > 0 && (
                    <div className="food-detail-card">
                      <h3 className="food-detail-card-title">💊 Therapeutic Uses</h3>
                      <div className="therapeutic-uses">
                        {selectedFood.therapeutic_uses.map((use, idx) => (
                          <span key={idx} className="use-tag">{use}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="principles-section">
          <div className="section-header">
            <h2 className="section-title">⭐ Ayurvedic Nutrition Principles</h2>
          </div>

          <div className="principles-grid">
            <div className="principle-card">
              <div className="principle-icon">🌱</div>
              <h4 className="principle-name">Rasa (Taste)</h4>
              <p className="principle-desc">The six tastes influence your body and mind.</p>
            </div>
            <div className="principle-card">
              <div className="principle-icon">🔥</div>
              <h4 className="principle-name">Virya (Potency)</h4>
              <p className="principle-desc">Heating or cooling effect on digestion.</p>
            </div>
            <div className="principle-card">
              <div className="principle-icon">🌀</div>
              <h4 className="principle-name">Vipaka (Post-Digestive)</h4>
              <p className="principle-desc">Final effect after digestion.</p>
            </div>
            <div className="principle-card">
              <div className="principle-icon">⚖️</div>
              <h4 className="principle-name">Dosha Balance</h4>
              <p className="principle-desc">Foods can reduce, balance your doshas.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default NutritionDashboard;