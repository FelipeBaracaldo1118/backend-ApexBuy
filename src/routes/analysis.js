
import express from "express";
import { 
  
  getProductAnalysis, 
  getProductGroupAnalysis,
  getOpportunities,
  getOpportunitiesFiltered,
  getPriceHistory,
  detectPriceChanges,
  getGlobalStats
} from "../services/analysisService.js";

const router = express.Router();



/**
 GET /api/analysis/product/:productId
 Análisis detallado de un producto individual
 Incluye desglose por fuente y cálculos de margen
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
 GET /api/analysis/group/:groupId
 Análisis de un grupo de productos
 Compara proveedores vs competidores para todo el grupo
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
    console.error(" Error en análisis de grupo:", error);
    res.status(500).json({ 
      error: "Error generando análisis.",
      details: error.message,
    });
  }
});

/**
 GET /api/analysis/group/:groupId/supplier-vs-competitor
 Comparativa detallada proveedor vs competencia
 Incluye gap analysis y recomendaciones
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

    // Si falta proveedor o competidor, retornar 202 (Accepted pero incompleto)
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

    // Calcular gap (diferencia de precios)
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
    res.status(500).json({ 
      error: "Error generando comparativa.",
      details: error.message 
    });
  }
});


/**
 GET /api/analysis/opportunities
 Obtener TODAS las oportunidades de negocio ordenadas por ganancia
 
 Se decidio por funciones SQL para mejorar el performance de la app
  Retorna: producto, precio_compra, precio_competencia, ganancia, margen, decisión
 */
router.get('/opportunities', async (req, res) => {
  try {
    const opportunities = await getOpportunities();
    res.json(opportunities);
  } catch (error) {
    console.error('❌ Error en /opportunities:', error);
    res.status(500).json({ 
      error: 'Error obteniendo oportunidades',
      details: error.message 
    });
  }
});

/**
  GET /api/analysis/opportunities/filtered
 Filtrar oportunidades por criterios específicos
 
 Query params:
 - minMargin: número (ej: 20 para filtrar >= 20% margen)
 - minGanancia: número (ej: 500000 para filtrar >= $500,000 ganancia)
 - decision: string ("OPORTUNIDAD" o "NO CONVIENE")
 
 */
router.get('/opportunities/filtered', async (req, res) => {
  try {
    const { minMargin, minGanancia, decision } = req.query;
    
    const filters = {};
    if (minMargin) filters.minMargin = parseFloat(minMargin);
    if (minGanancia) filters.minGanancia = parseInt(minGanancia);
    if (decision) filters.decision = decision;
    
    const opportunities = await getOpportunitiesFiltered(filters);
    res.json(opportunities);
  } catch (error) {
    console.error('❌ Error en /opportunities/filtered:', error);
    res.status(500).json({ 
      error: 'Error filtrando oportunidades',
      details: error.message 
    });
  }
});

/**
 GET /api/analysis/product/:productId/history
 Historial completo de precios de un producto
 
 * Query params:
 -limit: número de registros a retornar (default: 30)
 
 
 */
router.get('/product/:productId/history', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit } = req.query;
    
    const history = await getPriceHistory(
      productId, 
      limit ? parseInt(limit) : 30
    );
    
    res.json(history);
  } catch (error) {
    console.error('Error en /product/:productId/history:', error);
    res.status(500).json({ 
      error: 'Error obteniendo historial',
      details: error.message 
    });
  }
});

/**
 GET /api/analysis/product/:productId/changes
 Detectar cambios significativos de precio
 
 Query params, el teshold es basicamente el valor por el cual va a haber  un cambio:
 - threshold: porcentaje mínimo de cambio (default: 5)
  
  
 */
router.get('/product/:productId/changes', async (req, res) => {
  try {
    const { productId } = req.params;
    const { threshold } = req.query;
    
    const changes = await detectPriceChanges(
      productId,
      threshold ? parseFloat(threshold) : 5
    );
    
    res.json(changes);
  } catch (error) {
    console.error('Error en /product/:productId/changes:', error);
    res.status(500).json({ 
      error: 'Error detectando cambios',
      details: error.message 
    });
  }
});

/**
  GET /api/analysis/stats
 ⭐ Estadísticas generales del sistema
 
 Retorna:
 - Total de productos
 - Total de fuentes
 - Total de grupos
 - Total de registros de precios
- Cantidad de oportunidades
 - Cantidad de "no conviene"
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getGlobalStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Error en /stats:', error);
    res.status(500).json({ 
      error: 'Error obteniendo estadísticas',
      details: error.message 
    });
  }
});


export default router;