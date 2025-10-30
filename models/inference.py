# models/inference.py
import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
import traceback

import numpy as np

# Cache for model
_model = None
_metadata = None

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

def load_model() -> Tuple[Any, Dict]:
    """Load the trained model and metadata"""
    global _model, _metadata
    
    if _model is not None and _metadata is not None:
        return _model, _metadata
    
    try:
        models_dir = os.path.join(os.path.dirname(__file__), 'models_out')
        model_path = os.path.join(models_dir, 'prakriti_model.joblib')
        meta_path = os.path.join(models_dir, 'prakriti_meta.json')
        
        if not os.path.exists(model_path):
            print(f"⚠️ Model file not found at {model_path}")
            # Return a dummy model for development
            return None, {"features": [], "categorical_features": []}
        
        _model = joblib.load(model_path)
        
        if os.path.exists(meta_path):
            with open(meta_path, 'r') as f:
                _metadata = json.load(f)
        else:
            _metadata = {"features": [], "categorical_features": []}
        
        return _model, _metadata
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return None, {"features": [], "categorical_features": []}

def calculate_prakriti_scores(answers: List[Dict]) -> Dict[str, float]:
    """Calculate prakriti scores from answers"""
    scores = {'vata': 0.0, 'pitta': 0.0, 'kapha': 0.0}
    
    for answer in answers:
        trait = answer.get('trait', '').lower()
        weight = float(answer.get('weight', 1))
        
        if trait in scores:
            scores[trait] += weight
    
    # Normalize scores to ensure they sum to 1
    total = sum(scores.values())
    if total > 0:
        for trait in scores:
            scores[trait] = scores[trait] / total
    else:
        # Default equal distribution if no valid answers
        scores = {'vata': 0.33, 'pitta': 0.33, 'kapha': 0.34}
    
    return scores

def determine_dominant_prakriti(scores: Dict[str, float]) -> str:
    """Determine dominant prakriti from scores"""
    if not scores:
        return 'vata'
    
    # Find the dominant dosha
    dominant = max(scores.items(), key=lambda x: x[1])
    return dominant[0]

