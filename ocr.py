from flask import Flask, request
import easyocr
import cv2
import numpy as np

reader = easyocr.Reader(['en'], gpu=False)
app = Flask(__name__)

@app.route("/ocr", methods=["POST"])
def ocr():
    file = request.files["image"].read()
    img = cv2.imdecode(np.frombuffer(file, np.uint8), cv2.IMREAD_COLOR)
    result = reader.readtext(img, detail=0)
    text = "".join(result).upper()
    text = "".join(c for c in text if c.isalnum())
    return {"plate": text}

app.run(host="0.0.0.0", port=5000)
