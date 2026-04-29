import * as cheerio from 'cheerio';
import { normalizeProduct } from "./normalizeProduct.js";

/**
 * Scraper para productos de Grupo Mansion
 * 
 * @param {string} url - URL del producto
 * @returns {Object} - Datos normalizados del producto
 */
export async function scrapeMansionProduct(url) {
  try {
    console.log(`Iniciando scraping de Mansion: ${url}`);

    //Descargar HTML
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ HTML descargado (${html.length} caracteres)`);

   //Cargar cheerio la pagina HTML
    
    const $ = cheerio.load(html);

    //Extraer titulo
    
    let titulo = '';
    
    // H1 principal del producto
    titulo = $('h1.product-title, h1[itemprop="name"], .product-name h1').first().text().trim();
    
    //  Meta tag
    if (!titulo) {
      titulo = $('meta[property="og:title"]').attr('content') || '';
    }
    
    //  Title tag
    if (!titulo) {
      titulo = $('title').text().trim().split('|')[0].trim();
    }

    console.log(` Título: "${titulo}"`);

    if (!titulo) {
      throw new Error('No se pudo encontrar el título del producto');
    }

    //Extraer precio
    
    let precioTexto = '';
    
    // Intento 1: Precio actual/principal
    precioTexto = $('.current-price, .product-price, [itemprop="price"]').first().text().trim();
    
    // Intento 2: Precio en meta tag
    if (!precioTexto) {
      precioTexto = $('meta[itemprop="price"]').attr('content') || '';
    }
    
    // Intento 3: Buscar en span con clase price
    if (!precioTexto) {
      precioTexto = $('span.price, .price-value').first().text().trim();
    }
    
    //  Buscar cualquier elemento con "current-price" en ID o clase
    if (!precioTexto) {
      precioTexto = $('[id*="price"], [class*="current-price"]').first().text().trim();
    }

    console.log(`💰 Precio (raw): "${precioTexto}"`);

    // Convertir a número
    const precio = parsearPrecioMansion(precioTexto);

    if (!precio || precio <= 0) {
      throw new Error(`Precio inválido: "${precioTexto}"`);
    }

    //Extraer codigo del producto                                                         ↑ EAN (13 dígitos)
    
    let codigoProducto = '';
    
    // Extraer EAN de la URL (últimos 13 dígitos antes de .html)
    const urlMatch = url.match(/(\d{13})\.html$/);
    if (urlMatch) {
      codigoProducto = urlMatch[1];
    }
    
    // Buscar en atributos data-product-id, data-ean, etc.
    if (!codigoProducto) {
      codigoProducto = $('[data-product-id], [data-ean], [itemprop="sku"]')
        .first()
        .attr('data-product-id') || 
        $('[data-ean]').first().attr('data-ean') ||
        $('[itemprop="sku"]').first().text().trim();
    }
    
    // Fallback
    if (!codigoProducto) {
      codigoProducto = 'MANSION_' + Date.now();
    }

    console.log(` Código: ${codigoProducto}`);

    //detectar marca
    
    const vendor = extractBrandFromTitle(titulo);
    console.log(` Marca: ${vendor}`);

  
    // ENSAMBLAR OBJETO
   
    
    const datosExtraidos = {
      external_id: codigoProducto,
      title:       titulo,
      price:       precio,
      available:   true,    // Asumimos disponible (competidor)
      image:       null,    // Sin imagen para competidores
      vendor:      "Mansion", // Fuente, no marca del producto
      source_url:  url,
    };

    console.log(` Scraping completado exitosamente`);

    //NORMALIZAR Y RETORNAR
  
    
    return normalizeProduct(datosExtraidos, "Mansion");

  } catch (error) {
    console.error(' Error en scraper de Mansion:', error.message);
    throw new Error(`Error scraping Mansion (${url}): ${error.message}`);
  }
}


function parsearPrecioMansion(precioTexto) {
  if (!precioTexto) {
    return 0;
  }

  let precioLimpio = String(precioTexto);

  console.log(`Limpiando precio: "${precioLimpio}"`);

  // Eliminar símbolos y texto
  precioLimpio = precioLimpio.replace(/\$/g, '');           // Quitar $
  precioLimpio = precioLimpio.replace(/COP/gi, '');         // Quitar COP
  precioLimpio = precioLimpio.replace(/[A-Za-z]/g, '');     // Quitar letras
  precioLimpio = precioLimpio.replace(/\./g, '');           // Quitar puntos
  precioLimpio = precioLimpio.replace(/,/g, '');            // Quitar comas
  precioLimpio = precioLimpio.trim();

  console.log(`Precio limpio: "${precioLimpio}"`);

  const precioNumero = parseInt(precioLimpio, 10);

  if (isNaN(precioNumero) || precioNumero <= 0) {
    console.error(` No se pudo convertir "${precioTexto}" a número`);
    return 0;
  }

  console.log(`Precio final: ${precioNumero.toLocaleString('es-CO')}`);

  return precioNumero;
}

/**
 * Extraer marca del título
 */
function extractBrandFromTitle(titulo) {
  const tituloLower = titulo.toLowerCase();
  
  const marcas = [
    'Samsung'
  ];
  
  for (const marca of marcas) {
    if (tituloLower.includes(marca.toLowerCase())) {
      return marca;
    }
  }
  
  return 'Unknown';
}