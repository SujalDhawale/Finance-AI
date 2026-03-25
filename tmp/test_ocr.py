import requests
import base64
import os

def test_ocr():
    url = "http://127.0.0.1:8000/scan/receipt"
    # Use the mock receipt we placed earlier
    receipt_path = r"c:\Users\sujal\GOOGLE 5 DAYS\ai-finance-platform\public\mock-receipt.png"
    
    if not os.path.exists(receipt_path):
        print(f"Error: Mock receipt not found at {receipt_path}")
        return

    with open(receipt_path, "rb") as f:
        image_data = f.read()
        base64_image = base64.b64encode(image_data).decode("utf-8")

    payload = {
        "image_base64": base64_image,
        "mime_type": "image/png"
    }

    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response JSON:")
            print(response.json())
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_ocr()
