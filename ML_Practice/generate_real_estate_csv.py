import csv
import random

OUTPUT_FILE = "real_estate_data.csv"

# Base detail
cities = [
    ("Tel Aviv", 5000, 2800000),
    ("Herzliya", 6400, 2700000),
    ("Rehovot", 8400, 2000000),
    ("Ramat Gan", 8600, 2100000),
    ("Givatayim", 6300, 2200000),
    ("Petah Tikva", 7900, 1800000),
    ("Holon", 6600, 1750000),
    ("Bat Yam", 6200, 1700000),
]

years = list(range(2010, 2026))

def price_growth(base, year_index):
    growth = 1 + 0.035 * year_index
    noise = random.uniform(0.95, 1.08)
    return int(base * growth * noise)

def generate_size(rooms):
    if rooms == 3:
        return random.randint(70, 95)
    if rooms == 4:
        return random.randint(90, 125)
    if rooms == 5:
        return random.randint(120, 160)
    return random.randint(160, 220)

def generate_parking(city_code, rooms):
    central = {5000, 6400, 8400, 8600, 6300, 7900}
    max_p = 2 if city_code in central else 4
    return random.randint(0, min(max_p, rooms - 2))

def generate_balconies(size):
    if size < 80:
        return random.randint(0, 1)
    if size < 120:
        return random.randint(1, 2)
    if size < 160:
        return random.randint(1, 3)
    return random.randint(2, 4)

rows = []
target_rows = 5000

while len(rows) < target_rows:
    city_name, city_code, base_price = random.choice(cities)
    year_index = random.randint(0, len(years) - 1)
    year = years[year_index]
    rooms = random.randint(3, 6)
    size = generate_size(rooms)
    parking = generate_parking(city_code, rooms)
    balconies = generate_balconies(size)

    price = price_growth(base_price, year_index)
    price += size * 4500
    price += parking * 100000
    price += balconies * 70000

    rows.append([city_name, city_code, year, rooms, size, parking, balconies, price])

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["city_name", "city_code", "year", "rooms", "size", "parking", "balconies", "price"])
    writer.writerows(rows)

print(f"✅ Generated {len(rows)} rows into {OUTPUT_FILE}")
