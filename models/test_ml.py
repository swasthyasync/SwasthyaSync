import requests
import json

# Test the ML service
url = "http://127.0.0.1:8000/predict"
data = {
    "answers": [
        {"trait": "vata", "weight": 1},
        {"trait": "pitta", "weight": 0.5},
        {"trait": "kapha", "weight": 0.3}
    ]
}

try:
    response = requests.post(url, json=data)
    print("Status Code:", response.status_code)
    print("Response:", json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", str(e)) 