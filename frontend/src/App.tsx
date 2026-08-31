import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import PredictForm from "./pages/PredictForm";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<PredictForm />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </>
  );
}
