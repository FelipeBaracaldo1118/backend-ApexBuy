import { pool } from "../config/database.js";

/**
 * Busca un producto por su ID externo (ID del proveedor)
 */
export async function getProductByExternalId(externalId) {
  const result = await pool.query(
    `
    SELECT id, name
    FROM products
    WHERE external_id = $1
    `,
    [externalId]
  );

  return result.rows[0]; // devuelve { id, name } o undefined
}