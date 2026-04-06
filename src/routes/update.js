import express from "express";
import {
  updateBoseProducts,
  updateSingleBoseProduct,
  updateSamsungProducts, 
  updateSingleSamsungProduct,
  updateAllProviders, 
  updateKtronixProducts,
  updateSingleKtronixProduct,
  updateMansionProducts,
  updateSingleMansionProduct,
} from "../services/updateService.js";

// Las rutas son los endpoints que se crean en la API.
// En este caso específico, se van a usar estas rutas para actualizar los productos,
// el cliente podrá actualizar un producto en específico, varios de la misma marca o todos los productos al tiempo.

const router = express.Router();


// RUTAS BOSE


/**
 * Actualizar TODOS los productos Bose
 * GET /api/update/bose
 */
router.get("/bose", async (req, res) => {
  try {
    const result = await updateBoseProducts();
    res.json(result);
  } catch (error) {
    console.error("Error update Bose:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Actualizar UN producto Bose
 * GET /api/update/bose/:handle
 */
router.get("/bose/:handle", async (req, res) => {
  try {
    const { handle } = req.params;
    const result = await updateSingleBoseProduct(handle);
    res.json(result);
  } catch (error) {
    console.error(" Error update Bose:", error);
    res.status(500).json({ error: error.message });
  }
});


// RUTAS SAMSUNG


/**
 * Actualizar TODOS los productos Samsung
 * GET /api/update/samsung
 */
router.get("/samsung", async (req, res) => {
  try {
    const result = await updateSamsungProducts();
    res.json(result);
  } catch (error) {
    console.error(" Error update Samsung:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Actualizar UN producto Samsung
 * GET /api/update/samsung-single?url=...
 */
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
    console.error(" Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// RUTAS KTRONIX


/**
 * Actualizar TODOS los productos Ktronix
 * GET /api/update/ktronix
 */
router.get("/ktronix", async (req, res) => {
  try {
    const result = await updateKtronixProducts();
    res.json(result);
  } catch (error) {
    console.error(" Error en /ktronix:", error);
    res.status(500).json({ 
      error: "Error actualizando Ktronix",
      details: error.message 
    });
  }
});

/**
 * Actualizar UN producto Ktronix
 * GET /api/update/ktronix-single?url=...
 */
router.get("/ktronix-single", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: "Se requiere el parámetro 'url'",
        ejemplo: "/api/update/ktronix-single?url=https://www.ktronix.com/..."
      });
    }

    if (!url.includes('ktronix.com')) {
      return res.status(400).json({
        error: "La URL debe ser del sitio ktronix.com",
        url_recibida: url
      });
    }

    const result = await updateSingleKtronixProduct(url);
    res.json(result);

  } catch (error) {
    console.error(" Error en /ktronix-single:", error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});


// RUTA PRINCIPAL: ACTUALIZAR TODOS


/**
 * Actualizar TODOS los proveedores y competidores
 * GET /api/update/all-providers
 */
router.get("/all-providers", async (req, res) => {
  try {
    console.log('Solicitud recibida: Actualizar todos los proveedores');
    
    const result = await updateAllProviders();

    // Si todos fueron exitosos: 200, si hubo fallos: 207 (Multi-Status)
    const allSuccessful = result.summary.failed === 0;
    const statusCode = allSuccessful ? 200 : 207;

    res.status(statusCode).json(result);
    
  } catch (error) {
    console.error(" Error en /all-providers:", error);
    res.status(500).json({
      error: "Error actualizando proveedores",
      details: error.message
    });
  }
});


//Actualizacion productos mansion mediante GET

router.get("/mansion", async (req, res) => {
  try{
    const result = await updateMansionProducts();
    res.json(result)
  } catch (error){
    console.error("Error en /mansion:", error)
    res.status(500).json({
      error:"Error actualizando Mansion",
      details: error.message
    })
  }
})

//End point actualizacion de un solo producto para mansion 

router.get("/mansion-single", async (req, res)=> {
  try{
    const {url} = rew.query;
    if(!url){
      return res.status(400).json({
        error: "se requiere el url como parametro",
        ejemplo:"/api/update/mansion-single?url=http...."
      })
    }

    if(url.includes('grupomansion.com')){
      return res.status(400).json({
          error: "La url debe ser de grupo mansion",
          url_recibida: url
      })
    }

    const result = await updateSingleMansionProduct(url)
    res.json(result)

    }catch(error) {
      console.error("Error en /mansion-single", error)
      res.status(500).json({
        error: error.message
      })
    }
})
export default router;