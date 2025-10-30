import json
from inference_new import predict_from_answers

def test_primary_vata():
    answers = [
        {"trait": "vata", "weight": 0.8},
        {"trait": "pitta", "weight": 0.1},
        {"trait": "kapha", "weight": 0.1}
    ]
    result = predict_from_answers(answers)
    assert result["primary"] == "vata"

def test_primary_pitta():
    answers = [
        {"trait": "vata", "weight": 0.2},
        {"trait": "pitta", "weight": 0.6},
        {"trait": "kapha", "weight": 0.2}
    ]
    result = predict_from_answers(answers)
    assert result["primary"] == "pitta"

def test_primary_kapha():
    answers = [
        {"trait": "vata", "weight": 0.1},
        {"trait": "pitta", "weight": 0.2},
        {"trait": "kapha", "weight": 0.7}
    ]
    result = predict_from_answers(answers)
    assert result["primary"] == "kapha"

def test_dual_types():
    answers = [
        {"trait": "vata", "weight": 0.4},
        {"trait": "pitta", "weight": 0.4},
        {"trait": "kapha", "weight": 0.2}
    ]
    result = predict_from_answers(answers)
    assert "vata" in result["prakriti_type"]
    assert "pitta" in result["prakriti_type"]
    assert len(result["prakriti_type"].split("-")) == 2

def test_balanced_type():
    answers = [
        {"trait": "vata", "weight": 0.33},
        {"trait": "pitta", "weight": 0.33},
        {"trait": "kapha", "weight": 0.34}
    ]
    result = predict_from_answers(answers)
    assert result["prakriti_type"] == "tridoshic"