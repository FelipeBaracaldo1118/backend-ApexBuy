import { pool } from "../config/database.js";

export async function getProductAnalysis(productId) {

  // traer precios del producto
  const result = await pool.query(`
    SELECT 
      p.price,
      s.name AS source_name
    FROM prices p
    JOIN sources s ON s.id = p.source_id
    WHERE p.product_id = $1
    ORDER BY p.created_at DESC
  `, [productId]);

  if (result.rows.length === 0) {
    return null;
  }

  // identificar proveedor y competencia
  const supplier = result.rows.find(
    r => r.source_name === "Bose" || r.source_name === "Samsung"
  );

  const competitor = result.rows.find(
    r => r.source_name === "Ktronix" || r.source_name === "Mansion"
  );

  if (!supplier || !competitor) {
    return null;
  }

  // cálculos
  const supplierPrice = supplier.price;
  const competitorPrice = competitor.price;

  const supplierCost = supplierPrice * 0.75;
  const profit = competitorPrice - supplierCost;

  // clasificar oportunidad
  let opportunity = "BAJA";

  const marginPercentage = (profit / competitorPrice) * 100;

  if (marginPercentage > 20) opportunity = "ALTA";
  else if (marginPercentage > 10) opportunity = "MEDIA";

  return {
    supplierPrice,
    supplierCost,
    competitorPrice,
    profit,
    marginPercentage,
    opportunity
  };
}