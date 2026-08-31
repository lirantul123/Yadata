from http.server import BaseHTTPRequestHandler
import json
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

_CSV = os.path.join(os.path.dirname(__file__), "real_estate.csv")


class _Model:
    def __init__(self):
        df = pd.read_csv(_CSV, encoding="windows-1255")
        p3, p4 = {}, {}
        for _, row in df.iterrows():
            code = int(row["Lamas_code"])
            c3 = "average price (NIS) 3 rooms apartments"
            c4 = "average price (NIS) 4+ rooms apartments"
            if pd.notna(row[c3]):
                p3.setdefault(code, []).append(float(row[c3]))
            if pd.notna(row[c4]):
                p4.setdefault(code, []).append(float(row[c4]))
        self._a3 = {c: float(np.mean(v)) for c, v in p3.items()}
        self._a4 = {c: float(np.mean(v)) for c, v in p4.items()}
        all3 = [v for vs in p3.values() for v in vs]
        all4 = [v for vs in p4.values() for v in vs]
        self._g3 = float(np.mean(all3))
        self._g4 = float(np.mean(all4))
        self._gm = float(np.mean(list(CITY_MULTIPLIER.values())))

    def predict(self, city_code, rooms, size, parking, balconies):
        small = rooms <= 3.5
        if small:
            base = self._a3.get(city_code) or self._g3 * CITY_MULTIPLIER.get(city_code, self._gm)
            ref = 75.0
        else:
            base = self._a4.get(city_code) or self._g4 * CITY_MULTIPLIER.get(city_code, self._gm)
            ref = 110.0
        size_f = (size / ref) ** 0.75
        room_f = 1.0 + (rooms - (3.0 if small else 4.0)) * 0.12
        extras = 1.0 + parking * 0.07 + balconies * 0.04
        return max(base * size_f * room_f * extras, 150_000.0)


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
