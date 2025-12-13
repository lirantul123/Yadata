import pandas as pd
from sklearn.linear_model import LinearRegression
import json
import sys

df = pd.read_csv("./python/real_estate.csv")

data_rows = []
for _, row in df.iterrows():
    if pd.notna(row['average price (NIS) 3 rooms apartments']):
        data_rows.append([
            row['Lamas_code'],      # cityCode
            3,                       # rooms
            row['year'],             # year as age proxy
            0,                       # parking (if unknown, default 0)
            0,                       # balconies (if unknown, default 0)
            row['average price (NIS) 3 rooms apartments']
        ])
    if pd.notna(row['average price (NIS) 4+ rooms apartments']):
        data_rows.append([
            row['Lamas_code'],
            4,
            row['year'],
            0,
            0,
            row['average price (NIS) 4+ rooms apartments']
        ])

X = [[r[0], r[1], r[2], r[3], r[4]] for r in data_rows]
y = [r[5] for r in data_rows]

model = LinearRegression()
model.fit(X, y)

def predict(features: dict):
    feature_list = [
        features['cityCode'],
        features['rooms'],
        features.get('year', 2025),
        features.get('parking', 0),
        features.get('balconies', 0),
    ]
    price = model.predict([feature_list])[0]
    return price

if __name__ == "__main__":
    raw = sys.stdin.read()
    data = json.loads(raw)
    result = predict(data['features'])
    print(json.dumps({"price": float(result)}))
