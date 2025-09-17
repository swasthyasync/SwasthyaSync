# make_synthetic_prakriti_csv.py
import pandas as pd
import random

n = 500
genders = ['male','female','other']
physiques = ['Lean, thin frame', 'Moderate, muscular frame', 'Broad, heavy frame']
skins = ['Dry, rough, thin', 'Sensitive, oily, warm', 'Thick, oily, cool']
hair = ['Dry, thin, black', 'Fine, soft, premature graying', 'Thick, oily, lustrous']
appetite = ['Irregular, variable','Strong, sharp, unbearable','Slow but steady']
thirst = ['Scanty', 'Moderate', 'High']
sleep = ['Light, interrupted','Sound, moderate duration','Heavy, prolonged']
body_temp = ['Hands and feet are often cold','Feel warm, prefer cool environments','Adaptable, but dislike cold, damp weather']
temperament = ['Enthusiastic, lively, imaginative','Intelligent, sharp, goal-oriented','Calm, steady, loving']
stress_response = ['Become anxious and worried','Become irritable and angry','Withdraw and become quiet']

rows = []
for i in range(n):
    row = {
        'user_id': f'user_{i}',
        'first_name': f'First{i}',
        'last_name': f'Last{i}',
        'age': random.randint(18,70),
        'gender': random.choice(genders),
        'q_physique': random.choice(physiques),
        'q_skin': random.choice(skins),
        'q_hair': random.choice(hair),
        'q_appetite': random.choice(appetite),
        'q_thirst': random.choice(thirst),
        'q_sleep': random.choice(sleep),
        'q_body_temp': random.choice(body_temp),
        'q_temperament': random.choice(temperament),
        'q_stress_response': random.choice(stress_response),
    }
    # heuristic mapping to a label by sampling weighted random
    weights = {
        'vata': random.random(),
        'pitta': random.random(),
        'kapha': random.random()
    }
    row['prakriti_label'] = max(weights, key=weights.get)
    rows.append(row)

df = pd.DataFrame(rows)
df.to_csv('prakriti_training_dataset_synthetic.csv', index=False)
print("Saved synthetic CSV (n=%d)" % n)
