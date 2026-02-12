import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import {pool} from "./config/db.js";

pool.query("SELECT NOW()", (err, res) => {
  console.log(err,res?.rows)

})
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ApexBuy backend running" });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log(process.env.DATABASE_URL)