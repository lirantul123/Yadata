# Yadata - Apartment Price Prediction App

Yadata is a web application that predicts the price of an apartment or house based on user input. Users enter property details, and the system returns an estimated price using a Python ML model running on a Node.js/Express backend.

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Yadata
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```

#### The backend server runs on http://localhost:3000

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### The frontend runs on http://localhost:5173


## Using the App

#### A.  Open the frontend in your browser.

#### B. Fill in property details:

* Size (m²)

* Location

* Number of rooms

* Age of the property

* Parking availability

#### C. Click Predict.

#### D. View the estimated property price.


## Future Improvements

* Integrate a fully trained Python ML model for more accurate predictions.

* Add additional property features such as:

   * Balcony

   * Storage

   * Furnished

   * Security features

* Implement user authentication and property history tracking.

* Prepare production deployment using Docker, Kubernetes, or OpenShift.

* Improve UI/UX and overall user experience.
