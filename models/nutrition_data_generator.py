import pandas as pd
import random
import uuid
from faker import Faker
import numpy as np
from typing import List, Dict
import json
import os

# Initialize Faker
fake = Faker()

# Ayurvedic data constants
RASA_TYPES = ["Madhura", "Amla", "Lavana", "Katu", "Tikta", "Kashaya"]
VIRYA_TYPES = ["Ushna", "Shita"]
VIPAKA_TYPES = ["Madhura", "Amla", "Katu"]
GUNA_TYPES = ["Laghu", "Guru", "Snigdha", "Ruksha", "Manda", "Teekshna"]
DOSHA_EFFECTS = ["Reduces Vata", "Aggravates Vata", "Balances Vata", 
                 "Reduces Pitta", "Aggravates Pitta", "Balances Pitta",
                 "Reduces Kapha", "Aggravates Kapha", "Balances Kapha"]
SEASONS = ["Winter", "Summer", "Monsoon", "Spring", "Autumn", "All"]
DIGESTION_LEVELS = ["Laghu", "Guru"]
REGIONS = ["North India", "South India", "East India", "West India", "Himalayan", "Coastal", "Pan-India"]
FOOD_GROUPS = ["Grain", "Fruit", "Vegetable", "Dairy", "Legume", "Spice", "Meat", "Fish", "Nut", "Oil", "Sweetener"]
THERAPEUTIC_USES = ["Anemia", "Constipation", "Cooling agent", "Digestive aid", "Energy booster", 
                   "Immunity enhancer", "Joint health", "Liver support", "Respiratory health", 
                   "Skin health", "Stress relief", "Weight management"]
VITAMINS = ["A", "B1", "B2", "B3", "B6", "B12", "C", "D", "E", "K"]
MINERALS = ["Iron", "Calcium", "Magnesium", "Potassium", "Zinc", "Phosphorus", "Sodium", "Copper", "Manganese", "Selenium"]
COMBINATIONS = ["Cumin + Rice", "Milk + Ghee", "Ginger + Honey", "Turmeric + Milk", "Black pepper + Turmeric",
                "Coriander + Coconut", "Fennel + Mint", "Cardamom + Tea", "Cloves + Tea", "Cinnamon + Milk"]

