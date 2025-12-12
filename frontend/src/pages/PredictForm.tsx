import { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  MenuItem,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { predictPrice } from "../api/predictApi";

function PredictForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    size: "",
    location: "",
    rooms: "",
    age: "",
    parking: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit() {
    const result = await predictPrice({
      size: Number(form.size),
      location: Number(form.location),
      rooms: Number(form.rooms),
      age: Number(form.age),
      parking: Number(form.parking),
    });

    navigate("/result", { state: result });
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Paper sx={{ p: 4 }} elevation={3}>
        <Typography variant="h4" mb={3}>
          Predict Apartment Price
        </Typography>

        <TextField
          fullWidth
          label="Size (m²)"
          name="size"
          value={form.size}
          onChange={handleChange}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Location"
          name="location"
          select
          value={form.location}
          onChange={handleChange}
          sx={{ mb: 2 }}
        >
          <MenuItem value={1}>Suburbs</MenuItem>
          <MenuItem value={2}>City Center</MenuItem>
        </TextField>

        <TextField
          fullWidth
          label="Rooms"
          name="rooms"
          type="number"
          value={form.rooms}
          onChange={handleChange}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Age (years)"
          name="age"
          type="number"
          value={form.age}
          onChange={handleChange}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Parking"
          name="parking"
          select
          value={form.parking}
          onChange={handleChange}
          sx={{ mb: 2 }}
        >
          <MenuItem value={1}>Yes</MenuItem>
          <MenuItem value={0}>No</MenuItem>
        </TextField>

        <Button variant="contained" fullWidth onClick={handleSubmit}>
          Predict
        </Button>
      </Paper>
    </Container>
  );
}

export default PredictForm;
