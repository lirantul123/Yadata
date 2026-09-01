# Yadata — Israeli Property Price Estimator

Yadata estimates apartment prices across Israeli cities using real CBS (Central Bureau of Statistics) transaction data. Predictions run entirely in the browser — no backend, no cold starts.

Live: **[yadata.vercel.app](https://yadata.vercel.app)**

---

## How the Pricing Model Works

### Data Source

The model is built on **Israel CBS housing price survey data** (2017–2025), which publishes average transaction prices by city and room category (3-room and 4+-room apartments). This is the most complete freely available aggregate dataset for Israeli residential real estate.

The raw data lives in `api/real_estate.csv` (Windows-1255 Hebrew encoding, ~35 cities, ~231 rows).

### Training: City Price Profiles

At build time, `api/real_estate.csv` is preprocessed into `frontend/src/data/cityProfiles.json`. For each city the script computes two **exponentially time-weighted** price-per-m² anchors:

| Anchor | Room category | Assumed avg size | Weight |
|--------|--------------|-----------------|--------|
| `ppsm3` | 3-room unit | 75 m² | 2025 row weighs ~8× more than 2017 row |
| `ppsm4` | 4+-room unit | 100 m² | same decay (λ = 0.35/year) |

Recency weighting formula: `w = e^(0.35 × (year − 2017))`

This means 2025 data contributes ~8× more than 2017 data, keeping predictions anchored to current market prices.

### Inference: How a Price is Computed

Given user inputs (city, rooms, size, floor, building age, parking, balconies):

1. **City price-per-m²** — linearly interpolate between `ppsm3` and `ppsm4` at the requested room count. Cities not in the dataset fall back to the national median.

2. **Small apartment correction** — Israeli studios and 1–2 room units command a higher price-per-m² than the 3-room baseline (investor demand). A correction factor is applied: 1-room × 1.18, 2-room × 1.04.

3. **Base price** = `size × adjusted_ppsm`

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

If the CSV is updated, regenerate the JSON:

```bash
python3 -c "
import csv, json, math

SQM_3, SQM_4 = 75.0, 100.0
DECAY, BASE = 0.35, 2017
C3 = 'average price (NIS) 3 rooms apartments'
C4 = 'average price (NIS) 4+ rooms apartments'
buckets = {}

with open('api/real_estate.csv', encoding='windows-1255') as f:
    for row in csv.DictReader(f):
        code, year = int(row['Lamas_code']), int(row['year'])
        w = math.exp(DECAY * (year - BASE))
        b = buckets.setdefault(code, {'3': [], '4': []})
        try:
            v = float(row[C3])
            if v > 0: b['3'].append([w, v / SQM_3])
        except: pass
        try:
            v = float(row[C4])
            if v > 0: b['4'].append([w, v / SQM_4])
        except: pass

def wavg(pairs):
    ws = sum(w for w,_ in pairs)
    return sum(w*v for w,v in pairs) / ws if pairs else None

profiles = {}
for code, b in buckets.items():
    p3, p4 = wavg(b['3']), wavg(b['4'])
    if not p3 and not p4: continue
    p3 = p3 or p4 * (SQM_4/SQM_3) * 0.90
    p4 = p4 or p3 * (SQM_3/SQM_4) * 1.08
    profiles[str(code)] = [round(p3, 2), round(p4, 2)]

vals = sorted(v for p3,p4 in profiles.values() for v in (p3,p4))
national = vals[len(vals)//2]
with open('frontend/src/data/cityProfiles.json', 'w') as f:
    json.dump({'profiles': profiles, 'nationalPpsm': round(national, 2)}, f, indent=2)
print(f'Done: {len(profiles)} cities')
"
```
