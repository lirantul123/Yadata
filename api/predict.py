from http.server import BaseHTTPRequestHandler
import csv
import json
import math
import os

_SQM_3 = 75.0
_SQM_4 = 100.0
_PARKING_BONUS = 55_000
_BALCONY_BONUS = 28_000
_BASE_YEAR = 2017
_DECAY = 0.35

_CSV = os.path.join(os.path.dirname(__file__), "real_estate.csv")


def _load_profiles():
    C3 = "average price (NIS) 3 rooms apartments"
    C4 = "average price (NIS) 4+ rooms apartments"
    buckets = {}  # code -> {3: [(w, ppsm)], 4: [(w, ppsm)]}

    with open(_CSV, encoding="windows-1255", newline="") as f:
        for row in csv.DictReader(f):
            code = int(row["Lamas_code"])
            try:
                year = int(row["year"])
            except (ValueError, KeyError):
                continue
            w = math.exp(_DECAY * (year - _BASE_YEAR))
            b = buckets.setdefault(code, {3: [], 4: []})
            try:
                v = float(row[C3])
                if v > 0:
                    b[3].append((w, v / _SQM_3))
            except (ValueError, KeyError):
                pass
            try:
                v = float(row[C4])
                if v > 0:
                    b[4].append((w, v / _SQM_4))
            except (ValueError, KeyError):
                pass

    def wavg(pairs):
        if not pairs:
            return None
        ws = sum(w for w, _ in pairs)
        return sum(w * v for w, v in pairs) / ws

    profiles = {}
    for code, b in buckets.items():
        p3 = wavg(b[3])
        p4 = wavg(b[4])
        if p3 is None and p4 is None:
            continue
        if p3 is None:
            p3 = p4 * (_SQM_4 / _SQM_3) * 0.90
        if p4 is None:
            p4 = p3 * (_SQM_3 / _SQM_4) * 1.08
        profiles[code] = (p3, p4)

    all_vals = [v for p3, p4 in profiles.values() for v in (p3, p4)]
    all_vals.sort()
    national = all_vals[len(all_vals) // 2] if all_vals else 18_000.0
    return profiles, national


_profiles, _national_ppsm = _load_profiles()


def _predict(city_code, rooms, size, parking, balconies):
    pair = _profiles.get(city_code)
    if pair:
        ppsm3, ppsm4 = pair
    else:
        ppsm3 = ppsm4 = _national_ppsm
    slope = ppsm4 - ppsm3
    ppsm = ppsm3 + slope * (rooms - 3.0)
    mid = (ppsm3 + ppsm4) / 2
    ppsm = max(mid * 0.70, min(mid * 1.50, ppsm))
    return max(size * ppsm + parking * _PARKING_BONUS + balconies * _BALCONY_BONUS, 100_000.0)


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
            price = _predict(int(city_code), float(rooms), float(size), parking, balconies)
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
