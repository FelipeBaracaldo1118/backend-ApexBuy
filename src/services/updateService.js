// Servicio centralizado para actualizar precios de todos los proveedores
// y competidores: Bose, Samsung, Ktronix, Mansion y Falabella

import { getBoseProduct } from "./boseService.js";
import { scrapeSamsungProduct } from "./samsungScraper.js";
import { scrapeKtronixProduct } from "./ktronixScraper.js";
import { scrapeMansionProduct } from "./mansionScraper.js";
import { getOrCreateProduct } from "./productService.js";
import { savePrice } from "./priceService.js";
import { getSourceByName } from "./sourceService.js";
import { scrapeFalabellaProduct } from "./falabellaScraper.js";


// BOSE - PROVEEDOR (API)


/**
 * Actualizar UN producto Bose por handle
 */
export const updateSingleBoseProduct = async (handle) => {
  const source = await getSourceByName("Bose");

  if (!source) {
    throw new Error("Source Bose no existe en la tabla sources");
  }

  const url = `https://bose.co/products/${handle}.js`;

  console.log(`Actualizando producto Bose: ${handle}`);

  const data = await getBoseProduct(url);
  const product = await getOrCreateProduct(data, source.id);
  await savePrice(product.id, source.id, data.price, data.available);

  return {
    handle,
    status: "ok",
    data
  };
};

/**
 * Actualizar TODOS los productos Bose configurados
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
      console.error(`Error en ${handle}:`, error.message);
      results.push({
        handle,
        status: "error",
        error: error.message
      });
    }
  }

  return results;
};


// SAMSUNG - PROVEEDOR (Scraping con Puppeteer)


/**
 * Actualizar TODOS los productos Samsung configurados
 */
export const updateSamsungProducts = async () => {
  const urls = [
    "https://www.samsung.com/co/tvs/uhd-4k-tv/u8000f-50-inch-crystal-uhd-4k-smart-tv-un50u8000fkxzl/",
    "https://www.samsung.com/co/tvs/oled-tv/s90f-48-inch-oled-4k-vision-ai-smart-tv-qn48s90faexzl/",
    "https://www.samsung.com/co/refrigerators/side-by-side/rs4000dc-sbside-with-large-capacity-rs4000dc-side-by-side-with-large-capacity-578l-black-rs57dg4100b4co/",
    "https://www.samsung.com/co/washers-and-dryers/washer-dryer-combo/wd8000dk-combo--all-in-one-combo-super-speed-26-kg-gray-wd26db8995bzco/"
  ];

  const source = await getSourceByName("Samsung");
  
  if (!source) {
    throw new Error('Fuente Samsung no existe');
  }

  const results = [];

  for (const url of urls) {
    try {
      const data = await scrapeSamsungProduct(url);
      const product = await getOrCreateProduct(data, source.id);
      await savePrice(product.id, source.id, data.price, data.available);
      
      results.push({ url, status: "ok", data });
    } catch (error) {
      results.push({ url, status: "error", error: error.message });
    }
  }

  return results;
};

/**
 * Actualizar UN producto Samsung por URL
 */
export const updateSingleSamsungProduct = async (url) => {
  const source = await getSourceByName("Samsung");
  
  if (!source) {
    throw new Error('Fuente Samsung no existe');
  }

  const data = await scrapeSamsungProduct(url);
  const product = await getOrCreateProduct(data, source.id);
  await savePrice(product.id, source.id, data.price, data.available);

  return { url, status: "ok", data };
};


// KTRONIX - COMPETIDOR (Scraping con Cheerio)


/**
 Actualizar TODOS los productos Ktronix configurados
 
 Ktronix es un COMPETIDOR:
 - NO tiene descuento (wholesale_discount = 0)
 - Vende productos de múltiples marcas (Samsung, Bose, etc.)
 - Usamos sus precios para comparar contra nuestros proveedores
 */
