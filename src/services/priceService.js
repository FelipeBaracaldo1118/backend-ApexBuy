import { pool } from "../config/database.js";

export async function savePrice(productId, sourceId, price, available = true) {
  const result = await pool.query(
    `INSERT INTO prices (product_id, source_id, price, available, created_at) 
     VALUES ($1, $2, $3, $4, NOW()) 
     RETURNING *`,
    [productId, sourceId, price, available]
  );
  
  return result.rows[0];
}