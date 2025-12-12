from sklearn.linear_model import LinearRegression
import numpy as np
import json
import sys

def train_model():
    # False info
    # TODO: change for recieving from api or somthing, if there is one -_-
    X = np.array([
        [70, 1, 3, 10, 1],
        [85, 2, 4, 5, 1],
        [60, 1, 2, 15, 0],
        [90, 2, 4, 2, 1],
        [50, 1, 2, 20, 0],
        [95, 2, 5, 1, 1],
        [80, 2, 3, 8, 1],
        [65, 1, 3, 12, 0]
    ])
    y = np.array([200, 350, 180, 400, 150, 420, 360, 220])
    model = LinearRegression()
    model.fit(X, y)
    return model

def predict(features):
    model = train_model()
    price = model.predict([features])[0]
    return price

if __name__ == "__main__":
    raw = sys.stdin.read()
    data = json.loads(raw)
    result = predict(data['features'])
    print(json.dumps({"price": float(result)}))
