import express from "express";
import {
  updateBoseProducts,
  updateSingleBoseProduct
} from "../services/updateService.js";

const router = express.Router();

/**
Actualizar TODOS los productos Bose
 GET /api/update/bose
 */
router.get("/bose", async (req, res) => {
  try {
    const result = await updateBoseProducts();
    res.json(result);

  } catch (error) {
    console.error("❌ Error update Bose:", error);
    res.status(500).json({ error: error.message });
  }
});


/**
 Actualizar UN producto Bose
 GET /api/update/bose/:handle
 */
router.get("/bose/:handle", async (req, res) => {
  try {
    const { handle } = req.params;

    const result = await updateSingleBoseProduct(handle);

    res.json(result);

  } catch (error) {
    console.error("❌ Error update Bose:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;