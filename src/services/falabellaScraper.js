// ============================================================================
// SCRAPER DE PRODUCTOS FALABELLA - VERSIÓN PUPPETEER
// ============================================================================
// Falabella usa JavaScript para renderizar precios - requiere Puppeteer
// Validación: Solo productos vendidos por Falabella (no third-party)
// ============================================================================

import puppeteer from 'puppeteer';
import { normalizeProduct } from "./normalizeProduct.js";

/**
 * Scraper para productos de Falabella con Puppeteer
 * 
 * IMPORTANTE: Solo scrapeará productos donde el vendedor sea "Falabella"
 * 
 * @param {string} url - URL del producto
 * @returns {Object} - Datos normalizados del producto
 */
export async function scrapeFalabellaProduct(url) {
  let browser;
  
  try {
    console.log(`🛍️ Iniciando scraping de Falabella: ${url}`);

    // ========================================================================
    // PASO 1: INICIAR NAVEGADOR
    // ========================================================================
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Configurar viewport y user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('🌐 Navegador iniciado, cargando página...');

    // ========================================================================
    // PASO 2: NAVEGAR A LA PÁGINA
    // ========================================================================
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Página cargada');

    // Esperar un momento adicional para que JavaScript termine de renderizar
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ========================================================================
    // PASO 3: VALIDAR VENDEDOR
    // ========================================================================
    
    const vendedor = await page.evaluate(() => {
      // Buscar el vendedor en varios posibles selectores
      const selectors = [
        '.seller-info__seller_name',
        '[class*="seller-info"][class*="name"]',
        '[class*="seller"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim().toLowerCase();
        }
      }
      
      return '';
    });

    console.log(`🏪 Vendedor detectado: "${vendedor}"`);

    // VALIDACIÓN CRÍTICA
    if (vendedor && !vendedor.includes('falabella')) {
      throw new Error(`Producto vendido por "${vendedor}" (tercero). Solo se aceptan productos vendidos por Falabella.`);
    }

    if (!vendedor) {
      console.warn('⚠️ No se pudo detectar el vendedor. Continuando con precaución...');
    }

    // ========================================================================
    // PASO 4: EXTRAER DATOS DEL PRODUCTO
    // ========================================================================
    
    const datos = await page.evaluate(() => {
      const data = {
        titulo: '',
        precio: '',
        disponible: true,
        sku: ''
      };

      // TÍTULO
      const tituloSelectors = [
        'h1.product-title',
        'h1[class*="product"]',
        'h1',
        '[data-test-id="heading-pod"]',
        '.jsx-1479544169.product-header__title'
      ];
      
      for (const selector of tituloSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          data.titulo = element.textContent.trim();
          break;
        }
      }

      // PRECIO - Múltiples selectores posibles
      const precioSelectors = [
        '.price-1',
        '.copy2',
        '[class*="price"][class*="now"]',
        '[data-test-id="pod-price"]',
        '.jsx-1479544169.normal-price',
        '[class*="prices"] span',
        '.CMO_price',
        '[class*="product-price"]'
      ];
      
      for (const selector of precioSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const texto = element.textContent.trim();
          // Verificar que contiene números
          if (/\d/.test(texto)) {
            data.precio = texto;
            break;
          }
        }
      }

      // Si no encontró con selectores, buscar en todos los spans con "$"
      if (!data.precio) {
        const allSpans = Array.from(document.querySelectorAll('span'));
        for (const span of allSpans) {
          const texto = span.textContent.trim();
          if (texto.includes('$') && /\d{3,}/.test(texto)) {
            data.precio = texto;
            break;
          }
        }
      }

      // DISPONIBILIDAD
      const textoCompleto = document.body.textContent.toLowerCase();
      if (textoCompleto.includes('agotado') || 
          textoCompleto.includes('no disponible') ||
          textoCompleto.includes('sin stock')) {
        data.disponible = true;
      }

      return data;
    });

    console.log(`📝 Título: "${datos.titulo}"`);
    console.log(`💰 Precio (raw): "${datos.precio}"`);

    // ========================================================================
    // PASO 5: VALIDAR Y PROCESAR DATOS
    // ========================================================================
    
    if (!datos.titulo) {
      throw new Error('No se pudo encontrar el título del producto');
    }

    if (!datos.precio) {
      throw new Error('No se pudo encontrar el precio del producto');
    }

    const precio = parsearPrecioFalabella(datos.precio);

    if (!precio || precio <= 0) {
      throw new Error(`Precio inválido: "${datos.precio}"`);
    }

    // ========================================================================
    // PASO 6: EXTRAER SKU DE LA URL
    // ========================================================================
    
    let codigoProducto = '';
    const urlMatch = url.match(/\/product\/(\d{8})\//);
    if (urlMatch) {
      codigoProducto = urlMatch[1];
    } else {
      codigoProducto = 'FALABELLA_' + Date.now();
    }

    console.log(`🔢 Código: ${codigoProducto}`);

    // ========================================================================
    // PASO 7: DETECTAR MARCA
    // ========================================================================
    
    const marca = extractBrandFromTitle(datos.titulo);
    console.log(`🏷️ Marca: ${marca}`);
    console.log(`📦 Disponible: ${datos.disponible ? 'Sí' : 'No'}`);

    // ========================================================================
    // PASO 8: NORMALIZAR Y RETORNAR
    // ========================================================================
    
    console.log(`✅ Scraping completado exitosamente`);

    return normalizeProduct({
      external_id: codigoProducto,
      title:       datos.titulo,
      price:       precio,
      available:   datos.disponible,
      image:       null,
      vendor:      "Falabella",
    }, "Falabella");

  } catch (error)  {
    console.error('❌ Error en scraper de Falabella:', error.message);
    throw new Error(`Error scraping Falabella (${url}): ${error.message}`);
  } finally {
    // ========================================================================
    // PASO 9: CERRAR NAVEGADOR
    // ========================================================================
    if (browser) {
      await browser.close();
      console.log('🔒 Navegador cerrado');
    }
  }
}

/**
 * Parsear precio de Falabella a número
 */
function parsearPrecioFalabella(precioTexto) {
  if (!precioTexto) {
    return 0;
  }

  let precioLimpio = String(precioTexto);

  console.log(`🧹 Limpiando precio: "${precioLimpio}"`);

  // Eliminar símbolos y texto
  precioLimpio = precioLimpio.replace(/\$/g, '');
  precioLimpio = precioLimpio.replace(/COP/gi, '');
  precioLimpio = precioLimpio.replace(/[A-Za-z]/g, '');
  precioLimpio = precioLimpio.replace(/\./g, '');
  precioLimpio = precioLimpio.replace(/,/g, '');
  precioLimpio = precioLimpio.replace(/\s/g, '');
  precioLimpio = precioLimpio.trim();

  console.log(`✨ Precio limpio: "${precioLimpio}"`);

  const precioNumero = parseInt(precioLimpio, 10);

  if (isNaN(precioNumero) || precioNumero <= 0) {
    console.error(`❌ No se pudo convertir "${precioTexto}" a número`);
    return 0;
  }

  console.log(`💵 Precio final: ${precioNumero.toLocaleString('es-CO')}`);

  return precioNumero;
}

/**
 * Extraer marca del título
 */
function extractBrandFromTitle(titulo) {
  const tituloLower = titulo.toLowerCase();
  
  const marcas = [
    'Samsung',
    'Bose'
  ];
  
  for (const marca of marcas) {
    if (tituloLower.includes(marca.toLowerCase())) {
      return marca;
    }
  }
  
  return 'Unknown';
}