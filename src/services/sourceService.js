import { pool } from "../config/database.js";

export const getSourceByName = async (name) => {
  const result = await pool.query(
    "SELECT id FROM sources WHERE name = $1",
    [name]
  );

  return result.rows[0];
};