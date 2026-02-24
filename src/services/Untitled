import { pool } from "../config/database.js";

/**
 * Crear un nuevo grupo de productos
 */
export async function createProductGroup({ name, description = null, category = null }) {
  const result = await pool.query(
    `INSERT INTO product_groups (name, description, category)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, description, category]
  );
  return result.rows[0];
}

/**
 * Obtener un grupo por ID
 */
export async function getProductGroupById(groupId) {
  const result = await pool.query(
    `SELECT * FROM product_groups WHERE id = $1`,
    [groupId]
  );
  return result.rows[0] || null;
}

/**
 * Obtener todos los productos de un grupo
 */
export async function getProductsByGroup(groupId) {
  const result = await pool.query(
    `SELECT 
       p.*,
       s.name AS source_name,
       s.role AS source_role,
       s.type AS source_type
     FROM products p
     JOIN sources s ON s.id = p.source_id
     WHERE p.product_group_id = $1
     ORDER BY s.role, s.name`,
    [groupId]
  );
  return result.rows;
}

/**
 * Vincular un producto existente a un grupo
 */
export async function linkProductToGroup(productId, groupId) {
  const result = await pool.query(
    `UPDATE products 
     SET product_group_id = $1
     WHERE id = $2
     RETURNING *`,
    [groupId, productId]
  );
  return result.rows[0] || null;
}

/**
 * Vincular múltiples productos a un grupo (útil para setup inicial)
 */
export async function linkMultipleProductsToGroup(productIds, groupId) {
  const result = await pool.query(
    `UPDATE products 
     SET product_group_id = $1
     WHERE id = ANY($2::uuid[])
     RETURNING *`,
    [groupId, productIds]
  );
  return result.rows;
}

/**
 * Desvincular un producto de su grupo
 */
export async function unlinkProductFromGroup(productId) {
  const result = await pool.query(
    `UPDATE products 
     SET product_group_id = NULL
     WHERE id = $1
     RETURNING *`,
    [productId]
  );
  return result.rows[0] || null;
}

/**
 * Listar todos los grupos con conteo de productos
 */
export async function listAllGroups() {
  const result = await pool.query(
    `SELECT 
       pg.*,
       COUNT(p.id) AS product_count
     FROM product_groups pg
     LEFT JOIN products p ON p.product_group_id = pg.id
     GROUP BY pg.id
     ORDER BY pg.created_at DESC`
  );
  return result.rows;
}