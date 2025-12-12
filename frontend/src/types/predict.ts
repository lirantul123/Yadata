export interface PredictRequest {
    size: number;
    location: number;
    rooms: number;
    age: number;
    parking: number;
  }
  
export interface PredictResponse {
    price: number;
}
