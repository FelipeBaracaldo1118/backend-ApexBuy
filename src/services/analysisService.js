import { pool } from "../config/database.js";

// el costo real de adquisición es el 75% del precio del proveedor.
// Ajustar este valor si se obtienen costos reales de facturación.
const SUPPLIER_COST_RATIO = 0.75;

/**
 * Obtener análisis por product_group_id
 * Compara precios de todos los productos vinculados al grupo
 */
export async function getProductGroupAnalysis(productGroupId) {

  // Traer el precio más reciente de cada producto en el grupo
  const result = await pool.query(`
    SELECT DISTINCT ON (p.id)
      p.id          AS product_id,
      p.name        AS product_name,
      pr.price,
      pr.available,
      pr.created_at AS price_date,
      s.name        AS source_name,
      s.id          AS source_id,
      s.role        AS source_role,
      s.type        AS source_type
    FROM products p
    JOIN prices pr ON pr.product_id = p.id
    JOIN sources s ON s.id = p.source_id
    WHERE p.product_group_id = $1
    ORDER BY p.id, pr.created_at DESC
  `, [productGroupId]);

  if (result.rows.length === 0) {
    return null;
  }

  // ── Separar fuentes usando sources.role (provider vs competitor) ─────────
  const supplierRows   = result.rows.filter(r => r.source_role === "provider");
  const competitorRows = result.rows.filter(r => r.source_role === "competitor");

  // ── Precios del proveedor ────────────────────────────────────────────────
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

  // ── Detalle por fuente ────────────────────────────────────────────────────
  const sourceBreakdown = result.rows.map(r => ({
    productId:  r.product_id,
    productName: r.product_name,
    source:     r.source_name,
    type:       r.source_role,  // 'provider' o 'competitor'
    method:     r.source_type,  // 'api' o 'scraping'
    price:      parseFloat(r.price),
    available:  r.available,
    updatedAt:  r.price_date,
  }));

  // ── Status del análisis ───────────────────────────────────────────────────
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

/**
 * Análisis legacy por product_id individual (mantener compatibilidad)
 * Solo analiza el historial de precios de ese producto específico
 */
export async function getProductAnalysis(productId) {

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

  // El resto del código es igual al anterior analysisService
  const supplierRows   = result.rows.filter(r => r.source_role === "provider");
  const competitorRows = result.rows.filter(r => r.source_role === "competitor");

  const supplierPrices = supplierRows.map(r => parseFloat(r.price));
  const supplierPrice  = supplierPrices.length > 0
    ? Math.min(...supplierPrices)
    : null;

  const supplierCost = supplierPrice !== null
    ? parseFloat((supplierPrice * SUPPLIER_COST_RATIO).toFixed(2))
    : null;

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

  const sourceBreakdown = result.rows.map(r => ({
    source:    r.source_name,
    type:      r.source_role,
    method:    r.source_type,
    price:     parseFloat(r.price),
    available: r.available,
    updatedAt: r.created_at,
  }));

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