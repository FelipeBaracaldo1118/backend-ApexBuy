import express from "express";
import { getProductAnalysis, getProductGroupAnalysis } from "../services/analysisService.js";

const router = express.Router();

/**
 * GET /api/analysis/product/:productId
 * Análisis de un producto individual (legacy)
 */
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const analysis = await getProductAnalysis(productId);

    if (!analysis) {
      return res.status(404).json({
        error: "No se encontraron precios para este producto.",
      });
    }

    res.json(analysis);

  } catch (error) {
    console.error("❌ Error en análisis de producto:", error);
    res.status(500).json({ 
      error: "Error generando análisis.",
      details: error.message,
    });
  }
});

/**
 * GET /api/analysis/group/:groupId
 * Análisis de un grupo de productos (compara proveedores vs competidores)
 */
router.get("/group/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const analysis = await getProductGroupAnalysis(groupId);

    if (!analysis) {
      return res.status(404).json({
        error: "No se encontraron productos en este grupo.",
      });
    }

    res.json(analysis);

  } catch (error) {
    console.error("❌ Error en análisis de grupo:", error);
    res.status(500).json({ 
      error: "Error generando análisis.",
      details: error.message,
    });
  }
});

/**
 * GET /api/analysis/group/:groupId/supplier-vs-competitor
 * Comparativa detallada proveedor vs competencia
 */
router.get("/group/:groupId/supplier-vs-competitor", async (req, res) => {
  try {
    const { groupId } = req.params;
    const analysis = await getProductGroupAnalysis(groupId);

    if (!analysis) {
      return res.status(404).json({
        error: "No se encontraron productos en este grupo.",
      });
    }

    if (analysis.status !== "complete") {
      return res.status(202).json({
        status:  analysis.status,
        message: analysis.status === "missing_competitor"
          ? "Aún no hay precios de competidores registrados."
          : "No hay precios de proveedor registrados.",
        partial: analysis.sourceBreakdown,
      });
    }

    // Separar proveedores y competidores
    const suppliers    = analysis.sourceBreakdown.filter(s => s.type === "provider");
    const competitors  = analysis.sourceBreakdown.filter(s => s.type === "competitor");

    // Calcular gap
    const gap = {
      vsMin: analysis.supplierPrice - analysis.competitor.min,
      vsAvg: analysis.supplierPrice - analysis.competitor.avg,
      vsMax: analysis.supplierPrice - analysis.competitor.max,
    };

    res.json({
      group_id: groupId,
      suppliers: suppliers.map(s => ({
        productName: s.productName,
        source:      s.source,
        price:       s.price,
        available:   s.available,
        method:      s.method,
      })),
      competitors: competitors.map(c => ({
        productName: c.productName,
        source:      c.source,
        price:       c.price,
        available:   c.available,
        method:      c.method,
      })),
      summary: {
        supplierPrice:     analysis.supplierPrice,
        supplierCost:      analysis.supplierCost,
        competitorMin:     analysis.competitor.min,
        competitorMax:     analysis.competitor.max,
        competitorAvg:     analysis.competitor.avg,
      },
      gap,
      profit:            analysis.profit,
      marginPercentage:  analysis.marginPercentage,
      opportunity:       analysis.opportunity,
    });

  } catch (error) {
    console.error("❌ Error en supplier-vs-competitor:", error);
    res.status(500).json({ error: "Error generando comparativa." });
  }
});

export default router;