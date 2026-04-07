import * as cheerio from 'cheerio';
import { normalizeProduct } from "./normalizeProduct.js";

/**
 * Función principal para extraer datos de un producto Ktronix
 * 
 * @param {string} url - URL completa del producto en ktronix.com
 * @returns {Object} - Objeto con los datos normalizados del producto
 */
export async function scrapeKtronixProduct(url) {
  try {
    console.log(` Iniciando scraping de Ktronix: ${url}`);

    
    // DESCARGAR EL HTML
    
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const html = await response.text();
    console.log(` HTML descargado (${html.length} caracteres)`);


    // CARGAR EN CHEERIO
    
    
    const $ = cheerio.load(html);

    
    // EXTRAER TÍTULO
    
    
    let titulo = '';
    
    //  Tag <title>
    titulo = $('title').text().trim();
    if (titulo) {
      titulo = titulo.split('|')[0].trim();
    }
    
    //  H1
    if (!titulo) {
      titulo = $('h1').first().text().trim();
    }
    
    //  Meta tag
    if (!titulo) {
      titulo = $('meta[property="og:title"]').attr('content') || '';
    }

    console.log(` Título extraído: "${titulo}"`);

    if (!titulo) {
      throw new Error('No se pudo encontrar el título del producto');
    }

    
    //  EXTRAER PRECIO
    
    
    let precioTexto = '';
    
    // Intento 1: Por ID específico de Ktronix
    precioTexto = $('#js-original_price').text().trim();
    
    // Intento 2: Por clase
    if (!precioTexto) {
      precioTexto = $('.price-ktronix').first().text().trim();
    }
    
    // Intento 3: Cualquier elemento con "price"
    if (!precioTexto) {
      precioTexto = $('[class*="price"]').first().text().trim();
    }

    // Limpiar texto (remover "Hoy" y otros textos)
    precioTexto = precioTexto.replace(/Hoy/gi, '').trim();

    console.log(` Precio extraído (raw): "${precioTexto}"`);

    // Convertir a número
    const precio = parsearPrecioKtronix(precioTexto);

    if (!precio || precio <= 0) {
      throw new Error(`Precio inválido: "${precioTexto}"`);
    }

    
    // EXTRAER CÓDIGO DEL PRODUCTO
    
    // Ktronix usa: /p/8806097027560, esto esta por GET en el navegador, se puede verificar con el link de navegador
    
    let codigoProducto = '';
    
    // Extraer de la URL
    const urlParts = url.split('/p/');
    if (urlParts.length > 1) {
      codigoProducto = urlParts[1].split('/')[0].split('?')[0];
    }
    
    // Fallback
    if (!codigoProducto) {
      codigoProducto = 'KTRONIX_' + Date.now();
    }

    console.log(` Código producto: ${codigoProducto}`);

  
    //  DETECTAR MARCA
    //Para validar que la marca coincida, en caso tal revisar que no este generando mas errores
    
    const vendor = extractBrandFromTitle(titulo);
    console.log(` Marca detectada: ${vendor}`);

    
    //  ENSAMBLAR OBJETO FINAL
    
    
    const datosExtraidos = {
        external_id: codigoProducto,
        title:       titulo,
        price:       precio,
        available:   true,
        image:       null,
        vendor:      "Ktronix",  //la guente de donde estamos sacando los datos
      };

    console.log(` Scraping completado exitosamente`);

    // PASO 8: NORMALIZAR Y RETORNAR
  
    
    return normalizeProduct(datosExtraidos, "Ktronix");

  } catch (error) {
    console.error(' Error en scraper de Ktronix:', error.message);
    throw new Error(`Error scraping Ktronix (${url}): ${error.message}`);
  }
}

/**
 * Parsear precio de Ktronix a número
 * Formato: "$1.649.900" o "$1.649.900 Hoy"
 */
function parsearPrecioKtronix(precioTexto) {
  if (!precioTexto) {
    return 0;
  }

  let precioLimpio = String(precioTexto);

  console.log(`Limpiando precio: "${precioLimpio}"`);

  // Eliminar símbolos y texto
  precioLimpio = precioLimpio.replace(/\$/g, '');
  precioLimpio = precioLimpio.replace(/Hoy/gi, '');
  precioLimpio = precioLimpio.replace(/[A-Za-z]/g, '');
  precioLimpio = precioLimpio.replace(/\./g, '');
  precioLimpio = precioLimpio.replace(/,/g, '');
  precioLimpio = precioLimpio.trim();

  console.log(` Precio limpio: "${precioLimpio}"`);

  const precioNumero = parseInt(precioLimpio, 10);

  if (isNaN(precioNumero) || precioNumero <= 0) {
    console.error(` No se pudo convertir "${precioTexto}" a número`);
    return 0;
  }

  console.log(`Precio final: ${precioNumero.toLocaleString('es-CO')}`);

  return precioNumero;
}

/**
 * Extraer marca del título del producto
 * Ejemplos:
 * - "TV Samsung 50 pulgadas" → "Samsung"
 * - "Parlante Bose SoundLink" → "Bose"
 */
function extractBrandFromTitle(titulo) {
  const tituloLower = titulo.toLowerCase();
  
  
  const marcas = [
    'Samsung',
    'Bose',
   
  ];
  
  // Buscar cada marca
  for (const marca of marcas) {
    if (tituloLower.includes(marca.toLowerCase())) {
      return marca;
    }
  }
  
  // Si no se encuentra, retornar "Unknown"
  return 'Unknown';
}
