import express from "express";
import { getProductAnalysis } from "../services/analysisService.js";

const router = express.Router();

router.get("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const analysis = await getProductAnalysis(productId);

    if (!analysis) {
      return res.status(404).json({
        error: "No hay suficientes datos para análisis",
      });
    }

    res.json(analysis);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error generating analysis",
    });
  }
});

export default router;