def predict_from_answers(answers: Any) -> Dict[str, Any]:
    """
    Predict Prakriti from questionnaire answers
    Returns both traditional calculation and ML prediction
    """
    try:
        print(f"🔮 Processing {len(answers) if answers else 0} answers for prediction")
        
        # Initialize prakriti scores
        prakriti_scores = {
            'vata': 0.0,
            'pitta': 0.0,
            'kapha': 0.0
        }
        
        trait_mapping = {
            'sleep': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},  # Light sleep
                'medium': {'vata': 0.2, 'pitta': 0.6, 'kapha': 0.2},  # Moderate sleep
                'high': {'vata': 0.1, 'pitta': 0.2, 'kapha': 0.7}  # Deep sleep
            },
            'appetite': {
                'low': {'vata': 0.7, 'pitta': 0.2, 'kapha': 0.1},  # Variable
                'medium': {'vata': 0.2, 'pitta': 0.7, 'kapha': 0.1},  # Strong
                'high': {'vata': 0.1, 'pitta': 0.2, 'kapha': 0.7}  # Steady
            },
            'body_temp': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},  # Cold
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Warm
                'high': {'vata': 0.1, 'pitta': 0.2, 'kapha': 0.7}  # Balanced
            },
            'skin': {
                'low': {'vata': 0.8, 'pitta': 0.1, 'kapha': 0.1},  # Dry
                'medium': {'vata': 0.1, 'pitta': 0.8, 'kapha': 0.1},  # Warm
                'high': {'vata': 0.1, 'pitta': 0.1, 'kapha': 0.8}  # Oily
            },
            'stress_response': {
                'low': {'vata': 0.7, 'pitta': 0.2, 'kapha': 0.1},  # Anxious
                'medium': {'vata': 0.2, 'pitta': 0.7, 'kapha': 0.1},  # Angry
                'high': {'vata': 0.1, 'pitta': 0.2, 'kapha': 0.7}  # Calm
            }
        }
        
        total_weight = 0.0
        for answer in answers:
            trait = answer.get('trait', '')
            weight = float(answer.get('weight', 0.5))
            
            if trait in trait_mapping:
                # Map weight to category
                if weight < 0.3:
                    category = 'low'
                elif weight < 0.7:
                    category = 'medium'
                else:
                    category = 'high'
                
                # Get dosha distribution for this trait and weight
                dosha_dist = trait_mapping[trait][category]
                for dosha, score in dosha_dist.items():
                    prakriti_scores[dosha] += score * weight
                total_weight += weight
        
        # Normalize scores
        if total_weight > 0:
            for dosha in prakriti_scores:
                prakriti_scores[dosha] /= total_weight
        else:
            # Default equal distribution
            prakriti_scores = {'vata': 0.33, 'pitta': 0.33, 'kapha': 0.34}
        
        # Calculate percentages
        percent = {
            'vata': round(prakriti_scores['vata'] * 100),
            'pitta': round(prakriti_scores['pitta'] * 100),
            'kapha': round(prakriti_scores['kapha'] * 100)
        }
        
        # Determine dominant dosha
        dominant = max(prakriti_scores.items(), key=lambda x: x[1])[0]
        confidence = prakriti_scores[dominant]
        
        try:
            model, metadata = load_model()
            if model is not None and hasattr(model, 'predict'):
                # Prepare features for ML model
                features = prepare_features_for_ml(answers, metadata)
                
                if features is not None:
                    # Validate features
                    if features.shape[1] != len(metadata.get('features', [])):
                        print(f"⚠️ Feature mismatch: Got {features.shape[1]} features, expected {len(metadata.get('features', []))}")
                        raise ValueError("Feature dimension mismatch")
                    
                    # Get prediction
                    prediction = model.predict(features)
                    print(f"🔍 Raw model prediction: {prediction}")
                    
                    # Validate prediction shape
                    if not isinstance(prediction, (np.ndarray, list)) or len(prediction) == 0:
                        print("⚠️ Invalid prediction format")
                        raise ValueError("Invalid prediction format")
                    
                    # Get prediction probabilities if available
                    if hasattr(model, 'predict_proba'):
                        probabilities = model.predict_proba(features)[0]
                        classes = model.classes_ if hasattr(model, 'classes_') else ['kapha', 'pitta', 'vata']
                        
                        prob_dict = {}
                        for i, cls in enumerate(classes):
                            prob_dict[cls] = float(probabilities[i]) if i < len(probabilities) else 0.0
                        
                        # Map numerical predictions to dosha names
                        dosha_map = {0: 'vata', 1: 'pitta', 2: 'kapha'}
                        predicted_class = dosha_map.get(prediction[0], dominant) if len(prediction) > 0 else dominant
                        
                        # Calculate confidence with validation
                        max_prob = max(probabilities) if len(probabilities) > 0 else 0.75
                        second_highest = sorted(probabilities)[-2] if len(probabilities) > 1 else 0
                        
                        # Adjust confidence based on difference between top predictions
                        confidence = max(0.6, min(0.95, max_prob + (max_prob - second_highest)))
                        
                        # Create probability dictionary with dosha names
                        prob_dict = {
                            'vata': float(probabilities[0]) if len(probabilities) > 0 else 0.33,
                            'pitta': float(probabilities[1]) if len(probabilities) > 1 else 0.33,
                            'kapha': float(probabilities[2]) if len(probabilities) > 2 else 0.34
                        }
                        
                        ml_prediction = {
                            'predicted': predicted_class,
                            'confidence': float(confidence),
                            'probabilities': prob_dict
                        }
                    else:
                        # If no probability method, use traditional calculation
                        ml_prediction = {
                            'predicted': dominant,
                            'confidence': 0.75,
                            'probabilities': prakriti_scores
                        }
                    
                    print(f"✅ ML Prediction: {ml_prediction['predicted']} (confidence: {ml_prediction['confidence']:.2%})")
                    print(f"📊 Debug - Type info: predicted={type(ml_prediction['predicted'])}, confidence={type(ml_prediction['confidence'])}, probabilities={type(ml_prediction['probabilities'])}")
                    if isinstance(ml_prediction['probabilities'], dict):
                        print(f"📊 Probabilities value types: {[(k, type(v)) for k,v in ml_prediction['probabilities'].items()]}")
                    elif isinstance(ml_prediction['probabilities'], (list, np.ndarray)):
                        print(f"📊 Probabilities array type: {type(ml_prediction['probabilities'][0])} (first element)")

        except Exception as ml_error:
            print(f"⚠️ ML prediction failed, using traditional calculation: {ml_error}")
            # Use traditional calculation as fallback
            ml_prediction = {
                'predicted': dominant,
                'confidence': 0.85,  # High confidence for traditional method
                'probabilities': prakriti_scores
            }
        
        # Ensure consistent data structure
        normalized_scores = {
            'vata': round(prakriti_scores['vata'] * 100, 2),
            'pitta': round(prakriti_scores['pitta'] * 100, 2),
            'kapha': round(prakriti_scores['kapha'] * 100, 2),
        }
        
        # Build response and convert numpy types
        result = {
            'prakriti': {
                'vata': float(prakriti_scores['vata']),  # Raw scores (0-1)
                'pitta': float(prakriti_scores['pitta']),
                'kapha': float(prakriti_scores['kapha']),
                'dominant': str(dominant),
                'percent': {  # Percentage scores
                    'vata': float(normalized_scores['vata']),
                    'pitta': float(normalized_scores['pitta']),
                    'kapha': float(normalized_scores['kapha'])
                },
                'ml_prediction': convert_numpy_types(ml_prediction) if ml_prediction else None
            },
            'confidence': float(ml_prediction['confidence']) if ml_prediction else float(confidence),
            'features_used': {
                'total_questions': int(len(answers)),
                'calculation_method': 'hybrid' if ml_prediction else 'traditional'
            }
        }
        
        print(f"📊 Final result - Dominant: {result['prakriti']['dominant']}, Method: {result['features_used']['calculation_method']}")
        return result
        
    except Exception as e:
        print(f"❌ Prediction error: {traceback.format_exc()}")
        # Return a safe default response
        return {
            'prakriti': {
                'vata': 33.33,
                'pitta': 33.33,
                'kapha': 33.34,
                'dominant': 'vata',
                'percent': {
                    'vata': 33,
                    'pitta': 33,
                    'kapha': 34
                },
                'ml_prediction': {
                    'predicted': 'vata',
                    'confidence': 0.5,
                    'probabilities': {
                        'vata': 0.33,
                        'pitta': 0.33,
                        'kapha': 0.34
                    }
                }
            },
            'confidence': 0.5,
            'features_used': {
                'total_questions': len(answers) if answers else 0,
                'calculation_method': 'fallback'
            }
        }