def generate_nutrition_data(num_items: int = 8000) -> pd.DataFrame:
    """
    Generate synthetic nutrition data with Ayurvedic properties
    """
    data = []
    
    # Common Indian foods to seed the dataset
    common_foods = [
        ("Rice", "Shali", "Grain"), ("Wheat", "Godhum", "Grain"), ("Barley", "Yava", "Grain"),
        ("Mung Dal", "Mudga", "Legume"), ("Urad Dal", "Urad", "Legume"), ("Toor Dal", "Arhar", "Legume"),
        ("Milk", "Ksheera", "Dairy"), ("Ghee", "Ghrita", "Dairy"), ("Curd", "Dadhi", "Dairy"),
        ("Almonds", "Badam", "Nut"), ("Walnuts", "Akrot", "Nut"), ("Pistachios", "Pista", "Nut"),
        ("Dates", "Khajoor", "Fruit"), ("Banana", "Kela", "Fruit"), ("Mango", "Aam", "Fruit"),
        ("Spinach", "Palak", "Vegetable"), ("Drumstick", "Moringa", "Vegetable"), ("Bottle Gourd", "Lauki", "Vegetable"),
        ("Turmeric", "Haldi", "Spice"), ("Cumin", "Jeera", "Spice"), ("Coriander", "Dhania", "Spice"),
        ("Ginger", "Adrak", "Spice"), ("Garlic", "Lehsun", "Spice"), ("Black Pepper", "Kali Mirch", "Spice"),
        ("Cardamom", "Elaichi", "Spice"), ("Cinnamon", "Dalchini", "Spice"), ("Cloves", "Laung", "Spice"),
        ("Fennel", "Saunf", "Spice"), ("Asafoetida", "Hing", "Spice"), ("Curry Leaves", "Kadi Patta", "Spice"),
        ("Neem", "Margosa", "Vegetable"), ("Basil", "Tulsi", "Herb"), ("Mint", "Pudina", "Herb"),
        ("Amla", "Indian Gooseberry", "Fruit"), ("Ashwagandha", "Winter Cherry", "Herb"),
        ("Triphala", "Three Fruits", "Herb"), ("Shatavari", "Asparagus", "Herb"),
        ("Brahmi", "Water Hyssop", "Herb"), ("Guggulu", "Commiphora", "Resin"),
        ("Licorice", "Mulethi", "Herb"), ("Fenugreek", "Methi", "Legume"),
        ("Sesame", "Til", "Seed"), ("Flaxseed", "Alsi", "Seed"), ("Pumpkin Seeds", "Kaddu Ke Beej", "Seed"),
        ("Sunflower Seeds", "Surajmukhi Ke Beej", "Seed"), ("Coconut", "Nariyal", "Fruit"),
        ("Watermelon", "Tarbooj", "Fruit"), ("Papaya", "Papita", "Fruit"), ("Pineapple", "Ananas", "Fruit"),
        ("Apple", "Seb", "Fruit"), ("Orange", "Santra", "Fruit"), ("Grapes", "Angoor", "Fruit"),
        ("Pomegranate", "Anaar", "Fruit"), ("Guava", "Amrud", "Fruit"), ("Kiwi", "Kiwifruit", "Fruit"),
        ("Carrot", "Gajar", "Vegetable"), ("Beetroot", "Chukandar", "Vegetable"), ("Radish", "Mooli", "Vegetable"),
        ("Cabbage", "Patta Gobi", "Vegetable"), ("Cauliflower", "Gobi", "Vegetable"), ("Brinjal", "Baingan", "Vegetable"),
        ("Ladyfinger", "Bhindi", "Vegetable"), ("Green Peas", "Matar", "Legume"), ("Corn", "Makka", "Grain"),
        ("Soybean", "Soyabeans", "Legume"), ("Tofu", "Bean Curd", "Legume"), ("Paneer", "Cottage Cheese", "Dairy"),
        ("Butter", "Makkhan", "Dairy"), ("Cheese", "Paneer", "Dairy"), ("Yogurt", "Curd", "Dairy"),
        ("Honey", "Shehad", "Sweetener"), ("Jaggery", "Gur", "Sweetener"), ("Sugar", "Chini", "Sweetener"),
        ("Rock Salt", "Saindhav Namak", "Spice"), ("Black Salt", "Kala Namak", "Spice"), ("Sea Salt", "Samudra Namak", "Spice"),
        ("Mustard Oil", "Sarson Ka Tel", "Oil"), ("Coconut Oil", "Nariyal Ka Tel", "Oil"), 
        ("Ginger Oil", "Adrak Ka Tel", "Oil"), ("Sesame Oil", "Til Ka Tel", "Oil"),
        ("Olive Oil", "Zaitoon Ka Tel", "Oil"), ("Sunflower Oil", "Surajmukhi Ka Tel", "Oil"),
        ("Safflower Oil", "Kusumbh Ka Tel", "Oil"), ("Groundnut Oil", "Mungaphali Ka Tel", "Oil")
    ]
    
    # Add common foods first
    for i, (name_en, name_sanskrit, food_group) in enumerate(common_foods):
        if i >= num_items:
            break
            
        item = generate_food_item(i+1, name_en, name_sanskrit, food_group)
        data.append(item)
    
    # Generate remaining items
    for i in range(len(common_foods), num_items):
        # Randomly select food group
        food_group = random.choice(FOOD_GROUPS)
        
        # Generate appropriate names based on food group
        name_en = generate_english_name(food_group)
        name_sanskrit = generate_sanskrit_name(name_en, food_group)
        
        item = generate_food_item(i+1, name_en, name_sanskrit, food_group)
        data.append(item)
    
    return pd.DataFrame(data)

