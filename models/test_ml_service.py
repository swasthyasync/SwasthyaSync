# test_ml_service.py
# First install requests: pip install requests
import json

def test_ml_service():
    try:
        import requests
    except ImportError:
        print("Please install requests: pip install requests")
        return
    
    print("Testing ML Service...")
    
    # Test data - sample questionnaire answers
    test_answers = [
        {"questionId": "q1", "value": "Thin, light, and narrow", "trait": "vata", "weight": 1},
        {"questionId": "q2", "value": "Dry, rough, and thin", "trait": "vata", "weight": 1},
        {"questionId": "q3", "value": "Dry, thin, black", "trait": "vata", "weight": 1},
        {"questionId": "q4", "value": "Irregular, variable", "trait": "vata", "weight": 1},
        {"questionId": "q7", "value": "Light, interrupted", "trait": "vata", "weight": 1},
        {"questionId": "q9", "value": "Hands and feet are often cold", "trait": "vata", "weight": 1},
        {"questionId": "q11", "value": "Enthusiastic, lively, imaginative", "trait": "vata", "weight": 1},
        {"questionId": "q12", "value": "Become anxious and worried", "trait": "vata", "weight": 1},
    ]
    
    # Test health endpoint
    try:
        health_response = requests.get("http://localhost:8000/health")
        print(f"Health Check: {health_response.status_code}")
        print(f"Health Response: {health_response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
        return
    
    # Test prediction endpoint
    try:
        prediction_data = {"answers": test_answers}
        prediction_response = requests.post(
            "http://localhost:8000/predict",
            json=prediction_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"\nPrediction Status: {prediction_response.status_code}")
        if prediction_response.status_code == 200:
            result = prediction_response.json()
            print(f"Prediction Result:")
            print(json.dumps(result, indent=2))
        else:
            print(f"Prediction Error: {prediction_response.text}")
    except Exception as e:
        print(f"Prediction test failed: {e}")

if __name__ == "__main__":
    test_ml_service()