# models/train_csv.py
import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report
import lightgbm as lgb
from dotenv import load_dotenv

load_dotenv()

MODEL_DIR = os.getenv("MODEL_DIR", "./models_out")
os.makedirs(MODEL_DIR, exist_ok=True)

# Mapping your questionnaire IDs to CSV features
QUESTION_MAPPING = {
    'q1': 'q_physique',
    'q2': 'q_skin', 
    'q3': 'q_hair',
    'q4': 'q_appetite',
    'q5': 'q_appetite',  # digestion -> appetite
    'q6': 'q_appetite',  # food preference -> appetite  
    'q7': 'q_sleep',
    'q8': 'q_sleep',
    'q9': 'q_body_temp',
    'q10': 'q_body_temp',
    'q11': 'q_temperament',
    'q12': 'q_stress_response',
    'q13': 'q_temperament',
    'q14': 'q_temperament',
    'q15': 'q_temperament',
    'q16': 'q_temperament',
    'q17': 'q_temperament',
    'q18': 'q_appetite',  # bowel -> appetite
    'q19': 'q_physique',  # weight -> physique
    'q20': 'q_skin'       # perspiration -> skin
}

def load_and_prepare_data():
    """
    Load your CSV data (robust):
      - cleans outer-quote-wrapped files
      - strips stray quotes from column names
      - prints detected columns
      - auto-detects target column from common names
      - if missing, tries to derive target from vata/pitta/kapha score or percent columns
      - drops rows with missing target values (and warns)
    """
    csv_path = 'prakriti_training_dataset.csv'

    # Read raw and perform light cleaning if file is outer-quoted
    with open(csv_path, 'r', encoding='utf-8', errors='replace') as fh:
        raw = fh.read()

    cleaned = None
    # heuristic: if file starts with a double quote and ends with a double quote -> strip outer quotes
    if raw.startswith('"') and raw.rstrip().endswith('"'):
        inner = raw[1:-1]
        inner = inner.replace('""', '"')
        cleaned = inner
    else:
        # also handle case where each line might be wrapped with quotes (line-by-line)
        lines = raw.splitlines()
        if lines and len(lines) >= 1 and all(l.startswith('"') and l.endswith('"') for l in lines[:min(10, len(lines))]):
            new_lines = []
            for l in lines:
                if l.startswith('"') and l.endswith('"'):
                    l = l[1:-1]
                l = l.replace('""', '"')
                new_lines.append(l)
            cleaned = "\n".join(new_lines)

    from io import StringIO
    if cleaned is not None:
        df = pd.read_csv(StringIO(cleaned))
    else:
        df = pd.read_csv(csv_path)

    # Clean column names: strip whitespace, stray quotes, BOMs
    def clean_col(c):
        if not isinstance(c, str):
            return c
        c2 = c.strip()
        # remove leading/trailing single/double quotes accidentally present
        if (c2.startswith('"') and c2.endswith('"')) or (c2.startswith("'") and c2.endswith("'")):
            c2 = c2[1:-1]
        # strip any remaining quotes or odd characters
        c2 = c2.strip().strip('"').strip("'").strip()
        # remove BOM if any
        return c2.lstrip('\ufeff')
    df.columns = [clean_col(c) for c in df.columns]

    # Print columns to help debugging (this will appear in your console)
    print("CSV columns detected:", list(df.columns))

    # Expected feature columns - keep in sync with pipeline
    feature_cols = ['age', 'gender', 'q_physique', 'q_skin', 'q_hair',
                   'q_appetite', 'q_thirst', 'q_sleep', 'q_body_temp',
                   'q_temperament', 'q_stress_response']

    # Attempt to detect target column among common names
    possible_targets = ['prakriti_label', 'prakriti', 'label', 'target', 'prakriti_type', 'prakriti_label_raw']
    found_target = None
    for t in possible_targets:
        if t in df.columns:
            found_target = t
            print(f"Detected target column: '{found_target}' (using it as y)")
            break

    # fallback: check columns that include 'prakriti' or 'label'
    if found_target is None:
        for col in df.columns:
            col_low = str(col).lower()
            if 'prakriti' in col_low or (('label' in col_low) and not any(f in col_low for f in ['question', 'option'])):
                found_target = col
                print(f"Inferred target column by substring match: '{found_target}'")
                break

    # If still none, try to derive from vata/pitta/kapha columns (common patterns)
    if found_target is None:
        # forms to search for v/p/k
        vpk_patterns = [
            ('vata','pitta','kapha'),
            ('percent_vata','percent_pitta','percent_kapha'),
            ('vata_pct','pitta_pct','kapha_pct'),
            ('vata_percent','pitta_percent','kapha_percent')
        ]
        detected = None
        for patt in vpk_patterns:
            if all(any(col.lower() == p for col in df.columns) for p in patt):
                detected = patt
                break
            # also accept columns that contain the token
            if all(any(p in col.lower() for col in df.columns) for p in patt):
                detected = patt
                break

        if detected:
            print(f"Found V/P/K columns pattern: {detected} — will derive prakriti_label by argmax.")
            # create derived label
            def derive_label(row):
                vals = []
                for key in detected:
                    matched = next((c for c in df.columns if key in c.lower()), None)
                    if matched is None:
                        matched = next((c for c in df.columns if c.lower().startswith(key)), None)
                    if matched is None:
                        vals.append(0.0)
                        continue
                    v = row[matched]
                    try:
                        vnum = float(str(v).replace('%','').strip())
                    except Exception:
                        vnum = 0.0
                    vals.append(vnum)
                idx = int(np.argmax(vals))
                return ['vata','pitta','kapha'][idx]
            df['prakriti_label'] = df.apply(derive_label, axis=1)
            found_target = 'prakriti_label'
            print("Derived 'prakriti_label' from V/P/K columns.")
        else:
            # also try to detect raw numeric score columns named exactly 'vata','pitta','kapha'
            if all(any(col.lower() == k for col in df.columns) for k in ['vata','pitta','kapha']):
                print("Found raw score columns 'vata','pitta','kapha' — deriving target label.")
                def derive_label_raw(row):
                    vals = [float(row[next(c for c in df.columns if c.lower() == 'vata')]),
                            float(row[next(c for c in df.columns if c.lower() == 'pitta')]),
                            float(row[next(c for c in df.columns if c.lower() == 'kapha')])]
                    return ['vata','pitta','kapha'][int(np.argmax(vals))]
                df['prakriti_label'] = df.apply(derive_label_raw, axis=1)
                found_target = 'prakriti_label'

    # If still missing, raise helpful error
    if found_target is None:
        raise KeyError(
            "Target column 'prakriti_label' not found and could not be derived automatically.\n"
            f"CSV columns: {list(df.columns)}\n\n"
            "Possible fixes:\n"
            "  1) Rename your existing target column to 'prakriti_label' (values should be 'vata'/'pitta'/'kapha').\n"
            "  2) If you have vata/pitta/kapha percent or score columns (e.g. 'vata','pitta','kapha' or 'percent_vata'),\n"
            "     the loader will auto-derive labels — ensure those columns exist.\n"
            "  3) If your target is stored under a different name, edit the script or create a 'prakriti_label' column in the CSV.\n"
        )

    # Normalize target column name if it contains stray quotes or whitespace
    if found_target and found_target != 'prakriti_label':
        # if the chosen found_target is actually equivalent to prakriti_label with stray characters, normalize
        if found_target.strip().strip('"').strip("'").lower() == 'prakriti_label':
            df = df.rename(columns={found_target: 'prakriti_label'})
            found_target = 'prakriti_label'
            print("Normalized target column name to 'prakriti_label'")

    # Verify feature columns exist and warn if missing
    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        print(f"Warning: the following expected feature columns are missing from CSV: {missing}")
        print("You can either add them, or adapt `feature_cols` in train_csv.py to match your CSV.")
        # we still continue, but select only the intersection
    available_feats = [c for c in feature_cols if c in df.columns]
    if len(available_feats) == 0:
        raise KeyError(
            "No feature columns from the expected list were found in CSV.\n"
            f"Expected (example): {feature_cols}\n"
            f"Found columns: {list(df.columns)}\n"
            "Please map your CSV columns to the features used by the pipeline."
        )

    X = df[available_feats]
    y = df[found_target]

    # Drop rows where target is missing (NaN) — stratify requires no NaNs
    nan_count = int(y.isna().sum())
    if nan_count > 0:
        print(f"Warning: {nan_count} rows have missing target '{found_target}' and will be dropped before training.")
        mask = ~y.isna()
        X = X.loc[mask].reset_index(drop=True)
        y = y.loc[mask].reset_index(drop=True)

    return X, y, available_feats


