import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Container, Paper, Typography } from "@mui/material";

function ResultPage() {
  const navigate = useNavigate();
  const state = useLocation().state as { price: number };

  if (!state) return <div>No prediction data</div>;

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Paper sx={{ p: 4, textAlign: "center" }} elevation={3}>
        <Typography variant="h4">Estimated Price</Typography>

        <Typography variant="h3" color="primary" sx={{ mt: 3 }}>
          ₪ {state.price.toLocaleString()}
        </Typography>

        <Button
          variant="contained"
          sx={{ mt: 4 }}
          onClick={() => navigate("/")}
        >
          Make Another Prediction
        </Button>
      </Paper>
    </Container>
  );
}

export default ResultPage;
