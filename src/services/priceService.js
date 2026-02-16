import { pool } from "../config/database.js";

export async function savePrice(productId, sourceId, price){

    await pool.query(
        `INSERT INTO prices (product_id, source_id, price) VALUES ($1, $2, $3)`,
        [productId, sourceId, price]
    )
}