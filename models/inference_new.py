# models/inference_new.py
import os
import json
import joblib
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

def convert_numpy_types(obj):
    """Convert numpy types to Python native types"""
    if isinstance(obj, dict):
        # Convert both keys and values
        return {
            convert_numpy_types(key): convert_numpy_types(value) 
            for key, value in obj.items()
        }
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def predict_from_answers(answers: Any) -> Dict[str, Any]:
    """
    Predict Prakriti from questionnaire answers
    Returns prediction based on trait analysis
    """
    try:
        print(f"🔮 Processing {len(answers) if answers else 0} answers for prediction")
        
        # Map the traits and weights to appropriate dosha scores
        trait_scores = {
            'vata': 0.0,
            'pitta': 0.0,
            'kapha': 0.0
        }
        
        # Define trait-to-dosha mapping with characteristic weights
        # Extended trait mapping including frontend question traits
        trait_mapping = {
            # Physical Characteristics
            'body_frame': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Thin, light
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Medium, muscular
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Large, solid
            },
            'weight_gain': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Difficult to gain
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Moderate gain/loss
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Easy to gain
            },
            'skin': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Dry, rough
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Warm, reddish
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Oily, smooth
            },
            
            # Mental Characteristics
            'mind_nature': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Quick, adaptable
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Sharp, focused
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Calm, steady
            },
            'memory': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Quick to learn, quick to forget
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Sharp, clear memory
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Slow to learn, never forgets
            },
            
            # Physiological Patterns
            'sleep': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Light, interrupted
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Moderate
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Deep, long
            },
            'digestion': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Irregular
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Strong, sharp
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Slow but steady
            },
            'appetite': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Variable
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Strong
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Consistent
            },
            
            # Energy & Activity
            'energy': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Variable
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Intense
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Sustained
            },
            'activity': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Quick, changing
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Focused, driven
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Slow, methodical
            },
            
            # Response Patterns
            'stress_response': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Anxiety
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Irritation
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Withdrawal
            },
            'climate_preference': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},    # Warm
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Cool
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}     # Moderate
            }
        }
        
        # Process each answer and calculate dosha scores
        total_weight = 0.0
        for answer in answers:
            trait = answer.get('trait', '')
            weight = float(answer.get('weight', 0.5))
            
            print(f"\n🔍 Processing answer - Trait: {trait}, Weight: {weight:.2f}")
            
            # Handle direct dosha traits first
            if trait in ('vata', 'pitta', 'kapha'):
                trait_scores[trait] += weight
                total_weight += weight
                print(f"  Direct dosha mapping: +{weight:.2f} to {trait}")
            
            # Handle characteristic traits from mapping
            elif trait in trait_mapping:
                # Map weight to category
                if weight < 0.3:
                    category = 'low'
                elif weight < 0.7:
                    category = 'medium'
                else:
                    category = 'high'
                
                # Get dosha distribution for this trait and weight
                dosha_dist = trait_mapping[trait][category]
                print(f"  Mapped trait '{trait}' (weight: {weight:.2f}) to category: {category}")
                print(f"  Distribution: {dosha_dist}")
                
                for dosha, score in dosha_dist.items():
                    contribution = score * weight
                    trait_scores[dosha] += contribution
                    print(f"  Adding {contribution:.2f} to {dosha}")
                total_weight += weight
            
            # Handle dosha-indicating traits from frontend
            elif trait.endswith('_vata') or trait.endswith('_pitta') or trait.endswith('_kapha'):
                dosha = trait.split('_')[-1]
                trait_scores[dosha] += weight
                total_weight += weight
                print(f"  Frontend dosha trait: +{weight:.2f} to {dosha}")
            
            print(f"  Current scores: vata={trait_scores['vata']:.2f}, pitta={trait_scores['pitta']:.2f}, kapha={trait_scores['kapha']:.2f}")
        
        print("\n🔍 Raw scores before normalization:")
        for dosha, score in trait_scores.items():
            print(f"  - {dosha}: {score:.2f}")
            
        # Normalize scores
        if total_weight > 0:
            for dosha in trait_scores:
                trait_scores[dosha] /= total_weight
            print("\n📊 Normalized scores:")
            for dosha, score in trait_scores.items():
                print(f"  - {dosha}: {score:.2%}")
        else:
            # Default equal distribution
            trait_scores = {'vata': 0.33, 'pitta': 0.33, 'kapha': 0.34}
        
        # Calculate percentages
        percent = {
            'vata': round(trait_scores['vata'] * 100),
            'pitta': round(trait_scores['pitta'] * 100),
            'kapha': round(trait_scores['kapha'] * 100)
        }
        
        # Determine dominant dosha
        dominant = max(trait_scores.items(), key=lambda x: x[1])[0]
        confidence = trait_scores[dominant]
        
        # Build prediction structure
        prediction = {
            'predicted': dominant,
            'confidence': confidence,
            'probabilities': {
                'vata': float(trait_scores['vata']),
                'pitta': float(trait_scores['pitta']),
                'kapha': float(trait_scores['kapha'])
            }
        }
        
        print(f"✅ Prediction: {prediction['predicted']} (confidence: {prediction['confidence']:.2%})")
        print(f"📊 Probabilities: vata={trait_scores['vata']:.2%}, pitta={trait_scores['pitta']:.2%}, kapha={trait_scores['kapha']:.2%}")
        
        # Build final response
        # Determine prakriti type based on dosha distribution
        sorted_doshas = sorted(trait_scores.items(), key=lambda x: x[1], reverse=True)
        
        if sorted_doshas[0][1] - sorted_doshas[2][1] < 0.1:
            prakriti_type = "tridoshic"
        elif sorted_doshas[0][1] - sorted_doshas[1][1] < 0.1:
            prakriti_type = f"{sorted_doshas[0][0]}-{sorted_doshas[1][0]}"
        else:
            prakriti_type = sorted_doshas[0][0]

        result = {
            'prakriti': {
                'vata': float(trait_scores['vata']),
                'pitta': float(trait_scores['pitta']),
                'kapha': float(trait_scores['kapha']),
                'dominant': str(dominant),
                'percent': {
                    'vata': round(trait_scores['vata'] * 100, 1),
                    'pitta': round(trait_scores['pitta'] * 100, 1),
                    'kapha': round(trait_scores['kapha'] * 100, 1)
                },
                'ml_prediction': {
                    'predicted': str(dominant),
                    'confidence': float(confidence),
                    'probabilities': trait_scores.copy()
                }
            },
            'confidence': float(confidence),
            'features_used': {
                'total_questions': int(len(answers)),
                'calculation_method': 'trait_based'
            }
        }
        
        print(f"📊 Final result - Primary: {result['prakriti']['dominant']}, Method: {result['features_used']['calculation_method']}")
        return result
        
    except Exception as e:
        import traceback
        print(f"❌ Prediction error: {traceback.format_exc()}")
        # Return a safe default response
        return {
            'prakriti': {
                'vata': 0.33,
                'pitta': 0.33,
                'kapha': 0.34,
                'dominant': 'vata',
                'percent': {
                    'vata': 33.0,
                    'pitta': 33.0,
                    'kapha': 34.0
                },
                'ml_prediction': None
            },
            'confidence': 0.5,
            'features_used': {
                'total_questions': len(answers) if answers else 0,
                'calculation_method': 'fallback'
            }
        }