def generate_english_name(food_group: str) -> str:
    """Generate English name based on food group"""
    prefixes = {
        "Grain": ["Brown ", "White ", "Red ", "Black ", "Golden "],
        "Fruit": ["Sweet ", "Sour ", "Bitter ", "Tropical ", "Wild "],
        "Vegetable": ["Fresh ", "Organic ", "Wild ", "Baby ", "Baby "],
        "Dairy": ["Organic ", "Farm Fresh ", "Creamy ", "Rich "],
        "Legume": ["Split ", "Whole ", "Black ", "Green ", "Red "],
        "Spice": ["Ground ", "Whole ", "Organic ", "Wild ", "Himalayan "],
        "Meat": ["Lean ", "Grass-fed ", "Free-range ", "Wild "],
        "Fish": ["Freshwater ", "Seawater ", "Saltwater ", "Ocean "],
        "Nut": ["Roasted ", "Raw ", "Organic ", "Wild "],
        "Oil": ["Cold-pressed ", "Organic ", "Virgin ", "Extra Virgin "],
        "Sweetener": ["Natural ", "Organic ", "Raw ", "Crystallized "],
        "Herb": ["Fresh ", "Dried ", "Wild ", "Organic "]
    }
    
    suffixes = {
        "Grain": ["Rice", "Wheat", "Barley", "Quinoa", "Millet", "Oats"],
        "Fruit": ["Apple", "Berry", "Fruit", "Melon", "Citrus"],
        "Vegetable": ["Leaf", "Root", "Stem", "Flower", "Fruit"],
        "Dairy": ["Milk", "Cheese", "Butter", "Cream", "Yogurt"],
        "Legume": ["Beans", "Lentils", "Peas", "Chickpeas"],
        "Spice": ["Powder", "Essence", "Extract", "Blend"],
        "Meat": ["Chicken", "Beef", "Lamb", "Pork", "Turkey"],
        "Fish": ["Fish", "Salmon", "Tuna", "Mackerel", "Sardine"],
        "Nut": ["Nuts", "Seeds", "Kernels"],
        "Oil": ["Oil", "Butter", "Ghee"],
        "Sweetener": ["Sugar", "Syrup", "Honey", "Molasses"],
        "Herb": ["Herb", "Leaves", "Extract"]
    }
    
    prefix = random.choice(prefixes.get(food_group, [""]))
    suffix = random.choice(suffixes.get(food_group, ["Food"]))
    
    return f"{prefix}{suffix}".strip()

def generate_sanskrit_name(english_name: str, food_group: str) -> str:
    """Generate Sanskrit/regional name"""
    # Dictionary of common translations
    translations = {
        "Rice": "Shali",
        "Wheat": "Godhum",
        "Barley": "Yava",
        "Milk": "Ksheera",
        "Ghee": "Ghrita",
        "Curd": "Dadhi",
        "Butter": "Makkhan",
        "Honey": "Madhu",
        "Sugar": "Sharkara",
        "Salt": "Lavana",
        "Water": "Jala",
        "Oil": "Taila",
        "Ginger": "Adrak",
        "Garlic": "Lehsun",
        "Turmeric": "Haldi",
        "Cumin": "Jeera",
        "Coriander": "Dhania",
        "Black Pepper": "Marich",
        "Cardamom": "Elaichi",
        "Cinnamon": "Dalchini",
        "Cloves": "Laung",
        "Fennel": "Saunf",
        "Asafoetida": "Hing",
        "Curry Leaves": "Kadi Patta",
        "Mint": "Pudina",
        "Basil": "Tulsi",
        "Neem": "Nimba",
        "Amla": "Amalaki",
        "Ashwagandha": "Winter Cherry",
        "Triphala": "Three Fruits",
        "Shatavari": "Asparagus",
        "Brahmi": "Water Hyssop",
        "Licorice": "Mulethi"
    }
    
    # Try to find direct translation
    for key, value in translations.items():
        if key.lower() in english_name.lower():
            return value
    
    # Generate based on food group
    sanskrit_suffixes = {
        "Grain": ["Dhanya", "Shali", "Godhuma"],
        "Fruit": ["Phala", "Falasava", "Amritaphala"],
        "Vegetable": ["Shaka", "Kanda", "Mula"],
        "Dairy": ["Ksheera", "Dugdha", "Dadhi"],
        "Legume": ["Mudga", "Chanaka", "Masura"],
        "Spice": ["Kalka", "Churna", "Phala"],
        "Meat": ["Mamsa", "Charma", "Asthi"],
        "Fish": ["Matsya", "Shaphari", "Kacchap"],
        "Nut": ["Phala", "Bija", "Kanda"],
        "Oil": ["Taila", "Ghrita", "Sneha"],
        "Sweetener": ["Madhu", "Sharkara", "Guda"],
        "Herb": ["Oshadhi", "Vrksha", "Gulma"]
    }
    
    # Add random suffix
    suffix = random.choice(sanskrit_suffixes.get(food_group, ["Varga", "Prakara", "Vidhi"]))
    
    # Take first word of English name and add Sanskrit suffix
    first_word = english_name.split()[0]
    return f"{first_word} {suffix}"

