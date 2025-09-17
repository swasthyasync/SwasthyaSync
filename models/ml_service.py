# ml_service.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os, joblib, json
import pandas as pd
from typing import Any, Dict, List

MODEL_DIR = os.getenv("MODEL_DIR", "./models_out")
PRAKRITI_MODEL = os.path.join(MODEL_DIR, "prakriti_model.joblib")
METADATA = os.path.join(MODEL_DIR, "feature_columns.json")

app = FastAPI(title="Prakriti ML Service")

# simple input schema - accepts either {answers: [...]} or list of answer objects
class Answer(BaseModel):
    questionId: str | None = None
    value: Any | None = None

class PredictRequest(BaseModel):
    answers: List[Answer] | Dict[str, Any] | None = None
    # optionally accept prebuilt feature dict
    features: Dict[str, Any] | None = None

_model = None
_metadata = None

def load_artifacts():
    global _model, _metadata
    if _model is not None and _metadata is not None:
        return
    if not os.path.exists(PRAKRITI_MODEL):
        raise FileNotFoundError(f"Model not found: {PRAKRITI_MODEL}")
    _model = joblib.load(PRAKRITI_MODEL)
    if os.path.exists(METADATA):
        with open(METADATA, "r", encoding="utf-8") as fh:
            _metadata = json.load(fh)
    else:
        _metadata = {}

@app.get("/health")
def health():
    try:
        load_artifacts()
        return {"status": "ok", "model_loaded": True}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def normalize_answers_to_features(answers, metadata):
    """
    Minimal mapping: if 'features' mapping available in metadata (question_mapping),
    map answers to columns expected by the model. This function is intentionally simple:
    adapt it to your exact metadata/question mapping.
    """
    features = {}
    # if already provided feature names in metadata, prefill with None
    feature_list = metadata.get("features") or []
    for f in feature_list:
        features[f] = None

    # answers may be list of objects or dict
    items = []
    if isinstance(answers, dict):
        # maybe mapping qid->value
        for k,v in answers.items():
            items.append({"questionId": k, "value": v})
    elif isinstance(answers, list):
        for a in answers:
            items.append({"questionId": getattr(a, "questionId", None) if hasattr(a, "questionId") else a.get("questionId", None), "value": getattr(a, "value", None) if hasattr(a, "value") else a.get("value", None)})
    else:
        items = []

    # Try simple mapping: metadata may contain question_mapping from q id -> column name
    qmap = metadata.get("question_mapping", {})
    for it in items:
        qid = str(it.get("questionId")) if it.get("questionId") is not None else None
        val = it.get("value")
        if qid and qmap and qid in qmap:
            col = qmap[qid]
            features[col] = val
        else:
            # fallback: if feature name equals qid
            if qid in features:
                features[qid] = val

    # If model expected numeric but feature is None, fill 0 / empty strings as necessary
    # convert to one-row DataFrame
    df = pd.DataFrame([features])
    # convert NaN fills
    df = df.fillna(0)
    return df

@app.post("/predict")
def predict(payload: PredictRequest):
    try:
        load_artifacts()
        # If client provided features directly, use them
        if payload.features:
            df = pd.DataFrame([payload.features])
        else:
            df = normalize_answers_to_features(payload.answers or [], _metadata or {})

        # Ensure columns order consistent if metadata contains 'features'
        if _metadata and _metadata.get("features"):
            cols = [c for c in _metadata["features"] if c in df.columns]
            if cols:
                df = df[cols]

        # Model can be pipeline (scikit) or sklearn/xgboost
        model = _model
        # do predict_proba if available
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(df)
            preds = model.predict(df)
            classes = getattr(model, "classes_", None)
            # build human-friendly mapping
            if classes is None:
                classes = list(range(probs.shape[1]))
            prob_map = {str(c): float(p) for c,p in zip(classes, probs[0])}
            top_idx = int(probs[0].argmax())
            top_class = str(classes[top_idx])
            confidence = float(probs[0][top_idx])
            return {
                "prediction": str(preds[0]),
                "top_prediction": top_class,
                "confidence": confidence,
                "probabilities": prob_map
            }
        else:
            pred = model.predict(df)
            return {"prediction": str(pred[0])}
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")