def prepare_features_for_ml(answers: List[Dict], metadata: Dict) -> Optional[np.ndarray]:
    """
    Prepare features for ML model prediction
    This should match the feature engineering used during training
    """
    try:
        if not metadata.get('features'):
            print("⚠️ No feature list in metadata, cannot prepare ML features")
            return None
        
        # Initialize feature dictionary with default values
        feature_dict = {feature: 0.0 for feature in metadata['features']}
        
        # Define trait mappings based on training data
        trait_mapping = {
            'sleep': {
                (0.0, 0.3): "Light and interrupted, difficulty falling asleep",  # Vata
                (0.3, 0.7): "Moderate, around 6-8 hours",  # Pitta
                (0.7, 1.0): "Deep and prolonged, hard to wake up"  # Kapha
            },
            'appetite': {
                (0.0, 0.3): "Variable and irregular",  # Vata
                (0.3, 0.7): "Strong and sharp, get irritable if I miss meals",  # Pitta
                (0.7, 1.0): "Steady but can skip meals easily"  # Kapha
            },
            'body_temp': {
                (0.0, 0.3): "Often feel cold, poor circulation",  # Vata
                (0.3, 0.7): "Usually warm, good circulation",  # Pitta
                (0.7, 1.0): "Adaptable, rarely too hot or cold"  # Kapha
            },
            'skin': {
                (0.0, 0.3): "Dry, rough, and thin",  # Vata
                (0.3, 0.7): "Soft, warm with tendency to redness",  # Pitta
                (0.7, 1.0): "Thick, smooth, and moist"  # Kapha
            },
            'stress_response': {
                (0.0, 0.3): "Become anxious and worried",  # Vata
                (0.3, 0.7): "Become irritated and angry",  # Pitta
                (0.7, 1.0): "Become withdrawn and quiet"  # Kapha
            }
        }
        
        # Process each answer and map to appropriate value ranges
        for answer in answers:
            trait = answer.get('trait', '')
            weight = float(answer.get('weight', 0.5))  # Default to middle range
            
            if trait in trait_mapping:
                feature_name = f'q_{trait}'
                if feature_name in feature_dict:
                    # Find the appropriate category based on weight
                    for (min_val, max_val), description in trait_mapping[trait].items():
                        if min_val <= weight < max_val:
                            # Map the weight to training data categories
                            if weight < 0.3:  # Vata characteristics
                                feature_dict[feature_name] = 0.2
                            elif weight < 0.7:  # Pitta characteristics
                                feature_dict[feature_name] = 0.5
                            else:  # Kapha characteristics
                                feature_dict[feature_name] = 0.8
                            break
        
        # Set default values for unmapped features
        for feature in feature_dict:
            if feature_dict[feature] == 0.0:
                feature_dict[feature] = 0.5  # Default to middle value
        
        # Add aggregate features
        vata_count = sum(1 for a in answers if a.get('trait') == 'vata')
        pitta_count = sum(1 for a in answers if a.get('trait') == 'pitta')
        kapha_count = sum(1 for a in answers if a.get('trait') == 'kapha')
        
        feature_dict['vata_count'] = vata_count
        feature_dict['pitta_count'] = pitta_count
        feature_dict['kapha_count'] = kapha_count
        feature_dict['total_answers'] = len(answers)
        
        # Create feature array matching the expected features
        expected_features = metadata.get('features', [])
        feature_array = []
        
        for feat in expected_features:
            feature_array.append(feature_dict.get(feat, 0))
        
        return np.array([feature_array])
        
    except Exception as e:
        print(f"⚠️ Error preparing ML features: {e}")
        return None