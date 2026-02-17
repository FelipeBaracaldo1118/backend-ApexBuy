import { pool } from "../config/database.js";

/**
 * Buscar producto por external_id (id del proveedor)
 */
export const getProductByExternalId = async (externalId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM products
    WHERE external_id = $1
    LIMIT 1;
    `,
    [externalId]
  );

  return result.rows[0] || null;
};


/**
 * Crear producto nuevo
 */
export const createProduct = async (data) => {
  try {
    const result = await pool.query(
      `
      INSERT INTO products
      (name, external_id, brand, image)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
      [
        data.title,
        data.external_id,
        data.vendor,
        data.image,
      ]
    );

    return result.rows[0];

  } catch (error) {
    // Si otro proceso lo creó primero
    if (error.code === "23505") {
      return await getProductByExternalId(data.external_id);
    }
    throw error;
  }
};


/**
 * Obtener producto o crearlo automáticamente
 */
export const getOrCreateProduct = async (data) => {
  let product = await getProductByExternalId(data.external_id);

  if (!product) {
    console.log("🆕 Producto no existe, creando...");
    product = await createProduct(data);
  }

  return product;
};