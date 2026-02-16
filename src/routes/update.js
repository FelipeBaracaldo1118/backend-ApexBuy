import express from "express";
import { getBoseProduct } from "../services/boseService.js";
import { savePrice } from "../services/priceService.js";
import { getProductByExternalId } from "../services/productService.js";

const router = express.Router();

router.get("/bose-s1", async (req, res) => {
  try {

    // Obtener datos desde Bose
    const data = await getBoseProduct(
      "https://bose.co/products/parlante-bose-s1-pro-plus.js"
    );

    // Buscar producto en DB usando external_id
    const product = await getProductByExternalId(data.external_id);

    if (!product) {
      return res.status(404).json({
        error: "Producto no existe en la base de datos",
      });
    }

    // Guardar precio (histórico)
    await savePrice(
      product.id,   // UUID real desde DB
      source.id,            // source_id = Bose
      data.price,
      data.available
    );

    //  Respuesta
    res.json({
      message: "Precio actualizado correctamente!",
      data,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al actualizar el precio",
    });
  }
});

export default router;