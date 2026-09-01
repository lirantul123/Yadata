from http.server import BaseHTTPRequestHandler
import json
import math
import os
import numpy as np
import pandas as pd

# Israeli market: assumed average sqm per room category
_SQM_3 = 75.0   # 3-room unit ≈ 75 m²
_SQM_4 = 100.0  # 4+-room unit ≈ 100 m²

# Absolute bonuses per amenity (NIS), market-calibrated
_PARKING_BONUS = 55_000
_BALCONY_BONUS = 28_000

_CSV = os.path.join(os.path.dirname(__file__), "real_estate.csv")

# Base year for exponential time-weighting
_BASE_YEAR = 2017
_DECAY = 0.35  # higher = stronger recency preference


class _Model:
    def __init__(self):
        df = pd.read_csv(_CSV, encoding="windows-1255")
        C3 = "average price (NIS) 3 rooms apartments"
        C4 = "average price (NIS) 4+ rooms apartments"

        # Per city: compute exponentially time-weighted price-per-sqm
        # for 3-room and 4+-room units separately
        profiles = {}
        for code, grp in df.groupby("Lamas_code"):
            w3_sum = w3_val = w4_sum = w4_val = 0.0
            for _, row in grp.iterrows():
                w = math.exp(_DECAY * (row["year"] - _BASE_YEAR))
                if pd.notna(row[C3]) and row[C3] > 0:
                    ppsm = row[C3] / _SQM_3
                    w3_val += w * ppsm
                    w3_sum += w
                if pd.notna(row[C4]) and row[C4] > 0:
                    ppsm = row[C4] / _SQM_4
                    w4_val += w * ppsm
                    w4_sum += w
            ppsm3 = w3_val / w3_sum if w3_sum > 0 else None
            ppsm4 = w4_val / w4_sum if w4_sum > 0 else None
            if ppsm3 is not None or ppsm4 is not None:
                profiles[int(code)] = (ppsm3, ppsm4)

        # Fill cities that only have one of the two data points
        for code, (p3, p4) in profiles.items():
            if p3 is None:
                profiles[code] = (p4 * (_SQM_4 / _SQM_3) * 0.90, p4)
            elif p4 is None:
                profiles[code] = (p3, p3 * (_SQM_3 / _SQM_4) * 1.08)

        self._profiles = profiles

        # National fallback: median price-per-sqm across all cities
        all_ppsm = [p for p3, p4 in profiles.values() for p in (p3, p4) if p]
        self._national_ppsm = float(np.median(all_ppsm)) if all_ppsm else 18_000.0

    def predict(self, city_code: int, rooms: float, size: float, parking: int, balconies: int) -> float:
        pair = self._profiles.get(city_code)
        if pair:
            ppsm3, ppsm4 = pair
        else:
            ppsm3 = ppsm4 = self._national_ppsm

        # Linear interpolation/extrapolation between 3-room and 4-room anchor
        # rooms=3 → ppsm3, rooms=4 → ppsm4
        slope = (ppsm4 - ppsm3) / 1.0  # per room above 3
        ppsm = ppsm3 + slope * (rooms - 3.0)

        # Clamp: never go below 70% or above 150% of city midpoint
        mid = (ppsm3 + ppsm4) / 2
        ppsm = max(mid * 0.70, min(mid * 1.50, ppsm))

        price = size * ppsm + parking * _PARKING_BONUS + balconies * _BALCONY_BONUS
        return max(price, 100_000.0)


_model = _Model()


class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            data = json.loads(self.rfile.read(length))
        except Exception:
            self._respond(400, {"error": "Invalid JSON"})
            return

        city_code = data.get("cityCode")
        rooms = data.get("rooms")
        size = data.get("size")
        parking = int(data.get("parking", 0))
        balconies = int(data.get("balconies", 0))

        if city_code is None or rooms is None or size is None:
            self._respond(400, {"error": "cityCode, rooms, size are required"})
            return

        try:
            price = _model.predict(int(city_code), float(rooms), float(size), parking, balconies)
            self._respond(200, {"price": round(price, 2)})
        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _respond(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self._cors()
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *_):
        pass
