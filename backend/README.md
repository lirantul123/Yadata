# Yadata Backend
The backend provides a REST API to predict apartment/house prices using a Python ML model. Built with Node.js, Express, and TypeScript.

---

## Running the Backend

1. Install dependencies:
```bash
npm install
```
2. Run in development mode:
```bash
npm run dev
```
#### Server runs on http://localhost:3000


### Example API Request
POST /api/predict
```bash
{
  "size": 80,
  "location": 1,
  "rooms": 3,
  "age": 10,
  "parking": 1
}
```

### Example Response
```bash
{
  "price": 250000
}
```