def generate_food_item(id: int, name_en: str, name_sanskrit: str, food_group: str) -> Dict:
    """Generate a complete food item with all properties"""
    
    # Nutritional values based on food group
    nutrition = generate_nutritional_values(food_group)
    
    # Ayurvedic properties
    rasa = random.sample(RASA_TYPES, k=random.randint(1, 3))  # 1-3 tastes
    virya = random.choice(VIRYA_TYPES)
    vipaka = random.choice(VIPAKA_TYPES)
    guna = random.sample(GUNA_TYPES, k=random.randint(1, 2))  # 1-2 gunas
    dosha_effect = random.sample(DOSHA_EFFECTS, k=random.randint(1, 3))  # 1-3 effects
    seasonal_suitability = random.sample(SEASONS, k=random.randint(1, 2))  # 1-2 seasons
    digestion_level = random.choice(DIGESTION_LEVELS)
    region_common = random.sample(REGIONS, k=random.randint(1, 2))  # 1-2 regions
    contraindications = generate_contraindications(food_group)
    suggested_combinations = random.sample(COMBINATIONS, k=random.randint(1, 3))  # 1-3 combinations
    therapeutic_uses = random.sample(THERAPEUTIC_USES, k=random.randint(1, 3))  # 1-3 uses
    vitamins = random.sample(VITAMINS, k=random.randint(0, 4))  # 0-4 vitamins
    minerals = random.sample(MINERALS, k=random.randint(0, 5))  # 0-5 minerals
    
    return {
        "id": id,
        "name_en": name_en,
        "name_sanskrit": name_sanskrit,
        "food_group": food_group,
        "calories_per_100g": nutrition["calories"],
        "protein_g": nutrition["protein"],
        "carbs_g": nutrition["carbs"],
        "fat_g": nutrition["fat"],
        "fiber_g": nutrition["fiber"],
        "vitamins": ",".join(vitamins) if vitamins else "",
        "minerals": ",".join(minerals) if minerals else "",
        "rasa": ",".join(rasa),
        "virya": virya,
        "vipaka": vipaka,
        "guna": ",".join(guna),
        "dosha_effect": ",".join(dosha_effect),
        "seasonal_suitability": ",".join(seasonal_suitability),
        "digestion_level": digestion_level,
        "region_common": ",".join(region_common),
        "contraindications": ",".join(contraindications) if contraindications else "",
        "suggested_combinations": ",".join(suggested_combinations),
        "therapeutic_uses": ",".join(therapeutic_uses),
        "recommended_portion": generate_recommended_portion(food_group)
    }

def generate_nutritional_values(food_group: str) -> Dict[str, float]:
    """Generate nutritional values based on food group"""
    # Base values by food group
    base_values = {
        "Grain": {"calories": 350, "protein": 8, "carbs": 75, "fat": 2, "fiber": 3},
        "Fruit": {"calories": 60, "protein": 0.5, "carbs": 15, "fat": 0.2, "fiber": 2},
        "Vegetable": {"calories": 25, "protein": 1, "carbs": 5, "fat": 0.1, "fiber": 2.5},
        "Dairy": {"calories": 60, "protein": 3, "carbs": 5, "fat": 3, "fiber": 0},
        "Legume": {"calories": 120, "protein": 9, "carbs": 20, "fat": 1, "fiber": 7},
        "Spice": {"calories": 300, "protein": 12, "carbs": 60, "fat": 5, "fiber": 25},
        "Meat": {"calories": 250, "protein": 25, "carbs": 0, "fat": 15, "fiber": 0},
        "Fish": {"calories": 200, "protein": 22, "carbs": 0, "fat": 12, "fiber": 0},
        "Nut": {"calories": 600, "protein": 20, "carbs": 20, "fat": 50, "fiber": 10},
        "Oil": {"calories": 900, "protein": 0, "carbs": 0, "fat": 100, "fiber": 0},
        "Sweetener": {"calories": 400, "protein": 0, "carbs": 100, "fat": 0, "fiber": 0},
        "Herb": {"calories": 25, "protein": 3, "carbs": 5, "fat": 0.5, "fiber": 3}
    }
    
    base = base_values.get(food_group, {"calories": 100, "protein": 2, "carbs": 20, "fat": 1, "fiber": 1})
    
    # Add some randomness
    return {
        "calories": max(0, base["calories"] + random.uniform(-50, 50)),
        "protein": max(0, base["protein"] + random.uniform(-1, 2)),
        "carbs": max(0, base["carbs"] + random.uniform(-10, 10)),
        "fat": max(0, base["fat"] + random.uniform(-1, 5)),
        "fiber": max(0, base["fiber"] + random.uniform(-0.5, 2))
    }

