import os
import numpy as np
import pandas as pd

CITY_MULTIPLIER = {
    5000: 1.00,  # Tel Aviv
    6400: 0.92,  # Herzliya
    8700: 0.90,  # Ra'anana
    6300: 0.88,  # Givatayim
    8600: 0.85,  # Ramat Gan
    7200: 0.82,  # Nes Ziona
    3000: 0.80,  # Jerusalem
    6900: 0.80,  # Kfar Saba
    8400: 0.80,  # Rehovot
    8300: 0.78,  # Rishon LeZion
    6100: 0.78,  # Bnei Brak
    7900: 0.77,  # Petah Tikva
    6600: 0.76,  # Holon
    4000: 0.75,  # Haifa
    9700: 0.75,  # Hod HaSharon
    6200: 0.72,  # Bat Yam
    7400: 0.72,  # Netanya
    2640: 0.68,  # Rosh HaAyin
    2660: 0.65,  # Yavne
    6500: 0.65,  # Hadera
    2600: 0.62,  # Eilat
    7100: 0.62,  # Ashkelon
    6800: 0.60,  # Kiryat Ata
    70:   0.60,  # Ashdod
    9100: 0.58,  # Nahariya
    7600: 0.55,  # Akko
    2610: 0.55,  # Beit Shemesh
    7700: 0.52,  # Afula
    7300: 0.50,  # Nazareth
    9000: 0.50,  # Beersheba
    8500: 0.48,  # Ramla
    7000: 0.48,  # Lod
    2630: 0.42,  # Kiryat Gat
    3780: 0.45,  # Beitar Illit
    3797: 0.45,  # Modiin Illit
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
