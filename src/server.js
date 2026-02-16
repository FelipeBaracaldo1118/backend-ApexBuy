import "./config/env.js"; // ✅ Carga variables de entorno primero

import express from "express";
import cors from "cors";
import { pool } from "./config/database.js";

const app = express();

// =============================
// Middlewares
// =============================
app.use(cors());
app.use(express.json());

// =============================
// Test conexión DB
// =============================
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection error:", err);
  } else {
    console.log("✅ Database connected:", res.rows);
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