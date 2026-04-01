import { getBoseProduct } from "./boseService.js";
import { getOrCreateProduct } from "./productService.js";
import { savePrice } from "./priceService.js";
import { getSourceByName } from "./sourceService.js";

/*
 Actualiza UN producto Bose
 */
export const updateSingleBoseProduct = async (handle) => {

  const source = await getSourceByName("Bose");

  if (!source) {
    throw new Error("Source Bose no existe en la tabla sources");
  }

  const url = `https://bose.co/products/${handle}.js`;

  console.log(`🔎 Actualizando producto Bose: ${handle}`);

  const data = await getBoseProduct(url);

  const product = await getOrCreateProduct(data);

  await savePrice(
    product.id,
    source.id,
    data.price,
    data.available
  );

  return {
    handle,
    status: "ok",
    data
  };
};


/*
 Actualiza TODOS los productos Bose configurados
 */
export const updateBoseProducts = async () => {

  const handles = [
    "parlante-bose-s1-pro-plus",
    "altavoz-portatil-bose-soundlink-flex-2da-gen",
    "audifonos-bose-quietcomfort"
  ];

  const results = [];

  for (const handle of handles) {

    try {
      const result = await updateSingleBoseProduct(handle);
      results.push(result);

    } catch (error) {

      console.error(`❌ Error en ${handle}:`, error.message);

      results.push({
        handle,
        status: "error",
        error: error.message
      });
    }
  }

  return results;
};


import { scrapeSamsungProduct } from "./samsungScraper.js";

export const updateSamsungProducts = async () => {
  const urls = [
    "https://www.samsung.com/co/tvs/uhd-4k-tv/u8000f-50-inch-crystal-uhd-4k-smart-tv-un50u8000fkxzl/",
    "https://www.samsung.com/co/tvs/oled-tv/s90f-48-inch-oled-4k-vision-ai-smart-tv-qn48s90faexzl/",
    "https://www.samsung.com/co/refrigerators/side-by-side/rs4000dc-sbside-with-large-capacity-rs4000dc-side-by-side-with-large-capacity-578l-black-rs57dg4100b4co/",
    "https://www.samsung.com/co/washers-and-dryers/washer-dryer-combo/wd8000dk-combo--all-in-one-combo-super-speed-26-kg-gray-wd26db8995bzco/"
  ];

  const source = await getSourceByName("Samsung");
  if (!source) throw new Error('Fuente Samsung no existe');

  const results = [];

  for (const url of urls) {
    try {
      const data = await scrapeSamsungProduct(url);
      const product = await getOrCreateProduct(data);
      await savePrice(product.id, source.id, data.price, data.available);
      results.push({ url, status: "ok", data });
    } catch (error) {
      results.push({ url, status: "error", error: error.message });
    }
  }

  return results;
};

export const updateSingleSamsungProduct = async (url) => {
  const source = await getSourceByName("Samsung");
  if (!source) throw new Error('Fuente Samsung no existe');

  const data = await scrapeSamsungProduct(url);
  const product = await getOrCreateProduct(data);
  await savePrice(product.id, source.id, data.price, data.available);

  return { url, status: "ok", data };
};

export const updateAllProviders = async () => {
  console.log('🚀 Actualizando todos los proveedores');
  console.log('='.repeat(80) + '\n');  

  const startTime = Date.now();
  const results = {
    summary: {
      totalProviders: 0,  
      totalProducts: 0,
      successful: 0,
      failed: 0, 
      duration: 0,
    },
    providers: []  
  };

//Actualizamos primero Bose ya que consume la informacion por API y es mas rapido

  try {
    console.log('📱 Actualizando productos Bose...');
    const boseResults = await updateBoseProducts();
    
    const boseSuccessful = boseResults.filter(r => r.status === "ok").length;
    const boseFailed = boseResults.filter(r => r.status === "error").length;
   
    results.providers.push({  
      name: "Bose",
      status: "completed",
      products: boseResults,
      successful: boseSuccessful,  
      failed: boseFailed,
      total: boseResults.length
    });

    results.summary.totalProducts += boseResults.length;
    results.summary.successful += boseSuccessful;
    results.summary.failed += boseFailed;

    console.log(`✅ Bose completado: ${boseSuccessful}/${boseResults.length} exitosos\n`); 

  } catch (error) {
    console.error('❌ Error actualizando productos Bose:', error.message);
    
    results.providers.push({  
      name: "Bose",
      status: "error",
      error: error.message,
      successful: 0,  
      failed: 0,      
      total: 0        
    });
  }

// Actualizacion de productos Samsung

  try {
    console.log('📱 Actualizando productos Samsung...');
    const samsungResults = await updateSamsungProducts();

    const samsungSuccessful = samsungResults.filter(r => r.status === "ok").length;  
    const samsungFailed = samsungResults.filter(r => r.status === "error").length;   

    results.providers.push({  // 
      name: "Samsung",
      status: "completed",
      products: samsungResults,
      successful: samsungSuccessful,
      failed: samsungFailed,
      total: samsungResults.length
    });

    results.summary.totalProducts += samsungResults.length;
    results.summary.successful += samsungSuccessful;
    results.summary.failed += samsungFailed;
  
    console.log(`✅ Samsung completado: ${samsungSuccessful}/${samsungResults.length} exitosos\n`);  // 

  } catch (error) {
    console.error('❌ Error actualizando Samsung:', error.message);

    results.providers.push({  
      name: "Samsung",
      status: "error",
      error: error.message,
      successful: 0,  
      failed: 0,      
      total: 0         
    });
  }

  
  
  results.summary.totalProviders = results.providers.length;  
  results.summary.duration = Date.now() - startTime;          

  console.log('='.repeat(80));
  console.log(' RESUMEN FINAL');
  console.log('='.repeat(80));
  console.log(`Proveedores procesados: ${results.summary.totalProviders}`);  // ← FIX: era "totalProvider"
  console.log(`Productos totales: ${results.summary.totalProducts}`);
  console.log(`Exitosos: ${results.summary.successful}`);
  console.log(`Fallidos: ${results.summary.failed}`);
  //ya que se quire calcular el impacto del proyecto con respecto al tiempo es importante determinar cuanto tiempo se esta tomando la acción 
  console.log(`⏱️  Tiempo total: ${(results.summary.duration / 1000).toFixed(2)}s`);
  console.log('='.repeat(80) + '\n');

  return results;
};