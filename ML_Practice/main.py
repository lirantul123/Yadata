import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import math

OUTPUT_FILE = "real_estate_data.csv"

CITY_MULTIPLIER = {
    5000: 1.0,  # Tel Aviv
    6400: 0.95,  # Herzliya
    8400: 0.9,  # Rehovot
    8600: 0.95,  # Ramat Gan
    6300: 0.95,  # Givatayim
    7900: 0.85,  # Petah Tikva
    6600: 0.8,  # Holon
    6200: 0.7,  # Bat Yam
}

def load_data():
    df = pd.read_csv(OUTPUT_FILE, encoding="utf-8")
    return df

def prepare_training_data(df):
    rows = []
    for _, row in df.iterrows():
        rows.append([
            int(row["city_code"]),
            int(row["year"]),
            int(row["rooms"]),
            int(row["size"]),
            int(row["parking"]),
            int(row["balconies"]),
            math.log(float(row["price"]))
        ])
    data = pd.DataFrame(rows, columns=[
        "city_code", "year", "rooms", "size", "parking", "balconies", "log_price"
    ])
    X = data[["city_code", "year", "rooms", "size", "parking", "balconies"]].values
    y = data["log_price"].values
    return X, y

def train_model():
    df = load_data()
    X, y = prepare_training_data(df)
    model = LinearRegression()
    model.fit(X, y)
    return model

def predict_price(model, city_code, year, rooms, size, parking, balconies):
    features = np.array([[city_code, year, rooms, size, parking, balconies]])
    base_price = math.exp(model.predict(features)[0])

    city_factor = CITY_MULTIPLIER.get(city_code, 0.5)
    luxury_factor = 1.0 + max(0, (size - 160) * 0.015)
    extra_factor = 1 + parking * 0.07 + balconies * 0.05

    return base_price * city_factor * luxury_factor * extra_factor

def main():
    model = train_model()
    print("\n🏠 Local Real Estate Price Predictor\n")

    city_code = int(input("City code (e.g. 8400 Rehovot): "))
    year = int(input("Year: "))
    rooms = int(input("Rooms (>=3): "))
    size = int(input("Size (sqm): "))
    parking = int(input("Parking spots (>=0): "))
    balconies = int(input("Balconies (>=0): "))

    price = predict_price(model, city_code, year, rooms, size, parking, balconies)
    print(f"\n💰 Estimated price: ₪{price:,.0f}")

if __name__ == "__main__":
    main()
