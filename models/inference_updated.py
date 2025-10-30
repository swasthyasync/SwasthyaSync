# models/inference.py
import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
import traceback

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

def load_model() -> Tuple[Any, Dict[str, Any]]:
    """Load the ML model and metadata"""
    global _model, _metadata
    try:
        if _model is None or _metadata is None:
            model_dir = os.path.join(os.path.dirname(__file__), "models_out")
            model_path = os.path.join(model_dir, "prakriti_model.joblib")
            meta_path = os.path.join(model_dir, "prakriti_meta.json")
            
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            _model = joblib.load(model_path)
            
            if os.path.exists(meta_path):
                with open(meta_path, 'r') as f:
                    _metadata = json.load(f)
            else:
                _metadata = {}
        
        return _model, _metadata
    except Exception as e:
        print(f"Error loading model: {e}")
        raise

def predict_from_answers(answers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Predict Prakriti from questionnaire answers using ML model and traditional scoring
    """
    try:
        print(f"📊 Processing prediction request with {len(answers)} answers")
        
        # Initialize prakriti scores
        prakriti_scores = {
            'vata': 0.33,
            'pitta': 0.33,
            'kapha': 0.34
        }
        
        # Load the model and metadata
        model, metadata = load_model()
        model_features = metadata.get('features', [])
        
        # Calculate traditional scores
        total_weight = 0.0
        for answer in answers:
            trait = answer.get('trait', '').lower()
            weight = float(answer.get('weight', 0.5))
            
            if trait in ['vata', 'pitta', 'kapha']:
                prakriti_scores[trait] += weight
                total_weight += weight
        
        # Normalize scores if we have weights
        if total_weight > 0:
            for dosha in prakriti_scores:
                prakriti_scores[dosha] /= total_weight
        
        # Determine dominant dosha
        dominant = max(prakriti_scores.items(), key=lambda x: x[1])[0]
        confidence = prakriti_scores[dominant]
        
        # Try ML prediction if model is available
        try:
            if model is not None and answers:
                # Convert answers to feature vector
                feature_vector = {}
                
                for answer in answers:
                    feature_name = answer.get('trait', '').lower()
                    if feature_name in model_features:
                        feature_vector[feature_name] = float(answer.get('weight', 0.5))
                
                if feature_vector:
                    # Create feature array
                    X = np.array([[
                        feature_vector.get(feature, 0.0) 
                        for feature in model_features
                    ]])
                    
                    # Get prediction and probabilities
                    predicted_class = model.predict(X)[0]
                    
                    # Get probabilities if model supports it
                    if hasattr(model, 'predict_proba'):
                        probabilities = model.predict_proba(X)[0]
                        confidence = max(probabilities)
                        
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
                'percent': normalized_scores,
                'ml_prediction': ml_prediction if 'ml_prediction' in locals() else None
            },
            'confidence': float(confidence),
            'features_used': {
                'total_questions': len(answers),
                'calculation_method': 'hybrid' if 'ml_prediction' in locals() else 'traditional'
            }
        }
        
        return convert_numpy_types(result)
        
    except Exception as e:
        print(f"Error in prediction: {traceback.format_exc()}")
        # Return a safe default response
        return {
            'prakriti': {
                'vata': 0.33,
                'pitta': 0.33,
                'kapha': 0.34,
                'dominant': 'vata',
                'percent': {
                    'vata': 33,
                    'pitta': 33,
                    'kapha': 34
                },
                'ml_prediction': None
            },
            'confidence': 0.5,
            'features_used': {
                'total_questions': len(answers) if answers else 0,
                'calculation_method': 'fallback'
            }
        }