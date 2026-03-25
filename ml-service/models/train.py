import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.pipeline import make_pipeline
from sklearn.ensemble import IsolationForest
import joblib
import os

# Ensure models directory exists
os.makedirs(os.path.dirname(__file__), exist_ok=True)

print("Training Categorizer Model...")
# Dummy data for Categorization (SVM/Decision Tree paradigm)
data = {
    "merchant": ["Uber", "Lyft", "Walmart", "Whole Foods", "Starbucks", "Netflix", "Spotify", "Shell", "Exxon", "McDonalds", "Burger King", "Amazon", "Apple", "Steam", "Target"],
    "category": ["Transport", "Transport", "Groceries", "Groceries", "Food", "Entertainment", "Entertainment", "Transport", "Transport", "Food", "Food", "Shopping", "Shopping", "Entertainment", "Shopping"]
}
df = pd.DataFrame(data)

# Create a pipeline that extracts features from merchant names and trains SVM
categorizer = make_pipeline(TfidfVectorizer(ngram_range=(1,2)), LinearSVC(dual=True))
categorizer.fit(df["merchant"], df["category"])

joblib.dump(categorizer, os.path.join(os.path.dirname(__file__), "categorizer.joblib"))
print("Categorizer saved.")

print("Training Anomaly Detector...")
# Dummy data for Anomaly Detection (Isolation Forest)
# Normal transactions are usually between 5 and 200
# Frauds might be completely out of bounds (e.g. 5000+)
amounts = pd.DataFrame({"amount": [12.50, 45.00, 110.00, 5.99, 15.00, 89.99, 25.00, 120.00, 40.00, 8.50, 150.00, 18.00, 5000.00, 2500.00]})

iso_forest = IsolationForest(contamination=0.15, random_state=42)
# Need to pass as 2D array: DataFrame amounts[["amount"]] works well
iso_forest.fit(amounts[["amount"]])

joblib.dump(iso_forest, os.path.join(os.path.dirname(__file__), "anomaly_detector.joblib"))
print("Anomaly Detector saved.")
print("All models trained perfectly!")
