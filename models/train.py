# models/train.py
"""
Train script for prakriti + mental health models.

Usage:
  python train.py [--csv <path>] [--limit N] [--model-dir ./models_out]
  python train.py --supabase-key <key> --supabase-url <url>  # override env

Env:
  SUPABASE_URL
  SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

Notes:
  - Use SERVICE ROLE KEY for server-side scripts (recommended).
  - If Supabase fetch fails, use --csv <file> to train from local CSV.
"""
import os
import sys
import json
import argparse
import traceback
from typing import Any, Dict, List, Tuple, Optional

# defensive imports (clear instruction if dependencies missing)
try:
    import joblib
    import numpy as np
    import pandas as pd
    from xgboost import XGBClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import classification_report
except Exception:
    print("Missing Python packages. Run: pip install -r requirements.txt")
    raise

# optional supabase + dotenv
try:
    from supabase import create_client, Client
except Exception:
    create_client = None
    Client = None

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

def mask_key(k: Optional[str]) -> str:
    if not k:
        return "<missing>"
    k = str(k)
    return (k[:6] + "..." + k[-4:]) if len(k) > 14 else k

# -----------------------
# normalize answers helpers
# -----------------------
def normalize_answers_row(a: Any) -> List[Dict[str, Any]]:
    if a is None:
        return []
    if isinstance(a, list):
        out = []
        for it in a:
            if not isinstance(it, dict):
                continue
            qid = it.get("questionId") or it.get("id") or it.get("question") or None
            val = it.get("value") if "value" in it else it.get("answer") if "answer" in it else None
            if val is None:
                val = it.get("optionId") or it.get("weight") or None
            if qid is None:
                continue
            out.append({"questionId": str(qid), "value": val})
        return out
    if isinstance(a, dict):
        out = []
        for k, v in a.items():
            if isinstance(v, dict):
                qid = v.get("questionId") or v.get("id") or k
                val = v.get("value") if "value" in v else v.get("answer") if "answer" in v else v.get("optionId") if "optionId" in v else v.get("weight")
                out.append({"questionId": str(qid), "value": val})
            else:
                out.append({"questionId": str(k), "value": v})
        return out
    return []

# -----------------------
# build dataframe
# -----------------------
def build_dataframe(rows: List[Dict[str, Any]]) -> Tuple[pd.DataFrame, Optional[pd.Series], Optional[pd.Series], Dict[str, Any]]:
    question_set = set()
    for r in rows:
        normalized = normalize_answers_row(r.get("answers"))
        for it in normalized:
            question_set.add(it["questionId"])
        # also recognize q_* columns
        for k in r.keys():
            if isinstance(k, str) and (k.startswith("q_") or k.startswith("question_") or k.startswith("q")):
                question_set.add(k)

    features = sorted(list(question_set))
    records: List[Dict[str, Any]] = []
    prak_labels: List[Optional[str]] = []
    ment_labels: List[Optional[str]] = []

    for r in rows:
        row_vals: Dict[str, Any] = {f: 0 for f in features}
        normalized = normalize_answers_row(r.get("answers"))
        for it in normalized:
            q = it["questionId"]
            v = it.get("value")
            if isinstance(v, (int, float, bool)):
                row_vals[q] = float(v)
            else:
                try:
                    row_vals[q] = float(v)
                except Exception:
                    row_vals[q] = str(v)

        # copy q_* style columns directly if present
        for f in features:
            if (f not in row_vals or row_vals[f] == 0) and f in r and r[f] not in (None, ""):
                v = r[f]
                try:
                    row_vals[f] = float(v)
                except Exception:
                    row_vals[f] = str(v)

        # labels extraction (many shapes supported)
        dominant = None
        if "prakriti_label" in r and r["prakriti_label"]:
            dominant = r["prakriti_label"]
        if "dominant" in r and r["dominant"]:
            dominant = dominant or r["dominant"]
        scores = r.get("scores")
        if isinstance(scores, dict) and not dominant:
            dominant = scores.get("dominant")
            pct = scores.get("percent")
            if not dominant and isinstance(pct, dict):
                try:
                    dominant = max(pct.items(), key=lambda x: x[1])[0]
                except Exception:
                    dominant = dominant

        mlabel = None
        if "mental_label" in r and r["mental_label"]:
            mlabel = r["mental_label"]
        if "mental_health_level" in r and r["mental_health_level"]:
            mlabel = mlabel or r["mental_health_level"]
        mh = r.get("mental_health_score")
        if isinstance(mh, dict) and not mlabel:
            mlabel = mh.get("level") or mh.get("label")
        # numeric fallback
        if not mlabel:
            try:
                if isinstance(mh, (int, float)):
                    if mh < 40: mlabel = "red"
                    elif mh < 70: mlabel = "yellow"
                    else: mlabel = "green"
                else:
                    mhf = float(mh) if mh not in (None, "") else None
                    if mhf is not None:
                        if mhf < 40: mlabel = "red"
                        elif mhf < 70: mlabel = "yellow"
                        else: mlabel = "green"
            except Exception:
                pass

        records.append(row_vals)
        prak_labels.append(dominant)
        ment_labels.append(mlabel)

    if len(records) == 0:
        raise ValueError("No data rows found.")

    df = pd.DataFrame(records, columns=features)
    y_prak = pd.Series(prak_labels) if any(x is not None for x in prak_labels) else None
    y_ment = pd.Series(ment_labels) if any(x is not None for x in ment_labels) else None

    # keep rows where at least one of the labels exists
    keep_idx = []
    for i in range(len(records)):
        has_prak = (y_prak is not None and pd.notna(y_prak.iloc[i]) and str(y_prak.iloc[i]).strip() not in ("", "None"))
        has_ment = (y_ment is not None and pd.notna(y_ment.iloc[i]) and str(y_ment.iloc[i]).strip() not in ("", "None"))
        if has_prak or has_ment:
            keep_idx.append(i)

    if len(keep_idx) == 0:
        raise ValueError("No rows contain any target labels (prakriti or mental).")

    df = df.iloc[keep_idx].reset_index(drop=True)
    if y_prak is not None:
        y_prak = y_prak.iloc[keep_idx].reset_index(drop=True)
    if y_ment is not None:
        y_ment = y_ment.iloc[keep_idx].reset_index(drop=True)

    meta: Dict[str, Any] = {"features": features, "n_rows_before": len(records), "n_rows_after": len(df)}
    return df, y_prak, y_ment, meta

