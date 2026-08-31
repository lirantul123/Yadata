from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from model import PriceModel

app = FastAPI(title="Yadata ML Service")
_model = PriceModel()


class PredictRequest(BaseModel):
    cityCode: int = Field(..., gt=0)
    rooms: float = Field(..., ge=1, le=15)
    size: float = Field(..., ge=20, le=500)
    parking: int = Field(0, ge=0, le=2)
    balconies: int = Field(0, ge=0, le=5)


class PredictResponse(BaseModel):
    price: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    try:
        price = _model.predict(
            city_code=body.cityCode,
            rooms=body.rooms,
            size=body.size,
            parking=body.parking,
            balconies=body.balconies,
        )
        return PredictResponse(price=price)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
