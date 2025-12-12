import { Routes, Route } from "react-router-dom";
import PredictForm from "./pages/PredictForm";
import ResultPage from "./pages/ResultPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<PredictForm />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}

export default App;