# -----------------------
# encoding + training
# -----------------------
def encode_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    encoders: Dict[str, Any] = {}
    df2 = df.copy()
    for col in df2.columns:
        if df2[col].apply(lambda x: isinstance(x, (int, float, np.integer, np.floating))).all():
            df2[col] = df2[col].astype(float).fillna(0.0)
            continue
        le = LabelEncoder()
        vals = df2[col].fillna("___nan___").astype(str)
        le.fit(vals)
        df2[col] = le.transform(vals).astype(float)
        encoders[col] = le
    return df2, encoders

def train_model(X: pd.DataFrame, y: pd.Series, model_name: str):
    X_enc, encoders = encode_dataframe(X)
    le = LabelEncoder()
    y_enc = le.fit_transform(y.astype(str))
    X_train, X_test, y_train, y_test = train_test_split(X_enc, y_enc, test_size=0.2, random_state=42)
    print(f"Training {model_name} model on {X_train.shape[0]} rows / {X_train.shape[1]} features")
    model = XGBClassifier(use_label_encoder=False, eval_metric="mlogloss", n_estimators=80, max_depth=4)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    report = classification_report(y_test, y_pred, target_names=le.classes_, output_dict=True)
    return model, encoders, le, report

def save_artifacts(model, encoders, label_encoder, model_basename: str, model_dir: str, meta: Dict[str, Any], report: Dict[str, Any]):
    artifacts = {}
    model_path = os.path.join(model_dir, f"{model_basename}_model.joblib")
    encoders_path = os.path.join(model_dir, f"{model_basename}_feature_encoders.joblib")
    labels_path = os.path.join(model_dir, f"{model_basename}_label_encoder.joblib")
    meta_path = os.path.join(model_dir, f"{model_basename}_meta.json")
    report_path = os.path.join(model_dir, f"{model_basename}_training_report.json")
    joblib.dump(model, model_path)
    joblib.dump(encoders, encoders_path)
    joblib.dump(label_encoder, labels_path)
    with open(meta_path, "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2)
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    artifacts.update({
        "model": model_path,
        "encoders": encoders_path,
        "label_encoder": labels_path,
        "meta": meta_path,
        "report": report_path
    })
    print(f"Saved artifacts: {artifacts}")
    return artifacts

# -----------------------
# Supabase fetch (defensive)
# -----------------------
def fetch_questionnaires_from_supabase(supabase_client: Any, limit: int = 2000) -> List[Dict[str, Any]]:
    if supabase_client is None:
        raise RuntimeError("Supabase client not initialized.")
    print(f"Fetching questionnaires from Supabase (limit={limit})...")
    try:
        resp = supabase_client.from_('questionnaire_answers').select('*').limit(limit).execute()
    except Exception as ex1:
        # try alternative API method names
        try:
            resp = supabase_client.table('questionnaire_answers').select('*').limit(limit).execute()
        except Exception as ex2:
            raise RuntimeError(f"Supabase query failed: {ex1} / {ex2}")
    data = getattr(resp, "data", None)
    if data is None and isinstance(resp, dict):
        data = resp.get("data")
    if data is None:
        raise RuntimeError(f"Unexpected Supabase response: {repr(resp)}")
    print(f"Fetched {len(data)} rows from Supabase")
    return data

# -----------------------
# CSV loader
# -----------------------
def load_rows_from_csv(csv_path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(csv_path)
    df = pd.read_csv(csv_path, dtype=str).fillna("")
    rows: List[Dict[str, Any]] = []
    for _, r in df.iterrows():
        obj: Dict[str, Any] = {}
        for col in df.columns:
            val = r[col]
            if val == "":
                obj[col] = None
                continue
            if col in ("answers", "scores", "mental_health_score"):
                try:
                    obj[col] = json.loads(val)
                except Exception:
                    obj[col] = val
            else:
                obj[col] = val
        rows.append(obj)
    print(f"Loaded {len(rows)} rows from CSV: {csv_path}")
    return rows

# -----------------------
# Main
# -----------------------
def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=2000)
    p.add_argument("--csv", type=str, default=None)
    p.add_argument("--model-dir", type=str, default=os.getenv("MODEL_DIR", "./models_out"))
    p.add_argument("--supabase-url", type=str, default=None)
    p.add_argument("--supabase-key", type=str, default=None)
    args = p.parse_args(argv)

    model_dir = args.model_dir
    os.makedirs(model_dir, exist_ok=True)

    # choose supabase url/key: CLI override -> env variables
    supabase_url = args.supabase_url or os.getenv("SUPABASE_URL")
    supabase_key = args.supabase_key or os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    print("Supabase URL:", supabase_url or "<none>")
    print("Supabase Key (masked):", mask_key(supabase_key))
    print("Model output dir:", model_dir)

    supabase_client = None
    if supabase_url and supabase_key and create_client:
        try:
            supabase_client = create_client(supabase_url, supabase_key)
            # quick lightweight check (do not fail the whole run on error)
            try:
                _ = supabase_client.from_('questionnaire_answers').select('id').limit(1).execute()
            except Exception as qq:
                print("Supabase client created but quick query failed (will surface detailed errors later).")
        except Exception as ex:
            print("Failed to create Supabase client:", ex)
            supabase_client = None

    rows: List[Dict[str, Any]] = []
    if args.csv is None and supabase_client is not None:
        try:
            rows = fetch_questionnaires_from_supabase(supabase_client, limit=args.limit)
        except Exception as e:
            print("Supabase fetch failed:", e)
            rows = []
    if args.csv:
        rows = load_rows_from_csv(args.csv)

    if not rows:
        raise SystemExit("No data for training. Provide --csv or valid SUPABASE env vars.")

    try:
        df, y_prak, y_ment, meta = build_dataframe(rows)
    except Exception as e:
        print("Failed to build dataframe from rows:", e)
        traceback.print_exc()
        raise

    print("Dataframe shape (n_rows, n_features):", df.shape)
    print("Meta:", meta)

    trained_artifacts: Dict[str, Any] = {}
    # prakriti
    if y_prak is not None and y_prak.notna().sum() > 0:
        mask = y_prak.notna() & (y_prak.astype(str).str.strip().ne("None"))
        Xp = df[mask.values].reset_index(drop=True)
        yp = y_prak[mask].reset_index(drop=True)
        if len(Xp) < 5:
            print("Not enough prakriti-labeled rows to train (need >=5). Skipping prakriti model.")
        else:
            model_p, enc_p, le_p, report_p = train_model(Xp, yp, "prakriti")
            artifacts_p = save_artifacts(model_p, enc_p, le_p, "prakriti", model_dir, meta, report_p)
            trained_artifacts["prakriti"] = artifacts_p
    else:
        print("No prakriti labels found. Skipping prakriti model.")

    # mental
    if y_ment is not None and y_ment.notna().sum() > 0:
        maskm = y_ment.notna() & (y_ment.astype(str).str.strip().ne("None"))
        Xm = df[maskm.values].reset_index(drop=True)
        ym = y_ment[maskm].reset_index(drop=True)
        if len(Xm) < 5:
            print("Not enough mental-labeled rows to train (need >=5). Skipping mental model.")
        else:
            model_m, enc_m, le_m, report_m = train_model(Xm, ym, "mental")
            artifacts_m = save_artifacts(model_m, enc_m, le_m, "mental", model_dir, meta, report_m)
            trained_artifacts["mental"] = artifacts_m
    else:
        print("No mental labels found. Skipping mental model.")

    if not trained_artifacts:
        raise SystemExit("No models trained. Ensure dataset contains 'prakriti_label' or 'mental_label' (or scores/mental_health_score).")

    print("Training finished. Trained artifacts:", json.dumps(trained_artifacts, indent=2))

if __name__ == "__main__":
    main()
