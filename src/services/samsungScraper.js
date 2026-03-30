import * as cheerio from 'cheerio';
import { normalizeProduct } from "./normalizeProduct.js";

/**
 
  FUNCIÓN: scrapeSamsungProduct(url)
 
  ¿Qué hace esta función?
  Esta función extrae (scrape) información de productos desde la página
  web de Samsung Colombia. Como Samsung NO tiene una API pública como Bose,
  tenemos que leer el HTML de la página y extraer los datos manualmente.
  
 * @param {string} url - La URL completa del producto de Samsung
 * @returns {Object} - Objeto con los datos del producto normalizados
 
 */
export async function scrapeSamsungProduct(url) {
  try {
    console.log(`🔍 Iniciando scraping de Samsung: ${url}`);


    // PASO 1: Hacer la petición HTTP a la página de Samsung
    
    // fetch() descarga el HTML completo de la página
    // Es como abrir la página en el navegador, pero desde Node.js

    const response = await fetch(url, {
      headers: {
        // User-Agent: Le decimos al servidor que somos un navegador real
        // Algunos sitios bloquean peticiones que vienen de scripts
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        
        // Accept: Le decimos al servidor qué tipo de contenido aceptamos
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        
        // Accept-Language: Pedimos el contenido en español
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
      },
    });

    
    // PASO 2: Verificar que la petición fue exitosa
    
    
    // response.ok es false si el servidor responde con error 
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - La página no existe o no está disponible`);
    }

    
    // PASO 3: Obtener el HTML completo de la página

    
    // response.text() convierte la respuesta a texto (HTML)
    const html = await response.text();
    
    console.log(`✅ HTML descargado exitosamente (${html.length} caracteres)`);

    
    // PASO 4: Cargar el HTML en Cheerio para poder analizarlo
   
    
    // Cheerio es como jQuery para Node.js
    // Nos permite buscar elementos en el HTML usando selectores CSS
    // El símbolo $ es una convención que viene de jQuery
    const $ = cheerio.load(html);

    console.log(`🔎 HTML cargado en Cheerio, buscando datos del producto...`);


    // PASO 5: Extraer el TÍTULO del producto
    
    
    // Estrategia multi-nivel: intentamos varios selectores porque Samsung podría cambiar su estructura HTML en cualquier momento
    
    // Intento 1: Buscar en el <h1> con clase 'product-info__name'
    let title = $('h1.product-info__name').first().text().trim();
    
    // Si no encontramos nada, intentamos otro selector
    if (!title) {
      // Intento 2: Buscar cualquier <h1> en la página
      title = $('h1').first().text().trim();
    }
    
    // Si aún no encontramos nada, intentamos el título de la página
    if (!title) {
      // Intento 3: Obtener el contenido de la etiqueta <title>
      // y limpiar "| Samsung Colombia" que viene al final
      title = $('title').text().replace('| Samsung Colombia', '').trim();
    }

    console.log(`📝 Título extraído: "${title}"`);


    // PASO 6: Extraer el PRECIO del producto
    
    
    // El precio en Samsung Colombia está dentro de un elemento con atributo data-price o en elementos con clases específicas
    
    let priceText = '';
    
    // Intento 1: Buscar precio en atributo data-price
    const priceElement = $('[data-price]').first();
    if (priceElement.length > 0) {
      priceText = priceElement.attr('data-price') || '';
    }
    
    // Intento 2: Buscar en meta tags (Open Graph) Los meta tags a veces contienen el precio en formato estructurado
    if (!priceText) {
      priceText = $('meta[property="product:price:amount"]').attr('content') || '';
    }
    
    // Intento 3: Buscar en el texto visible de la página
    if (!priceText) {
      // Buscamos elementos que contengan "$" seguido de números
      priceText = $('.price, .product-price, [class*="price"]')
        .first()
        .text()
        .trim();
    }

    console.log(`💰 Precio raw extraído: "${priceText}"`);

    // Convertir el texto del precio a número
    const price = parseSamsungPrice(priceText);
    
    console.log(`💵 Precio parseado: ${price} COP`);

    // ─────────────────────────────────────────────────────────────
    // PASO 7: Extraer la DISPONIBILIDAD del producto
    // ─────────────────────────────────────────────────────────────
    
    // Buscamos indicadores de que el producto NO está disponible
    const outOfStockIndicators = [
      'agotado',
      'sin stock',
      'no disponible',
      'out of stock',
      'sold out'
    ];
    
    // Obtenemos todo el texto de la página en minúsculas
    const pageText = $('body').text().toLowerCase();
    
    // El producto está disponible SI NO encontramos ningún indicador de "agotado"
    const available = !outOfStockIndicators.some(indicator => 
      pageText.includes(indicator)
    );
    
    // También podemos buscar botones de "Comprar" o "Agregar al carrito"
    // Si existen estos botones, es probable que esté disponible
    const buyButton = $('button[class*="buy"], button[class*="cart"], a[class*="buy"]');
    const hasActiveBuyButton = buyButton.length > 0 && 
                                !buyButton.hasClass('disabled') &&
                                !buyButton.attr('disabled');
    
    // Disponibilidad final: debe tener botón de compra Y no tener indicadores de agotado
    const finalAvailability = available && hasActiveBuyButton;
    
    console.log(`📦 Disponibilidad: ${finalAvailability ? 'DISPONIBLE' : 'AGOTADO'}`);

    
    // PASO 8: Extraer la IMAGEN principal del producto
    
    
    let imageUrl = '';
    
    // Intento 1: Buscar en meta tag Open Graph (og:image)
    // Esta es la imagen que se muestra cuando compartes el link
    imageUrl = $('meta[property="og:image"]').attr('content') || '';
    
    // Intento 2: Buscar en la galería de imágenes del producto
    if (!imageUrl) {
      imageUrl = $('.product-image img, [class*="gallery"] img')
        .first()
        .attr('src') || '';
    }
    
    // Intento 3: Buscar cualquier imagen grande en la página
    if (!imageUrl) {
      imageUrl = $('img[class*="product"]').first().attr('src') || '';
    }
    
    // Limpiar la URL de la imagen
    // Algunas URLs empiezan con "//" en lugar de "https://"
    if (imageUrl && imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    }
    
    // Si la URL es relativa (empieza con /), agregarle el dominio
    if (imageUrl && imageUrl.startsWith('/')) {
      imageUrl = 'https://www.samsung.com' + imageUrl;
    }

    console.log(`Imagen extraída: ${imageUrl}`);

    
    // PASO 9: Extraer el CÓDIGO DE MODELO (external_id)
 
    
    let externalId = '';
    
    // Intento 1: Buscar en meta tag
    externalId = $('meta[name="product:sku"]').attr('content') || 
                 $('meta[property="product:retailer_item_id"]').attr('content') || '';
    
    // Intento 2: Buscar en el SKU visible en la página
    if (!externalId) {
      const skuElement = $('[class*="sku"], [class*="model"], [data-sku]');
      if (skuElement.length > 0) {
        externalId = skuElement.text().trim() || skuElement.attr('data-sku') || '';
      }
    }
    
    // Intento 3: Extraer de la URL
    // El código del modelo suele estar al final
    if (!externalId) {
      const urlParts = url.split('/');
      // Obtener la última parte que no esté vacía
      externalId = urlParts.filter(part => part.length > 0).pop() || '';
    }

    console.log(`🔢 ID Externo extraído: "${externalId}"`);

    // ─────────────────────────────────────────────────────────────
    // PASO 10: Crear el objeto con los datos extraídos
    // ─────────────────────────────────────────────────────────────
    
    const raw = {
      external_id: externalId,           // Código único del producto
      title:       title,                // Nombre del producto
      price:       price,                // Precio en pesos colombianos (número)
      available:   finalAvailability,    // Si está disponible para comprar
      image:       imageUrl,             // URL de la imagen principal
      vendor:      "Samsung",            // Marca (siempre Samsung para este scraper)
    };

    console.log(`Datos extraídos:`, raw);

    
    // PASO 11: Validar y normalizar los datos
 
    
    // normalizeProduct() verifica que todos los campos estén correctos
    // y lanza un error si falta algo importante
    const normalizedData = normalizeProduct(raw, "Samsung");
    
    console.log(`✅ Producto de Samsung scrapeado exitosamente`);
    
    return normalizedData;

  } catch (error) {
    // ─────────────────────────────────────────────────────────────
    // MANEJO DE ERRORES
    // ─────────────────────────────────────────────────────────────
    
    // Si algo sale mal en cualquier paso, capturamos el error aquí
    console.error(`❌ Error en scraper de Samsung:`, error.message);
    
    // Re-lanzamos el error con más contexto para que updateService sepa que hubo un problema
    throw new Error(`Error scrapeando producto de Samsung: ${error.message}`);
  }
}

/**
  FUNCIÓN AUXILIAR: parseSamsungPrice(priceText)
 
  Convierte el texto del precio (como "$ 1.799.000") a un número (1799000)
  
 * @param {string} priceText - Texto que contiene el precio
 * @returns {number} - Precio como número entero
  
 */
function parseSamsungPrice(priceText) {
  // Si no hay texto, retornar 0
  if (!priceText) {
    console.warn(`⚠️ Precio vacío recibido, retornando 0`);
    return 0;
  }

  // Paso 1: Eliminar todo lo que NO sea un número o punto
  // Esto elimina: $, espacios, letras (COP), etc.
  let cleaned = priceText.replace(/[^\d.]/g, '');
  
  // Paso 2: En Colombia, el punto se usa para separar miles
  // Tenemos que eliminar todos los puntos
  cleaned = cleaned.replace(/\./g, '');
  
  // Paso 3: Convertir a número entero
  const price = parseInt(cleaned, 10);
  
  // Paso 4: Validar que el resultado sea un número válido
  if (isNaN(price) || price <= 0) {
    throw new Error(`Precio inválido: "${priceText}" no pudo ser convertido a número`);
  }
  
  return price;
}