def generate_contraindications(food_group: str) -> List[str]:
    """Generate contraindications based on food group"""
    all_contraindications = [
        "Pregnancy", "Lactation", "Diabetes", "Hypertension", "Acidity", 
        "Ulcer", "Kidney disease", "Liver disease", "Heart disease", 
        "Allergy", "Obesity", "Underweight", "Fever", "Infection",
        "Autoimmune condition", "Thyroid disorder", "High cholesterol"
    ]
    
    # Some food groups have specific contraindications
    specific_contraindications = {
        "Spice": ["Acidity", "Ulcer", "Pitta imbalance"],
        "Oil": ["Obesity", "High cholesterol", "Kapha imbalance"],
        "Sweetener": ["Diabetes", "Obesity", "Kapha imbalance"],
        "Meat": ["Heart disease", "High cholesterol"],
        "Dairy": ["Lactose intolerance", "Kapha imbalance"],
        "Legume": ["Gas", "Bloating", "Vata imbalance"]
    }
    
    # Base contraindications
    contraindications = []
    
    # Add specific contraindications
    if food_group in specific_contraindications:
        contraindications.extend(specific_contraindications[food_group])
    
    # Add random contraindications
    if random.random() < 0.3:  # 30% chance of having additional contraindications
        additional = random.sample(all_contraindications, k=random.randint(1, 3))
        contraindications.extend(additional)
    
    return list(set(contraindications))  # Remove duplicates

def generate_recommended_portion(food_group: str) -> str:
    """Generate recommended portion based on food group"""
    portions = {
        "Grain": ["100g", "1 bowl", "1 cup cooked"],
        "Fruit": ["100g", "1 medium", "1 cup sliced"],
        "Vegetable": ["100g", "1 cup", "1 bowl"],
        "Dairy": ["100ml", "1 glass", "1 cup", "2 tbsp"],
        "Legume": ["50g", "1/2 cup cooked", "1 bowl"],
        "Spice": ["1g", "1 tsp", "pinch"],
        "Meat": ["100g", "1 piece", "1 fillet"],
        "Fish": ["100g", "1 fillet", "1 piece"],
        "Nut": ["30g", "1/4 cup", "handful"],
        "Oil": ["5ml", "1 tsp", "1 tbsp"],
        "Sweetener": ["5g", "1 tsp", "1 cube"],
        "Herb": ["1g", "1 tsp", "few leaves"]
    }
    
    return random.choice(portions.get(food_group, ["50g", "1 serving"]))

def save_dataset(df: pd.DataFrame, file_path: str):
    """Save dataset to CSV file"""
    df.to_csv(file_path, index=False)
    print(f"Dataset saved to {file_path}")
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")

def main():
    """Main function to generate and save the nutrition dataset"""
    print("Generating nutrition dataset with 8000+ food items...")
    
    # Generate dataset
    df = generate_nutrition_data(8000)
    
    # Save to CSV
    output_file = os.path.join(os.path.dirname(__file__), "nutrition_dataset.csv")
    save_dataset(df, output_file)
    
    # Display sample
    print("\nSample of generated data:")
    print(df.head())
    
    # Display some statistics
    print(f"\nFood group distribution:")
    print(df['food_group'].value_counts().head(10))
    
    print(f"\nDataset generation completed successfully!")

if __name__ == "__main__":
    main()