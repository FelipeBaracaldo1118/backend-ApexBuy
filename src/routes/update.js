import express from "express";
import {
  updateBoseProducts,
  updateSingleBoseProduct,
  updateSamsungProducts, 
  updateSingleSamsungProduct,
  updateAllProviders
} from "../services/updateService.js";

//Las rutas, son los endpoints que se crean en la API.
// En este caso especifico, se van a usar estas rutas para actualizar los productos, el cliente podra actualizar un producto en especifico, varios de la misma marca o todos los 7 productos al tiempo. 

const router = express.Router();

/*
Actualizar TODOS los productos Bose
GET /api/update/bose
 */
router.get("/bose", async (req, res) => {
  try {
    const result = await updateBoseProducts();
    res.json(result);

  } catch (error) {
    console.error("❌ Error update Bose:", error);
    res.status(500).json({ error: error.message });
  }
});


/**
 Actualizar UN producto Bose
 GET /api/update/bose/:handle
 */
router.get("/bose/:handle", async (req, res) => {
  try {
    const { handle } = req.params;

    const result = await updateSingleBoseProduct(handle);

    res.json(result);

  } catch (error) {
    console.error("❌ Error update Bose:", error);
    res.status(500).json({ error: error.message });
  }
});


router.get("/samsung", async (req, res) => {
  try {
    const result = await updateSamsungProducts();
    res.json(result);
  } catch (error) {
    console.error("❌ Error update Samsung:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/samsung-single", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({
        error: "Se requiere el parámetro 'url'",
        ejemplo: "/api/update/samsung-single?url=https://..."
      });
    }
    const result = await updateSingleSamsungProduct(url);
    res.json(result);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
});

//Se crea la ruta de la API para hacer la petición GET. de todos los productos. 

router.get("/all-providers", async (req, res) => {
  try{
    console.log('Solicitud recibida: Actualizar todos los proveedores')
    const result = await updateAllProviders();

    const allsuccessfull = result.summary.failed === 0;
    const statusCode = allsuccessfull ? 200 : 207;

    res.status(statusCode).json(result);
  }catch (error){
    console.error("Error en /all-providers", error)
    res.status(500).json({
      error:"Error actualizando servidores",
      details: error.message
    })
  
  }

} )


export default router;
