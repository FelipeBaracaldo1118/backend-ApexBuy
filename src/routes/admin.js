import express from "express";
import {
  createProductGroup,
  getProductGroupById,
  getProductsByGroup,
  linkProductToGroup,
  linkMultipleProductsToGroup,
  unlinkProductFromGroup,
  listAllGroups,
} from "../services/Productgroupservice.js";

const router = express.Router();

/**
 * GET /api/admin/groups
 * Listar todos los grupos con conteo de productos
 */
router.get("/groups", async (req, res) => {
  try {
    const groups = await listAllGroups();
    res.json(groups);
  } catch (error) {
    console.error("❌ Error listing groups:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/groups/:groupId
 * Obtener detalles de un grupo y sus productos
 */
router.get("/groups/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await getProductGroupById(groupId);
    
    if (!group) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    const products = await getProductsByGroup(groupId);
    
    res.json({
      ...group,
      products,
    });
  } catch (error) {
    console.error("❌ Error fetching group:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/groups
 * Crear un nuevo grupo
 * 
 * Body:
 * {
 *   "name": "QuietComfort 45",
 *   "brand": "Bose",
 *   "description": "Wireless noise-cancelling headphones",
 *   "category": "Headphones"
 * }
 */
router.post("/groups", async (req, res) => {
  try {
    const { name, brand, description, category } = req.body;
    
    if (!name || !brand) {
      return res.status(400).json({ 
        error: "Los campos 'name' y 'brand' son requeridos" 
      });
    }

    const group = await createProductGroup({ name, brand, description, category });
    res.status(201).json(group);
  } catch (error) {
    console.error("❌ Error creating group:", error);
    
    // Manejar violación de unique constraint
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: "Ya existe un grupo con ese brand + name" 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/groups/:groupId/link
 * Vincular productos a un grupo
 * 
 * Body:
 * {
 *   "productIds": ["uuid1", "uuid2", "uuid3"]
 * }
 */
router.post("/groups/:groupId/link", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ 
        error: "Se requiere un array 'productIds' con al menos un UUID" 
      });
    }

    const linkedProducts = await linkMultipleProductsToGroup(productIds, groupId);
    
    res.json({
      message: `${linkedProducts.length} productos vinculados al grupo`,
      products: linkedProducts,
    });
  } catch (error) {
    console.error("❌ Error linking products:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/products/:productId/unlink
 * Desvincular un producto de su grupo
 */
router.delete("/products/:productId/unlink", async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await unlinkProductFromGroup(productId);
    
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({
      message: "Producto desvinculado del grupo",
      product,
    });
  } catch (error) {
    console.error("❌ Error unlinking product:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;