export const updateKtronixProducts = async () => {
  console.log(' Iniciando actualización de productos Ktronix...');

  const urls = [
    // TVs Samsung
    "https://www.ktronix.com/tv-samsung-50-pulgadas-127-cm-50u8000f-4k-uhd-led-crystal/p/8806097027560",
    "https://www.ktronix.com/tv-samsung-48-pulgadas-1219-cm-48s90f-4k-uhd-oled-smart-tv/p/8806097085003",
    
    // Electrodomésticos Samsung
    "https://www.ktronix.com/nevecon-samsung-side-by-side-578-litros-rs57dg4100b4co/p/8806095746586",
    "https://www.ktronix.com/lavadora-secadora-samsung-carga-frontal-bespoke-ai-laundry/p/8806095718972",
    
    // Productos Bose
    "https://www.ktronix.com/parlante-bose-s1-pro-negro/p/017817837316",
    "https://www.ktronix.com/audifonos-bose-quietcomfort-negro/p/017817848961",
    "https://www.ktronix.com/parlante-bose-soundlink-flex-ii-negro/p/017817852470"
  ];

  console.log(` Total de productos a actualizar: ${urls.length}`);

  const source = await getSourceByName("Ktronix");
  
  if (!source) {
    throw new Error(
      'La fuente "Ktronix" no existe en la tabla sources. ' +
      'Ejecuta: INSERT INTO sources (name, type, role, wholesale_discount) ' +
      'VALUES (\'Ktronix\', \'scraping\', \'competitor\', 0.00);'
    );
  }

  console.log(`Fuente encontrada: ${source.name} (ID: ${source.id})`);

  const results = [];

  for (const url of urls) {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(` Procesando: ${url}`);
      console.log('='.repeat(70));

      const data = await scrapeKtronixProduct(url);

      console.log(` Datos extraídos:`, {
        titulo: data.title,
        marca: data.vendor,
        precio: `$${data.price.toLocaleString('es-CO')}`,
        disponible: data.available ? 'Sí' : 'No'
      });

      const product = await getOrCreateProduct(data, source.id);
      console.log(` Producto en DB: ${product.name} (ID: ${product.id})`);

      await savePrice(product.id, source.id, data.price, data.available);
      console.log(` Precio guardado: $${data.price.toLocaleString('es-CO')}`);

      results.push({
        url:    url,
        status: "ok",
        data:   data
      });

      console.log(` Producto procesado exitosamente`);

    } catch (error) {
      console.error(` Error procesando ${url}:`, error.message);

      results.push({
        url:    url,
        status: "error",
        error:  error.message
      });
    }
  }

  const exitosos = results.filter(r => r.status === "ok").length;
  const fallidos  = results.filter(r => r.status === "error").length;

  console.log(`\n${'='.repeat(70)}`);
  console.log('RESUMEN KTRONIX');
  console.log('='.repeat(70));
  console.log(` Productos exitosos: ${exitosos}`);
  console.log(` Productos fallidos:  ${fallidos}`);
  console.log(` Total procesados:    ${results.length}`);
  console.log('='.repeat(70) + '\n');

  return results;
};

/**
 * Actualizar UN producto Ktronix por URL
 */
export const updateSingleKtronixProduct = async (url) => {
  console.log(` Actualizando producto individual de Ktronix...`);
  console.log(`URL: ${url}`);

  try {
    const source = await getSourceByName("Ktronix");
    
    if (!source) {
      throw new Error('La fuente "Ktronix" no existe');
    }

    const data = await scrapeKtronixProduct(url);
    const product = await getOrCreateProduct(data, source.id);
    await savePrice(product.id, source.id, data.price, data.available);

    console.log(` Actualización completada: ${data.title}`);

    return {
      url:    url,
      status: "ok",
      data:   data
    };

  } catch (error) {
    console.error(` Error:`, error.message);

    return {
      url:    url,
      status: "error",
      error:  error.message
    };
  }
};


// MANSION - COMPETIDOR (Scraping con Cheerio)


/**
 * Actualizar TODOS los productos de Mansion configurados
 
 Mansion es un COMPETIDOR:
 - NO tiene descuento (wholesale_discount = 0)
 - Vende productos de múltiples marcas
 - Usamos sus precios para comparar contra proveedores
 */
