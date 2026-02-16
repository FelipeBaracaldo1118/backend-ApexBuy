import "./config/env.js"; // ✅ Carga variables de entorno primero

import express from "express";
import cors from "cors";
import { pool } from "./config/database.js";
import analysisRoutes from "./routes/analysis.js"
import updateRoutes from "./routes/update.js"
const app = express();

// =============================
// Middlewares
// =============================
app.use(cors());
app.use(express.json());
app.use("/api/update", updateRoutes)
app.use("/api/analysis", analysisRoutes)

// =============================
// Test conexión DB
// =============================
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ error al conectarse a la base de datos", err);
  } else {
    console.log("✅ Conectado a la base de datos:", res.rows);
  }
});

// =============================
// Routes
// =============================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ApexBuy backend running",
  });
});

// =============================
// Server
// =============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

