import express from "express";
import { getProductAnalysis } from "../services/analysisService.js";

const router = express.Router();

/**
 * GET /api/analysis/:productId
 *
 * Análisis completo de un producto.
 * Responde aunque falten fuentes (status: "missing_competitor", etc.)
 *
 * Ejemplo: GET /api/analysis/uuid-del-producto
 */
router.get("/:productId", async (req, res) => {
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
    console.error("❌ Error en análisis:", error);
    res.status(500).json({ 
      error: "Error generando análisis.",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


/**
 * GET /api/analysis/:productId/supplier-vs-competitor
 *
 * Comparativa directa proveedor vs competencia.
 * Diseñado para alimentar el dashboard con el dato clave:
 * ¿Estamos por encima o por debajo del mercado?
 *
 * Respuesta de ejemplo:
 * {
 *   product_id: "uuid",
 *   supplier: { name: "Bose", price: 299 },
 *   competitors: [
 *     { name: "Ktronix",  price: 329 },
 *     { name: "Mansion",  price: 349 }
 *   ],
 *   market: { min: 329, max: 349, avg: 339 },
 *   gap: { vsMin: -30, vsAvg: -40 },   // negativo = proveedor más barato
 *   opportunity: "ALTA",
 *   marginPercentage: 23.5
 * }
 */
router.get("/:productId/supplier-vs-competitor", async (req, res) => {
  try {
    const { productId } = req.params;

    const analysis = await getProductAnalysis(productId);

    if (!analysis) {
      return res.status(404).json({
        error: "No se encontraron precios para este producto.",
      });
    }

    // Si no hay suficientes datos para comparar, explicar qué falta
    if (analysis.status !== "complete") {
      return res.status(202).json({
        status:  analysis.status,
        message: analysis.status === "missing_competitor"
          ? "Aún no hay precios de competidores registrados. Integra Ktronix o Mansion para activar esta comparativa."
          : "No hay precios de proveedor registrados para este producto.",
        partial: analysis.sourceBreakdown,
      });
    }

    // Separar proveedor y competidores del breakdown
    const supplierEntry    = analysis.sourceBreakdown.find(s => s.type === "supplier");
    const competitorEntries = analysis.sourceBreakdown.filter(s => s.type === "competitor");

    // Calcular gap: qué tan lejos está el proveedor del mercado
    const gap = {
      vsMin: analysis.supplierPrice - analysis.competitor.min,
      vsAvg: analysis.supplierPrice - analysis.competitor.avg,
      vsMax: analysis.supplierPrice - analysis.competitor.max,
    };

    res.json({
      product_id: productId,
      supplier: {
        name:  supplierEntry.source,
        price: analysis.supplierPrice,
        cost:  analysis.supplierCost,
      },
      competitors: competitorEntries.map(c => ({
        name:      c.source,
        price:     c.price,
        available: c.available,
      })),
      market: analysis.competitor,
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