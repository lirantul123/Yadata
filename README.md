# Yadata — Israeli Property Price Estimator

Yadata estimates apartment prices across Israeli cities using real CBS (Central Bureau of Statistics) transaction data. Predictions run entirely in the browser — no backend, no cold starts.

Live: **[yadata.vercel.app](https://yadata.vercel.app)**

---

## How the Pricing Model Works

### Data Source

The model is built on **nadlan.gov.il** — the Israeli Tax Authority's official real estate transaction portal. City-level price profiles are fetched directly from `data.nadlan.gov.il/api/additional_info/settlements/{cityCode}.json`, which exposes current market statistics derived from registered apartment sale transactions.

Fields used: `buy3Rooms`, `buy4Rooms`, `buy5Rooms` (average transaction price per room category), and `SquareMeter` (city average price per m²). This is real Tax Authority data, not survey estimates.

### Training: City Price Profiles

At build time, a fetch script pulls `data.nadlan.gov.il/api/additional_info/settlements/{code}.json` for all 35 supported cities and writes `frontend/src/data/cityProfiles.json`. Each city entry contains three price-per-m² anchors:

| Anchor | Room category | Standard size | Formula |
|--------|--------------|--------------|---------|
| `ppsm3` | 3-room | 75 m² | `buy3Rooms / 75` |
| `ppsm4` | 4-room | 95 m² | `buy4Rooms / 95` |
| `ppsm5` | 5-room | 120 m² | `buy5Rooms / 120` |

### Inference: How a Price is Computed

Given user inputs (city, rooms, size, floor, building age, parking, balconies):

1. **City price-per-m²** — interpolate between the three room anchors (ppsm3/ppsm4/ppsm5) at the requested room count. For rooms outside the 3–5 range, extrapolation is dampened (0.6× slope below 3, 0.5× above 5). Cities not in the dataset fall back to the national median.

2. **Base price** = `size × ppsm`

4. **Floor premium** — each floor above ground adds ~1.4%, capped at 20% for high floors. Ground floor = 0 premium.

5. **Building age multiplier**:
   - New (2015+): × 1.09
   - Standard (2000–2015): × 1.00
   - Old (pre-2000): × 0.93

6. **Amenity bonuses** (absolute NIS, market-calibrated):
   - Parking spot: +₪55,000 each
   - Balcony: +₪28,000 each

7. **Confidence range**: ±12% shown in the UI, reflecting typical intra-city variance.

### Limitations

- City-level averages only — no neighborhood granularity (Neve Tzedek vs. Florentine would require individual transaction data from nadlan.gov.il)
- CBS data covers ~35 major cities; smaller localities fall back to the national median
- Predictions are estimates, not appraisals

---

## Quick Start

```bash
git clone https://github.com/lirantul123/Yadata
cd Yadata/frontend
npm install
npm run dev
# → http://localhost:5173
```

No backend needed — the model runs client-side.

---

## Project Structure

```
frontend/
  src/
    data/cityProfiles.json   # pre-computed city price profiles (generated from CSV)
    utils/priceModel.ts      # inference logic
    utils/cities.ts          # city name → CBS Lamas code mapping
    pages/PredictForm.tsx    # main prediction UI
    pages/HistoryPage.tsx    # localStorage prediction history
api/
  real_estate.csv            # raw CBS data (Windows-1255, Hebrew)
  predict.py                 # legacy Python reference implementation
```

---

## Regenerating City Profiles

Fetches live data from the nadlan.gov.il Tax Authority API (no authentication required):

```bash
python3 -c "
import urllib.request, json, time

BASE = 'https://data.nadlan.gov.il/api'
CITIES = [70,2600,2610,2630,2640,2660,3000,3780,3797,4000,5000,
          6100,6200,6300,6400,6500,6600,6800,6900,7000,7100,7200,
          7300,7400,7600,7700,7900,8300,8400,8500,8600,8700,9000,9100,9700]
SQM = {3:75.0, 4:95.0, 5:120.0}
profiles, all_ppsm = {}, []

for code in CITIES:
    req = urllib.request.Request(f'{BASE}/additional_info/settlements/{code}.json')
    req.add_header('User-Agent', 'Mozilla/5.0')
    with urllib.request.urlopen(req, timeout=20) as r:
        rei = json.loads(r.read()).get('RealEstateIndices', {})
    b3,b4,b5 = rei.get('buy3Rooms'),rei.get('buy4Rooms'),rei.get('buy5Rooms')
    if b3 and b4 and b5:
        p3,p4,p5 = b3/SQM[3], b4/SQM[4], b5/SQM[5]
        profiles[str(code)] = [round(p3,2), round(p4,2), round(p5,2)]
        all_ppsm.extend([p3,p4,p5])
    time.sleep(0.25)

all_ppsm.sort()
national = all_ppsm[len(all_ppsm)//2]
with open('frontend/src/data/cityProfiles.json','w') as f:
    json.dump({'profiles':profiles,'nationalPpsm':round(national,2),
               'source':'nadlan.gov.il Tax Authority'}, f, indent=2)
print(f'{len(profiles)} cities written, national median ₪{national:,.0f}/m2')
"
```
