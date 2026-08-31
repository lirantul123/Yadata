import os
import numpy as np
import pandas as pd

CITY_MULTIPLIER = {
    2600: 1.00,  # Tel Aviv
    70:   0.95,  # Jerusalem
    6500: 0.92,  # Herzliya
    6400: 0.90,  # Ramat Gan
    7600: 0.88,  # Ra'anana
    3000: 0.85,  # Modiin
    9700: 0.80,  # Bnei Brak
    7100: 0.80,  # Haifa
    9000: 0.78,  # Rishon LeZion
    2610: 0.78,  # Petah Tikva
    2660: 0.78,  # Rehovot
    6600: 0.75,  # Kfar Saba
    6300: 0.75,  # Holon
    3797: 0.72,  # Kiryat Motzkin
    9100: 0.72,  # Kiryat Ata
    6200: 0.70,  # Netanya
    6800: 0.70,  # Kfar Yona
    8500: 0.68,  # Yavne
    4000: 0.65,  # Hadera
    7300: 0.62,  # Ashkelon
    3780: 0.60,  # Ashdod
    7900: 0.60,  # Nahariya
    7000: 0.58,  # Acre
    7200: 0.56,  # Kiryat Ata (alternate code)
    7700: 0.55,  # Eilat
    6100: 0.52,  # Beersheba
    8300: 0.50,  # Nazareth
    8600: 0.48,  # Migdal HaEmek
    7400: 0.46,  # Kiryat Gat
    8700: 0.43,  # Kiryat Shmona
    8400: 0.40,  # Sderot
    5000: 0.70,  # Other
}

_CSV_PATH = os.path.join(os.path.dirname(__file__), "real_estate.csv")


class PriceModel:
    def __init__(self, csv_path: str = _CSV_PATH):
        df = pd.read_csv(csv_path, encoding="windows-1255")

        prices_3: dict[int, list[float]] = {}
        prices_4plus: dict[int, list[float]] = {}

        for _, row in df.iterrows():
            code = int(row["Lamas_code"])
            col3 = "average price (NIS) 3 rooms apartments"
            col4 = "average price (NIS) 4+ rooms apartments"
            if pd.notna(row[col3]):
                prices_3.setdefault(code, []).append(float(row[col3]))
            if pd.notna(row[col4]):
                prices_4plus.setdefault(code, []).append(float(row[col4]))

        self._avg_3: dict[int, float] = {c: float(np.mean(p)) for c, p in prices_3.items()}
        self._avg_4plus: dict[int, float] = {c: float(np.mean(p)) for c, p in prices_4plus.items()}

        all_3 = [p for ps in prices_3.values() for p in ps]
        all_4plus = [p for ps in prices_4plus.values() for p in ps]
        self._global_3 = float(np.mean(all_3))
        self._global_4plus = float(np.mean(all_4plus))
        self._global_multiplier = float(np.mean(list(CITY_MULTIPLIER.values())))

    def predict(
        self,
        city_code: int,
        rooms: float,
        size: float,
        parking: int,
        balconies: int,
    ) -> float:
        is_small = rooms <= 3.5

        if is_small:
            city_base = self._avg_3.get(city_code)
            if city_base is None:
                m = CITY_MULTIPLIER.get(city_code, self._global_multiplier)
                city_base = self._global_3 * m
            ref_size = 75.0
        else:
            city_base = self._avg_4plus.get(city_code)
            if city_base is None:
                m = CITY_MULTIPLIER.get(city_code, self._global_multiplier)
                city_base = self._global_4plus * m
            ref_size = 110.0

        size_factor = (size / ref_size) ** 0.75
        room_delta = rooms - (3.0 if is_small else 4.0)
        room_factor = 1.0 + room_delta * 0.12
        extras = 1.0 + parking * 0.07 + balconies * 0.04

        price = city_base * size_factor * room_factor * extras
        return max(price, 150_000.0)
