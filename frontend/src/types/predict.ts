export interface PredictRequest {
  size: number;
  cityCode: number;
  rooms: number;
  parking: number;
  balconies: number;
}

export interface PredictResponse {
  price: number;
}
