import { pool } from "../config/database.js";

// Asunción: el costo real de adquisición es el 75% del precio del proveedor.
// Ajustar este valor si se obtienen costos reales de facturación.
const SUPPLIER_COST_RATIO = 0.75;

export async function getProductAnalysis(productId) {

  // Traer el precio más reciente por cada fuente (DISTINCT ON evita
  // traer todo el historial y filtrar en JS).
  // Ahora incluimos s.role y s.type desde la tabla sources.
  const result = await pool.query(`
    SELECT DISTINCT ON (p.source_id)
      p.price,
      p.available,
      p.created_at,
      s.name  AS source_name,
      s.id    AS source_id,
      s.role  AS source_role,
      s.type  AS source_type
    FROM prices p
    JOIN sources s ON s.id = p.source_id
    WHERE p.product_id = $1
    ORDER BY p.source_id, p.created_at DESC
  `, [productId]);

  if (result.rows.length === 0) {
    return null;
  }

  // ── Separar fuentes usando sources.role (provider vs competitor) ─────────
  const supplierRows   = result.rows.filter(r => r.source_role === "provider");
  const competitorRows = result.rows.filter(r => r.source_role === "competitor");

  // ── Precios del proveedor ────────────────────────────────────────────────
  // Si hay varios proveedores (Bose + Samsung en el mismo producto),
  // usamos el más bajo como referencia de costo.
  const supplierPrices = supplierRows.map(r => parseFloat(r.price));
  const supplierPrice  = supplierPrices.length > 0
    ? Math.min(...supplierPrices)
    : null;

  const supplierCost = supplierPrice !== null
    ? parseFloat((supplierPrice * SUPPLIER_COST_RATIO).toFixed(2))
    : null;

  // ── Precios de la competencia ────────────────────────────────────────────
  const competitorPrices = competitorRows.map(r => parseFloat(r.price));

  const competitorMin = competitorPrices.length > 0
    ? Math.min(...competitorPrices)
    : null;

  const competitorMax = competitorPrices.length > 0
    ? Math.max(...competitorPrices)
    : null;

  const competitorAvg = competitorPrices.length > 0
    ? parseFloat(
        (competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length).toFixed(2)
      )
    : null;

  // ── Margen y oportunidad ─────────────────────────────────────────────────
  // Solo calculamos si tenemos ambos lados (proveedor + al menos un competidor).
  let profit            = null;
  let marginPercentage  = null;
  let opportunity       = null;

  if (supplierCost !== null && competitorAvg !== null) {
    profit           = parseFloat((competitorAvg - supplierCost).toFixed(2));
    marginPercentage = parseFloat(((profit / competitorAvg) * 100).toFixed(2));

    if (marginPercentage > 20)      opportunity = "ALTA";
    else if (marginPercentage > 10) opportunity = "MEDIA";
    else                            opportunity = "BAJA";
  }

  // ── Detalle por fuente (útil para el dashboard) ──────────────────────────
  const sourceBreakdown = result.rows.map(r => ({
    source:    r.source_name,
    type:      r.source_role,  // 'provider' o 'competitor' desde la DB
    method:    r.source_type,  // 'api' o 'scraping' desde la DB
    price:     parseFloat(r.price),
    available: r.available,
    updatedAt: r.created_at,
  }));

  // ── Status del análisis ──────────────────────────────────────────────────
  // Permite que el endpoint responda parcialmente mientras se integran
  // las fuentes pendientes (Samsung, Ktronix, Mansion).
  let status = "complete";
  if (supplierRows.length === 0)   status = "missing_supplier";
  else if (competitorRows.length === 0) status = "missing_competitor";

  return {
    status,
    supplierPrice,
    supplierCost,
    competitor: {
      min: competitorMin,
      max: competitorMax,
      avg: competitorAvg,
    },
    profit,
    marginPercentage,
    opportunity,
    sourceBreakdown,
  };
}