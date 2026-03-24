"use server";

// The FastAPI base URL naturally binds to port 8000 locally
const FASTAPI_URL = "http://127.0.0.1:8000";

// Standard ML Categorization
export async function fetchMlCategory(merchant, amount = 0) {
  try {
    const res = await fetch(`${FASTAPI_URL}/predict/category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant, amount: parseFloat(amount) }),
      // Short timeout to ensure it doesn't block critical UX flows
      signal: AbortSignal.timeout(2000)
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    return data.category; // e.g. "Food", "Entertainment"
  } catch (error) {
    console.error("FastAPI Categorizer Error:", error.message);
    return null; // Graceful fallback
  }
}

// Unsupervised Isolation Forest Fraud Detection
export async function runFraudCheck(merchant, amount) {
  try {
    const res = await fetch(`${FASTAPI_URL}/detect/fraud`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant, amount: parseFloat(amount) }),
      signal: AbortSignal.timeout(2000)
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data.is_anomaly; // Returns exact boolean based on ML bounds
  } catch (error) {
    console.error("FastAPI Fraud Detector Error:", error.message);
    return false; // Graceful fallback
  }
}