export const updateMansionProducts = async () => {
  console.log('Iniciando actualización de productos Mansion...');

  const urls = [
    // Mansion solo maneja producto samsung, asi que solo se pone los links de samsung aqui
    "https://www.grupomansion.com/refrigeracion/642-nevecon-samsung-side-by-side-778lt-black-rs27t5200b1co-8806092233560.html",
    "https://www.grupomansion.com/audio-y-video/5713-televisor-samsung-50-pulgadas-crystal-smart-4k-un50u8000fkxz-8806097027560.html",
    "https://www.grupomansion.com/audio-y-video/5825-televisor-samsung-48-pulgadas-oled-4k-smart-tv-qn48s90faexzl-8806097085003.html",
    "https://www.grupomansion.com/lavadoras-y-secadoras/3110-lavadora-secadora-samsung-bespoke-26-kg-ai-laundry-combo-wd26db8995bzco-8806095718972.html"


  ];

  console.log(` Total de productos a actualizar: ${urls.length}`);

  const source = await getSourceByName("Mansion Electrodomesticos");
  
  if (!source) {
    throw new Error(
      'La fuente "Mansion" no existe en la tabla sources. ' +
      'Ejecuta: INSERT INTO sources (name, type, role, wholesale_discount) ' +
      'VALUES (\'Mansion\', \'scraping\', \'competitor\', 0.00);'
    );
  }

  console.log(`Fuente encontrada: ${source.name} (ID: ${source.id})`);

  const results = [];

  for (const url of urls) {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(` Procesando: ${url}`);
      console.log('='.repeat(70));

      const data = await scrapeMansionProduct(url);

      console.log(` Datos extraídos:`, {
        titulo: data.title,
        marca: data.vendor,
        precio: `$${data.price.toLocaleString('es-CO')}`,
        disponible: data.available ? 'Sí' : 'No'
      });

      const product = await getOrCreateProduct(data, source.id);
      console.log(` Producto en DB: ${product.name} (ID: ${product.id})`);

      await savePrice(product.id, source.id, data.price, data.available);
      console.log(`Precio guardado: $${data.price.toLocaleString('es-CO')}`);

      results.push({
        url:    url,
        status: "ok",
        data:   data
      });

      console.log(`Producto procesado exitosamente`);

    } catch (error) {
      console.error(` Error procesando ${url}:`, error.message);

      results.push({
        url:    url,
        status: "error",
        error:  error.message
      });
    }
  }

  const exitosos = results.filter(r => r.status === "ok").length;
  const fallidos  = results.filter(r => r.status === "error").length;

  console.log(`\n${'='.repeat(70)}`);
  console.log(' RESUMEN MANSION');
  console.log('='.repeat(70));
  console.log(` Productos exitosos: ${exitosos}`);
  console.log(` Productos fallidos:  ${fallidos}`);
  console.log(` Total procesados:    ${results.length}`);
  console.log('='.repeat(70) + '\n');

  return results;
};

/**
 * Actualizar UN producto de Mansion por URL
 */
export const updateSingleMansionProduct = async (url) => {
  console.log(` Actualizando producto individual de Mansion...`);
  console.log(`URL: ${url}`);

  try {
    const source = await getSourceByName("Mansion");
    
    if (!source) {
      throw new Error('La fuente "Mansion" no existe');
    }

    const data = await scrapeMansionProduct(url);
    const product = await getOrCreateProduct(data, source.id);
    await savePrice(product.id, source.id, data.price, data.available);

    console.log(` Actualización completada: ${data.title}`);

    return {
      url:    url,
      status: "ok",
      data:   data
    };

  } catch (error) {
    console.error(` Error:`, error.message);

    return {
      url:    url,
      status: "error",
      error:  error.message
    };
  }
};


// UPDATE ALL PROVIDERS - ENDPOINT PRINCIPAL


/**
 * Actualizar TODOS los productos de TODOS los proveedores y competidores
 * 
 * Este es el endpoint principal que se usa en producción para actualizar
 * todos los precios con un solo click
 * 
 * Ejecuta en orden:
 * 1. Bose (API - rápido ~2s)
 * 2. Samsung (Puppeteer - lento ~20s)
 * 3. Ktronix (Cheerio - medio ~8s)
 * 4. Mansion (Cheerio - medio ~5s)
 */
