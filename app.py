import os
import time
import numpy as np
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from PIL import Image
from tensorflow import keras

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
MODEL_PATH = "best_accident_severity_model.keras"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
CLASS_NAMES = ["Minor Impact", "Substantial Impact", "Critical Impact"]
IMG_SIZE = (224, 224)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
model = None

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def load_model_once():
    global model
    if model is None:
        model = keras.models.load_model(MODEL_PATH)
    return model

def preprocess_image(image_path):
    image = Image.open(image_path).convert("RGB").resize(IMG_SIZE)
    arr = np.array(image).astype("float32") / 255.0
    return np.expand_dims(arr, axis=0)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    start_time = time.time()
    if "image" not in request.files:
        return jsonify({"error": "No image file uploaded."}), 400
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No selected file."}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Please upload JPG, JPEG, PNG, or WEBP."}), 400
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)
    try:
        probs = load_model_once().predict(preprocess_image(filepath), verbose=0)[0]
        pred_idx = int(np.argmax(probs))
        sorted_probs = sorted(
            [{"class_name": CLASS_NAMES[i], "probability": round(float(probs[i]) * 100, 2)} for i in range(len(CLASS_NAMES))],
            key=lambda x: x["probability"],
            reverse=True
        )
        return jsonify({
            "prediction": CLASS_NAMES[pred_idx],
            "confidence": round(float(np.max(probs)) * 100, 2),
            "prediction_time": round(time.time() - start_time, 3),
            "probabilities": sorted_probs
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.remove(filepath)
        except Exception:
            pass

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)