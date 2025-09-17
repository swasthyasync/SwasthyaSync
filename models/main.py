# models/main.py
import os
import traceback
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from inference import predict_from_answers
import inference
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SwasthyaSync ML Inference API", version="1.0.0")

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware to debug 405 errors
@app.middleware("http")
async def log_requests(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    print(f"🔍 {request.method} {request.url} - IP: {client_ip}")
    print(f"   User-Agent: {user_agent}")
    print(f"   Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    print(f"   Response: {response.status_code}")
    return response

class PredictRequest(BaseModel):
    answers: Any

class PredictResponse(BaseModel):
    prakriti: Dict[str, Any]
    confidence: float
    features_used: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    status: str
    message: str
    model_loaded: bool

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    try:
        inference.load_model()
        print("✅ SwasthyaSync ML models loaded successfully")
    except Exception as ex:
        print(f"⚠️ Model load warning: {ex}")

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "SwasthyaSync ML Inference API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Try to load model to verify it's working
        model, metadata = inference.load_model()
        model_loaded = model is not None
        return HealthResponse(
            status="healthy",
            message="SwasthyaSync ML Service is running",
            model_loaded=model_loaded
        )
    except Exception as e:
        return HealthResponse(
            status="degraded",
            message=f"Service running but model issues: {str(e)}",
            model_loaded=False
        )

@app.post("/predict", response_model=PredictResponse)
async def predict_prakriti(req: PredictRequest):
    """
    Predict Prakriti constitution from questionnaire answers
    
    Expected input format:
    {
        "answers": [
            {"questionId": "q1", "value": "Thin, light, and narrow", "trait": "vata", "weight": 1},
            {"questionId": "q2", "value": "Dry, rough, and thin", "trait": "vata", "weight": 1},
            ...
        ]
    }
    """
    try:
        print(f"📊 Processing prediction request with {len(req.answers) if req.answers else 0} answers")
        
        # Validate input
        if not req.answers:
            raise HTTPException(status_code=400, detail="Answers are required")
        
        # Make prediction
        result = predict_from_answers(req.answers)
        
        if not result:
            raise HTTPException(status_code=500, detail="Prediction failed")
        
        print(f"✅ Prediction successful: {result.get('prakriti', {}).get('dominant', 'unknown')}")
        return PredictResponse(**result)
        
    except FileNotFoundError as fe:
        print(f"❌ Model file not found: {fe}")
        raise HTTPException(
            status_code=503, 
            detail=f"Model not available: {str(fe)}. Please ensure the model is trained."
        )
    except ValueError as ve:
        print(f"❌ Invalid input: {ve}")
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(ve)}")
    except Exception as ex:
        print(f"❌ Prediction error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal prediction error: {str(ex)}"
        )

@app.post("/retrain")
async def retrain_model(request: Request):
    """
    Retrain the ML model (protected endpoint)
    Include header: x-ml-admin-key with your admin key
    """
    # Check admin key if provided
    ML_ADMIN_KEY = os.getenv("ML_ADMIN_KEY")
    if ML_ADMIN_KEY:
        header_key = request.headers.get("x-ml-admin-key")
        if header_key != ML_ADMIN_KEY:
            raise HTTPException(status_code=403, detail="Forbidden: Invalid admin key")
    
    try:
        # Import training module
        from train_csv import train_model
        
        # Retrain
        print("🔄 Starting model retraining...")
        pipeline, metadata = train_model()
        
        # Clear cached models and reload
        inference._model = None
        inference._metadata = None
        inference.load_model()
        
        print("✅ Model retrained and reloaded successfully")
        return {
            "status": "success",
            "message": "Model retrained successfully",
            "model_accuracy": metadata.get("accuracy", "N/A")
        }
        
    except ImportError as ie:
        raise HTTPException(
            status_code=500, 
            detail=f"Training module not available: {str(ie)}"
        )
    except Exception as e:
        print(f"Training error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Training failed: {str(e)}"
        )

@app.get("/model/info")
async def model_info():
    """Get information about the loaded model"""
    try:
        model, metadata = inference.load_model()
        
        return {
            "model_type": metadata.get("model_type", "unknown"),
            "features": metadata.get("features", []),
            "categorical_features": metadata.get("categorical_features", []),
            "total_features": len(metadata.get("features", [])),
            "question_mapping_count": len(metadata.get("question_mapping", {}))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load model info: {str(e)}")

@app.post("/predict/batch")
async def predict_batch(requests: List[PredictRequest]):
    """Batch prediction endpoint for multiple questionnaires"""
    if len(requests) > 50:  # Limit batch size
        raise HTTPException(status_code=400, detail="Batch size too large (max 50)")
    
    results = []
    errors = []
    
    for i, req in enumerate(requests):
        try:
            result = predict_from_answers(req.answers)
            results.append({"index": i, "result": result})
        except Exception as e:
            errors.append({"index": i, "error": str(e)})
    
    return {
        "successful_predictions": len(results),
        "failed_predictions": len(errors),
        "results": results,
        "errors": errors
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    print(f"Unhandled exception: {traceback.format_exc()}")
    return HTTPException(
        status_code=500,
        detail="An unexpected error occurred"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV") == "development"
    )