export const updateAllProviders = async () => {
  console.log('\n' + '='.repeat(80));
  console.log('ACTUALIZANDO TODOS LOS PROVEEDORES Y COMPETIDORES');
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

 
  // BOSE - PROVEEDOR (API)
  

  try {
    console.log(' Actualizando productos Bose...');
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

    console.log(` Bose completado: ${boseSuccessful}/${boseResults.length} exitosos\n`);

  } catch (error) {
    console.error('Error actualizando productos Bose:', error.message);
    
    results.providers.push({
      name: "Bose",
      status: "error",
      error: error.message,
      successful: 0,
      failed: 0,
      total: 0
    });
  }


  // SAMSUNG - PROVEEDOR (Puppeteer)
 

  try {
    console.log(' Actualizando productos Samsung...');
    const samsungResults = await updateSamsungProducts();

    const samsungSuccessful = samsungResults.filter(r => r.status === "ok").length;
    const samsungFailed = samsungResults.filter(r => r.status === "error").length;

    results.providers.push({
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

    console.log(` Samsung completado: ${samsungSuccessful}/${samsungResults.length} exitosos\n`);

  } catch (error) {
    console.error(' Error actualizando Samsung:', error.message);

    results.providers.push({
      name: "Samsung",
      status: "error",
      error: error.message,
      successful: 0,
      failed: 0,
      total: 0
    });
  }

  
  // KTRONIX - COMPETIDOR (Cheerio)
  

  try {
    console.log(' Actualizando productos Ktronix...');
    const ktronixResults = await updateKtronixProducts();

    const ktronixSuccessful = ktronixResults.filter(r => r.status === "ok").length;
    const ktronixFailed = ktronixResults.filter(r => r.status === "error").length;

    results.providers.push({
      name: "Ktronix",
      status: "completed",
      products: ktronixResults,
      successful: ktronixSuccessful,
      failed: ktronixFailed,
      total: ktronixResults.length
    });

    results.summary.totalProducts += ktronixResults.length;
    results.summary.successful += ktronixSuccessful;
    results.summary.failed += ktronixFailed;

    console.log(` Ktronix completado: ${ktronixSuccessful}/${ktronixResults.length} exitosos\n`);

  } catch (error) {
    console.error('Error actualizando Ktronix:', error.message);

    results.providers.push({
      name: "Ktronix",
      status: "error",
      error: error.message,
      successful: 0,
      failed: 0,
      total: 0
    });
  }

  
  // MANSION - COMPETIDOR (Cheerio)
 

  try {
    console.log(' Actualizando productos Mansion...');
    const mansionResults = await updateMansionProducts();

    const mansionSuccessful = mansionResults.filter(r => r.status === "ok").length;
    const mansionFailed = mansionResults.filter(r => r.status === "error").length;

    results.providers.push({
      name: "Mansion",
      status: "completed",
      products: mansionResults,
      successful: mansionSuccessful,
      failed: mansionFailed,
      total: mansionResults.length
    });

    results.summary.totalProducts += mansionResults.length;
    results.summary.successful += mansionSuccessful;
    results.summary.failed += mansionFailed;

    console.log(` Mansion completado: ${mansionSuccessful}/${mansionResults.length} exitosos\n`);

  } catch (error) {
    console.error(' Error actualizando Mansion:', error.message);

    results.providers.push({
      name: "Mansion",
      status: "error",
      error: error.message,
      successful: 0,
      failed: 0,
      total: 0
    });
  }

  try {
    console.log('🛍️ Actualizando productos Falabella...');
    const falabellaResults = await updateFalabellaProducts();
 
    const falabellaSuccessful = falabellaResults.filter(r => r.status === "ok").length;
    const falabellaFailed = falabellaResults.filter(r => r.status === "error").length;
 
    results.providers.push({
      name: "Falabella",
      status: "completed",
      products: falabellaResults,
      successful: falabellaSuccessful,
      failed: falabellaFailed,
      total: falabellaResults.length
    });
 
    results.summary.totalProducts += falabellaResults.length;
    results.summary.successful += falabellaSuccessful;
    results.summary.failed += falabellaFailed;
 
    console.log(`✅ Falabella completado: ${falabellaSuccessful}/${falabellaResults.length} exitosos\n`);
 
  } catch (error) {
    console.error('❌ Error actualizando Falabella:', error.message);
 
    results.providers.push({
      name: "Falabella",
      status: "error",
      error: error.message,
      successful: 0,
      failed: 0,
      total: 0
    });
  }

  
  // RESUMEN FINAL
  

  results.summary.totalProviders = results.providers.length;
  results.summary.duration = Date.now() - startTime;

  console.log('='.repeat(80));
  console.log(' RESUMEN FINAL');
  console.log('='.repeat(80));
  console.log(`Proveedores/Competidores procesados: ${results.summary.totalProviders}`);
  console.log(`Productos totales: ${results.summary.totalProducts}`);
  console.log(`Exitosos: ${results.summary.successful}`);
  console.log(`Fallidos: ${results.summary.failed}`);
  console.log(`Tiempo total: ${(results.summary.duration / 1000).toFixed(2)}s`);
  console.log('='.repeat(80) + '\n');

  return results;
};


//Actualizacion de falabella

export const updateFalabellaProducts = async () => {
  console.log('🛍️ Iniciando actualización de productos Falabella...');
 
  const urls = [
    // Productos Bose
    "https://www.falabella.com.co/falabella-co/product/70719486/Parlante-portatil-Bose-S1-PRO+-Bluetooth/70719486",
    "https://www.falabella.com.co/falabella-co/product/73097569/Altavoz-Bluetooth-portatil-Bose-SoundLink-Flex-(2.a-gen.)/73097571",
    "https://www.falabella.com.co/falabella-co/product/73357092/Audifonos-Bose-QuietComfort-Noise-cancelling/73357093",
    
    // Productos Samsung
    "https://www.falabella.com.co/falabella-co/product/73298024/Televisor-Samsung-50-pulgadas-4K-Ultra-HD-UHD-UN50U8000FKXZL/73298024",
    "https://www.falabella.com.co/falabella-co/product/73000484/Lavadora-Secadora-Samsung-Electrica-26-kg-Bespoke-AI-Laundry-Combo-WD26DB8995BZCO-Heat-Pump-Secado-Optimo-en-50-Menos-Tiempo/73000484",
    "https://www.falabella.com.co/falabella-co/product/73298011/televisor-samsung-48-pulgadas-4k-oled-qn48s90faexzl/73298011",
    "https://www.falabella.com.co/falabella-co/product/73150331/Nevecon-Samsung-Side-by-Side-578-Litros-RS57DG4100B4CO-con-Inteligencia-Artificial-/73150331",
  ];
 
  console.log(`📋 Total de productos a actualizar: ${urls.length}`);
 
  const source = await getSourceByName("Falabella");
  
  if (!source) {
    throw new Error(
      'La fuente "Falabella" no existe en la tabla sources. ' +
      'Ejecuta: INSERT INTO sources (name, type, role, wholesale_discount) ' +
      'VALUES (\'Falabella\', \'scraping\', \'competitor\', 0.00);'
    );
  }
 
  console.log(`✅ Fuente encontrada: ${source.name} (ID: ${source.id})`);
 
  const results = [];
 
  for (const url of urls) {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🔄 Procesando: ${url}`);
      console.log('='.repeat(70));
 
      const data = await scrapeFalabellaProduct(url);
 
      console.log(`✅ Datos extraídos:`, {
        titulo: data.title,
        marca: data.vendor,
        precio: `$${data.price.toLocaleString('es-CO')}`,
        disponible: data.available ? 'Sí' : 'No'
      });
 
      const product = await getOrCreateProduct(data, source.id);
      console.log(`💾 Producto en DB: ${product.name} (ID: ${product.id})`);
 
      await savePrice(product.id, source.id, data.price, data.available ?? true);
      console.log(`💰 Precio guardado: $${data.price.toLocaleString('es-CO')}`);
 
      results.push({
        url:    url,
        status: "ok",
        data:   data
      });
 
      console.log(`✅ Producto procesado exitosamente`);
 
    } catch (error) {
      console.error(`❌ Error procesando ${url}:`, error.message);
 
      results.push({
        url:    url,
        status: "error",
        error:  error.message
      });
    }
  }
 
  const exitosos = results.filter(r => r.status === "ok").length;
  const fallidos  = results.filter(r => r.status === "error").length;
 
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 RESUMEN FALABELLA');
  console.log('='.repeat(70));
  console.log(`✅ Productos exitosos: ${exitosos}`);
  console.log(`❌ Productos fallidos:  ${fallidos}`);
  console.log(`📦 Total procesados:    ${results.length}`);
  console.log('='.repeat(70) + '\n');
 
  return results;
};
 
/**
 * Actualizar UN producto de Falabella por URL
 */
export const updateSingleFalabellaProduct = async (url) => {
  console.log(`🔄 Actualizando producto individual de Falabella...`);
  console.log(`URL: ${url}`);
 
  try {
    const source = await getSourceByName("Falabella");
    
    if (!source) {
      throw new Error('La fuente "Falabella" no existe');
    }
 
    const data = await scrapeFalabellaProduct(url);
    console.log('🐛 DEBUG - data completo:', JSON.stringify(data, null, 2));
    console.log('🐛 DEBUG - data.available:', data.available, typeof data.available);
    const product = await getOrCreateProduct(data, source.id);
    await savePrice(product.id, source.id, data.price, data.available ?? true);
 
    console.log(`✅ Actualización completada: ${data.title}`);
 
    return {
      url:    url,
      status: "ok",
      data:   data
    };
 
  } catch (error) {
    console.error(`❌ Error:`, error.message);
 
    return {
      url:    url,
      status: "error",
      error:  error.message
    };
  }
};