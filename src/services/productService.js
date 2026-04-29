import { pool } from "../config/database.js";

/**
 * Buscar producto por external_id Y source_id
 * Cada fuente tiene su propio registro del mismo producto
 */
export const getProductByExternalIdAndSource = async (externalId, sourceId) => {
  const result = await pool.query(
    `SELECT * FROM products WHERE external_id = $1 AND source_id = $2 LIMIT 1;`,
    [externalId, sourceId]
  );
  return result.rows[0] || null;
};

/**
 * Buscar producto por external_id sin importar la fuente (fallback)
 */
export const getProductByExternalId = async (externalId) => {
  const result = await pool.query(
    `SELECT * FROM products WHERE external_id = $1 LIMIT 1;`,
    [externalId]
  );
  return result.rows[0] || null;
};

/**
 * Crear producto nuevo incluyendo source_id
 */
export const createProduct = async (data, sourceId) => {
  try {
    const result = await pool.query(
      `INSERT INTO products (name, external_id, brand, image, source_id, handle)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [
        data.title,
        data.external_id,
        data.brand || data.vendor,
        data.image,
        sourceId,
        data.source_url || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      return await getProductByExternalIdAndSource(data.external_id, sourceId)
          || await getProductByExternalId(data.external_id);
    }
    throw error;
  }
};

/**
 * Obtener producto o crearlo — diferencia por fuente
 */
export const getOrCreateProduct = async (data, sourceId) => {
  if (sourceId) {
    let product = await getProductByExternalIdAndSource(data.external_id, sourceId);
    if (!product) {
      console.log("🆕 Producto no existe para esta fuente, creando...");
      product = await createProduct(data, sourceId);
    }
    return product;
  }

  // Fallback sin sourceId
  let product = await getProductByExternalId(data.external_id);
  if (!product) {
    console.log("🆕 Producto no existe, creando...");
    product = await createProduct(data, null);
  }
  return product;
};