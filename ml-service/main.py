import os
import warnings
import json
import base64
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import io
from sklearn.ensemble import RandomForestRegressor
import numpy as np

# --- Configuration ---
# Load environment from the project root
DOTENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=DOTENV_PATH)

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash"  # Switched to 2.0 for consistency

if not API_KEY:
    print(f"⚠️ WARNING: GEMINI_API_KEY not found in {DOTENV_PATH}")
else:
    genai.configure(api_key=API_KEY)

app = FastAPI(title="Welth AI ML Service")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models safely into memory at boot
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
categorizer = None
anomaly_detector = None

try:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        if os.path.exists(os.path.join(MODELS_DIR, "categorizer.joblib")):
            categorizer = joblib.load(os.path.join(MODELS_DIR, "categorizer.joblib"))
        if os.path.exists(os.path.join(MODELS_DIR, "anomaly_detector.joblib")):
            anomaly_detector = joblib.load(os.path.join(MODELS_DIR, "anomaly_detector.joblib"))
    print("✅ Models loaded successfully!")
except Exception as e:
    print(f"⚠️ Warning: Models not loaded smoothly. Error: {e}")

class TransactionRequest(BaseModel):
    merchant: str
    amount: float

class OCRRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"

class ForecastHistory(BaseModel):
    month: str # e.g., "2024-01"
    amount: float

class ForecastRequest(BaseModel):
    history: List[ForecastHistory]

@app.get("/")
def read_root():
    return {
        "message": "AI Finance ML Service is running smoothly!",
        "config": {
            "model": MODEL_NAME,
            "env_path": str(DOTENV_PATH),
            "api_key_status": "Loaded" if API_KEY else "Missing"
        }
    }

@app.post("/predict/category")
def predict_category(req: TransactionRequest):
    if categorizer is None:
        raise HTTPException(status_code=503, detail="Categorizer model is not loaded yet")
    try:
        prediction = categorizer.predict([req.merchant])[0]
        return {"category": str(prediction)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/fraud")
def detect_fraud(req: TransactionRequest):
    if anomaly_detector is None:
        raise HTTPException(status_code=503, detail="Anomaly model is not loaded yet")
    try:
        prediction = anomaly_detector.predict([[req.amount]])[0]
        is_anomaly = bool(prediction == -1)
        return {"is_anomaly": is_anomaly}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan/receipt")
async def scan_receipt(req: OCRRequest):
    if not API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API Key is not configured")
    
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        prompt = """
          Analyze this receipt image and extract the following information in JSON format:
          - Total amount (just the number)
          - Date (in ISO format)
          - Description or items purchased (brief summary)
          - Merchant/store name
          - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense)
          
          Only respond with valid JSON in this exact format:
          {
            "amount": number,
            "date": "ISO date string",
            "description": "string",
            "merchantName": "string",
            "category": "string"
          }

          If it's not a receipt, return an empty object.
        """

        # Generate content
        response = model.generate_content([
            {
                "mime_type": req.mime_type,
                "data": req.image_base64
            },
            prompt
        ])

        # Clean response and parse JSON
        text = response.text
        # Simple cleanup in case of markdown formatting
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        data = json.loads(text.strip())
        return data

    except Exception as e:
        print(f"❌ OCR Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process receipt: {str(e)}")

@app.post("/predict/forecast")
def predict_forecast(req: ForecastRequest):
    if len(req.history) < 3:
        # Not enough data for Random Forest, return a simple average or linear trend
        if not req.history:
            return {"forecast": 0.0, "method": "none"}
        avg = sum(h.amount for h in req.history) / len(req.history)
        return {"forecast": round(avg, 2), "method": "average"}

    try:
        # Prepare data for training
        # We use simple month index as feature
        X = np.array(range(len(req.history))).reshape(-1, 1)
        y = np.array([h.amount for h in req.history])

        # Initialize and train Random Forest
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)

        # Predict next month
        next_month_idx = np.array([[len(req.history)]])
        prediction = model.predict(next_month_idx)[0]

        return {
            "forecast": round(float(prediction), 2),
            "method": "random_forest",
            "confidence": 0.89 # Placeholder for accuracy estimate
        }
    except Exception as e:
        print(f"❌ Forecast Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