def train_model():
    X, y, feature_cols = load_and_prepare_data()
    
    # Identify categorical features
    categorical_features = X.select_dtypes(include=['object']).columns.tolist()
    
    # Preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ],
        remainder='passthrough'
    )
    
    # Model pipeline
    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', lgb.LGBMClassifier(objective='multiclass', random_state=42))
    ])
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train
    print("Training model...")
    pipeline.fit(X_train, y_train)
    
    # Evaluate
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    
    print(f"Model Accuracy: {accuracy:.4f}")
    
    # Save model
    model_path = os.path.join(MODEL_DIR, "prakriti_model.joblib")
    joblib.dump(pipeline, model_path)
    
    # Save metadata
    metadata = {
        "features": feature_cols,
        "categorical_features": categorical_features,
        "question_mapping": QUESTION_MAPPING,
        "model_type": "prakriti_lgbm"
    }
    
    with open(os.path.join(MODEL_DIR, "feature_columns.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    
    # Save training report
    training_report = {
        "accuracy": accuracy,
        "classification_report": report,
        "n_samples": len(X),
        "n_features": len(feature_cols)
    }
    
    with open(os.path.join(MODEL_DIR, "training_report.json"), "w") as f:
        json.dump(training_report, f, indent=2)
    
    print(f"Model saved to {model_path}")
    return pipeline, metadata

if __name__ == "__main__":
    train_model()