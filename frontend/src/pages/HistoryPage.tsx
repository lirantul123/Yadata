import {
  Box, Button, Container, Paper, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, Link,
} from "@mui/material";
import { useState } from "react";
import { getHistory, clearHistory } from "../utils/history";

export default function HistoryPage() {
  const [entries, setEntries] = useState(() => getHistory());

  const handleClear = () => {
    clearHistory();
    setEntries([]);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #d0e8f2, #f0f7f4)",
        py: 8,
      }}
    >
      <Container maxWidth="md">
        <Paper sx={{ p: 4, borderRadius: 4, boxShadow: "0 25px 50px rgba(0,0,0,0.1)" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700} color="primary">
              Prediction History
            </Typography>
            <Link href="/" underline="hover" sx={{ color: "#00796b", fontSize: 14 }}>
              ← Back to predictor
            </Link>
          </Box>

          {entries.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Typography variant="h6" color="text.secondary">
                No predictions yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Make a prediction and it will appear here.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>City</strong></TableCell>
                      <TableCell align="right"><strong>Rooms</strong></TableCell>
                      <TableCell align="right"><strong>Size (m²)</strong></TableCell>
                      <TableCell align="right"><strong>Parking</strong></TableCell>
                      <TableCell align="right"><strong>Balconies</strong></TableCell>
                      <TableCell align="right"><strong>Price (₪)</strong></TableCell>
                      <TableCell align="right"><strong>Date</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell>{e.cityName}</TableCell>
                        <TableCell align="right">{e.rooms}</TableCell>
                        <TableCell align="right">{e.size}</TableCell>
                        <TableCell align="right">{e.parking}</TableCell>
                        <TableCell align="right">{e.balconies}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "#00796b" }}>
                          ₪ {Math.round(e.price).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "text.secondary", fontSize: 12 }}>
                          {new Date(e.createdAt).toLocaleDateString("en-IL")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Box textAlign="right" mt={2}>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={handleClear}
                >
                  Clear history
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
