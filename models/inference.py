# models/inference.py
import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Any, Dict, List
from dotenv import load_dotenv

load_dotenv()

MODEL_DIR = os.getenv("MODEL_DIR", "./models_out")
PRAKRITI_MODEL_PATH = os.path.join(MODEL_DIR, "prakriti_model.joblib")
FEATURE_COLUMNS_PATH = os.path.join(MODEL_DIR, "feature_columns.json")

_model = None
_metadata = None

def load_model():
    global _model, _metadata
    if _model is not None:
        return _model, _metadata
    
    if not os.path.exists(PRAKRITI_MODEL_PATH):
        raise FileNotFoundError(f"Model not found at {PRAKRITI_MODEL_PATH}")
    
    if not os.path.exists(FEATURE_COLUMNS_PATH):
        raise FileNotFoundError(f"Metadata not found at {FEATURE_COLUMNS_PATH}")
    
    _model = joblib.load(PRAKRITI_MODEL_PATH)
    
    with open(FEATURE_COLUMNS_PATH, "r") as f:
        _metadata = json.load(f)
    
    return _model, _metadata

def map_questionnaire_to_features(answers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Map questionnaire answers to model features"""
    model, metadata = load_model()
    question_mapping = metadata.get("question_mapping", {})
    
    # Default feature values
    features = {
        "age": 30,
        "gender": "other",
        "q_physique": "Moderate, muscular frame",
        "q_skin": "Thick, oily, cool",
        "q_hair": "Thick, oily, lustrous",
        "q_appetite": "Slow but steady", 
        "q_thirst": "Scanty",
        "q_sleep": "Heavy, prolonged",
        "q_body_temp": "Adaptable, but dislike cold, damp weather",
        "q_temperament": "Calm, steady, loving",
        "q_stress_response": "Withdraw and become quiet"
    }
    
    # Process answers
    for answer in answers:
        question_id = str(answer.get("questionId", ""))
        option_text = answer.get("value", "")
        
        # Map questionnaire option text to feature values
        if question_id == "q1":  # Body frame
            if "thin" in option_text.lower() or "light" in option_text.lower():
                features["q_physique"] = "Lean, thin frame"
            elif "medium" in option_text.lower():
                features["q_physique"] = "Moderate, muscular frame"  
            elif "large" in option_text.lower() or "broad" in option_text.lower():
                features["q_physique"] = "Broad, heavy frame"
                
        elif question_id == "q2":  # Skin
            if "dry" in option_text.lower():
                features["q_skin"] = "Dry, rough, thin"
            elif "soft" in option_text.lower() or "warm" in option_text.lower():
                features["q_skin"] = "Sensitive, oily, warm"
            elif "thick" in option_text.lower():
                features["q_skin"] = "Thick, oily, cool"
                
        elif question_id == "q3":  # Hair
            if "dry" in option_text.lower() or "brittle" in option_text.lower():
                features["q_hair"] = "Dry, thin, black"
            elif "fine" in option_text.lower() or "soft" in option_text.lower():
                features["q_hair"] = "Fine, soft, premature graying"
            elif "thick" in option_text.lower() or "lustrous" in option_text.lower():
                features["q_hair"] = "Thick, oily, lustrous"
                
        elif question_id in ["q4", "q5", "q6", "q18"]:  # Appetite/Digestion
            if "variable" in option_text.lower() or "irregular" in option_text.lower():
                features["q_appetite"] = "Irregular, variable"
            elif "strong" in option_text.lower() or "sharp" in option_text.lower():
                features["q_appetite"] = "Strong, sharp, unbearable"
            elif "steady" in option_text.lower() or "slow" in option_text.lower():
                features["q_appetite"] = "Slow but steady"
                
        elif question_id in ["q7", "q8"]:  # Sleep
            if "light" in option_text.lower() or "interrupted" in option_text.lower():
                features["q_sleep"] = "Light, interrupted"
            elif "moderate" in option_text.lower():
                features["q_sleep"] = "Sound, moderate duration"
            elif "deep" in option_text.lower() or "prolonged" in option_text.lower():
                features["q_sleep"] = "Heavy, prolonged"
                
        elif question_id in ["q9", "q10"]:  # Temperature
            if "cold" in option_text.lower():
                features["q_body_temp"] = "Hands and feet are often cold"
            elif "warm" in option_text.lower():
                features["q_body_temp"] = "Feel warm, prefer cool environments"
            elif "adaptable" in option_text.lower():
                features["q_body_temp"] = "Adaptable, but dislike cold, damp weather"
                
        elif question_id in ["q11", "q13", "q14", "q15", "q16", "q17"]:  # Temperament
            if "active" in option_text.lower() or "quick" in option_text.lower() or "creative" in option_text.lower():
                features["q_temperament"] = "Enthusiastic, lively, imaginative"
            elif "sharp" in option_text.lower() or "focused" in option_text.lower():
                features["q_temperament"] = "Intelligent, sharp, goal-oriented"
            elif "calm" in option_text.lower() or "steady" in option_text.lower():
                features["q_temperament"] = "Calm, steady, loving"
                
        elif question_id == "q12":  # Stress response
            if "anxious" in option_text.lower() or "worried" in option_text.lower():
                features["q_stress_response"] = "Become anxious and worried"
            elif "irritated" in option_text.lower() or "angry" in option_text.lower():
                features["q_stress_response"] = "Become irritable and angry"
            elif "withdrawn" in option_text.lower() or "quiet" in option_text.lower():
                features["q_stress_response"] = "Withdraw and become quiet"
    
    return features

def predict_from_answers(answers_payload: Any) -> Dict[str, Any]:
    """Predict prakriti with confidence scores"""
    try:
        model, metadata = load_model()
        
        # Normalize answers
        if isinstance(answers_payload, dict):
            if "answers" in answers_payload:
                answers = answers_payload["answers"]
            else:
                answers = list(answers_payload.values()) if answers_payload else []
        else:
            answers = answers_payload if isinstance(answers_payload, list) else []
        
        # Map to features
        features = map_questionnaire_to_features(answers)
        
        # Create DataFrame
        feature_df = pd.DataFrame([features])
        
        # Predict
        prediction = model.predict(feature_df)[0]
        probabilities = model.predict_proba(feature_df)[0]
        classes = model.classes_
        
        # Create probability mapping
        prob_dict = {cls: float(prob) for cls, prob in zip(classes, probabilities)}
        confidence = float(max(probabilities))
        
        # Convert to percentages for frontend
        percent_dict = {cls: round(prob * 100) for cls, prob in prob_dict.items()}
        
        return {
            "prakriti": {
                "predicted": prediction,
                "probabilities": prob_dict,
                "percentages": percent_dict,
                "confidence": confidence
            },
            "confidence": confidence,
            "features_used": features
        }
        
    except Exception as e:
        print(f"Prediction error: {e}")
        # Fallback
        return {
            "prakriti": {
                "predicted": "kapha",
                "probabilities": {"vata": 0.33, "pitta": 0.33, "kapha": 0.34},
                "percentages": {"vata": 33, "pitta": 33, "kapha": 34},
                "confidence": 0.34
            },
            "confidence": 0.34,
            "features_used": {}
        }