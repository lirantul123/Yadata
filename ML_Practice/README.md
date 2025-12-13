# Real Estate Price Predictor - predev

This project consists of two Python scripts:

1. **`generate_real_estate_csv.py`** – Generates a realistic dataset of real estate properties in Central Israel.
2. **`main.py`** – Loads the generated dataset, trains a linear regression model, and predicts real estate prices based on user input.

---

## Files

### 1. `generate_real_estate_csv.py`

- **Purpose:** Generates `real_estate_data.csv` with simulated property data.
- **Data includes:**
  - City name and code
  - Year (2010–2025)
  - Number of rooms
  - Apartment size (sqm)
  - Parking spots
  - Balconies
  - Price (calculated using base prices, features, and randomness)
  
- **How to run:**

```bash
python generate_real_estate_csv.py
```
#### This will create real_estate_data.csv in the same directory.

### 2. `main.py`

- **Purpose**: Predicts real estate prices using a trained linear regression model.

- **How it works:**

    * Loads the dataset real_estate_data.csv.

    * Prepares the data for training.

    * Trains a linear regression model on city_code, year, rooms, size, parking, balconies.

    * Prompts the user for property details and outputs the estimated price.

## How to run:
```bash
python main.py
```
or
```bash
python3 main.py
```

# Requirements

* Python 3.8+

* Packages:

* pandas

* numpy

* scikit-learn

#### Install dependencies with:

```bash
pip install pandas numpy scikit-learn
```

### Example input:
```bash
City code (e.g. 8400 Rehovot): 8400
Year: 2025
Rooms (>=3): 4
Size (sqm): 110
Parking spots (>=0): 1
Balconies (>=0): 1
```
### Example output:

```bash
💰 Estimated price: ₪2,345,000
```

# Notice 
#### Make sure to run `generate_real_estate_csv.py` first to create the dataset before running main.py for the training set.
 Generates a csv file at the root folder.\
You may edit as your wish.
