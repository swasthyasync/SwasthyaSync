import pandas as pd

def verify_nutrition_data():
    """Verify the structure and content of the generated nutrition dataset"""
    
    # Load the dataset
    df = pd.read_csv("nutrition_dataset.csv")
    
    print("=== NUTRITION DATASET VERIFICATION ===")
    print(f"Dataset shape: {df.shape}")
    print(f"Number of rows: {len(df)}")
    print(f"Number of columns: {len(df.columns)}")
    
    print("\n=== COLUMN NAMES ===")
    for i, col in enumerate(df.columns, 1):
        print(f"{i:2d}. {col}")
    
    print("\n=== DATA TYPES ===")
    print(df.dtypes)
    
    print("\n=== SAMPLE DATA ===")
    print(df.head())
    
    print("\n=== FOOD GROUP DISTRIBUTION ===")
    print(df['food_group'].value_counts().head(10))
    
    print("\n=== STATISTICAL SUMMARY ===")
    # Show summary statistics for numerical columns
    numeric_columns = ['calories_per_100g', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g']
    print(df[numeric_columns].describe())
    
    print("\n=== AYURVEDIC PROPERTIES SAMPLE ===")
    ayurvedic_columns = ['rasa', 'virya', 'vipaka', 'guna', 'dosha_effect']
    print(df[['name_en'] + ayurvedic_columns].head(10))
    
    print("\n=== UNIQUE VALUES IN CATEGORICAL COLUMNS ===")
    print(f"Unique food groups: {df['food_group'].nunique()}")
    print(f"Unique rasa types: {df['rasa'].nunique()}")
    print(f"Unique virya types: {df['virya'].nunique()}")
    print(f"Unique vipaka types: {df['vipaka'].nunique()}")
    
    # Check for any missing values
    print("\n=== MISSING VALUES ===")
    missing = df.isnull().sum()
    if missing.sum() == 0:
        print("No missing values found!")
    else:
        print(missing[missing > 0])

if __name__ == "__main__":
    verify_nutrition_data()