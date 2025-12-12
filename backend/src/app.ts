import express from "express";
import cors from "cors";
import predictRoute from "./predict/routes/predictRoute";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", predictRoute);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
