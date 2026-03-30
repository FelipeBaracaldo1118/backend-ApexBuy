
// SCRAPER DE PRODUCTOS SAMSUNG COLOMBIA CON PUPPETEER

// Este archivo usa Puppeteer (navegador headless) en lugar de Cheerio porque Samsung carga los precios dinámicamente con JavaScript

// IMPORTANTE: Requiere instalar Puppeteer
// npm install puppeteer


import puppeteer from 'puppeteer';
import { normalizeProduct } from "./normalizeProduct.js";

/** 
 * Función principal para extraer datos de un producto Samsung usando Puppeteer

 * @param {string} url - URL completa del producto en samsung.com/co
 * @returns {Object} - Objeto con los datos normalizados del producto
 
 
  - Samsung usa JavaScript para cargar el precio dinámicamente
  - Cheerio solo lee HTML estático, no ejecuta JavaScript
  - Puppeteer abre un navegador real y espera a que el precio se cargue
 */
export async function scrapeSamsungProduct(url) {
  // Variable para el navegador (la necesitamos fuera del try para cerrarla en el finally)
  let browser = null;

  try {
    console.log(`🔍 Iniciando scraping de Samsung: ${url}`);

  
    // PASO 1: INICIAR EL NAVEGADOR HEADLESS

    // headless: true = no abre ventana visible (corre en segundo plano)
    // args: configuración para que funcione en servidores sin interfaz gráfica
    
    browser = await puppeteer.launch({
      headless: true,  // true = invisible, false = ver el navegador (útil para debugging)
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Usa menos memoria
      ]
    });

    console.log('🌐 Navegador iniciado');

   
    // PASO 2: CREAR UNA NUEVA PESTAÑA (PAGE)
   
    
    const page = await browser.newPage();

    // Configurar el tamaño de la ventana (algunos sitios muestran contenido diferente en móvil vs desktop)
    await page.setViewport({ width: 1920, height: 1080 });

    // Configurar User-Agent para que parezca un navegador real
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('📄 Página creada, navegando a la URL...');

    
    // PASO 3: NAVEGAR A LA URL Y ESPERAR A QUE CARGUE
    
    // waitUntil: 'networkidle2' = espera a que no haya más de 2 conexiones de red activas
    // Esto asegura que el JavaScript ya se ejecutó y cargó el precio
    // timeout: 30 segundos máximo de espera
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Página cargada completamente');

    
    // PASO 4: ESPERAR A QUE EL PRECIO APAREZCA EN LA PÁGINA
    
    // Esperamos a que exista algún elemento que contenga el precio
    // Usamos múltiples selectores porque Samsung puede cambiar su estructura
    
    try {
      // Esperar máximo 10 segundos a que aparezca el precio
      await page.waitForSelector(
        '.price, [class*="price"], [data-price], meta[itemprop="price"]',
        { timeout: 10000 }
      );
      console.log('💰 Elemento de precio encontrado');
    } catch (error) {
      console.log('⚠️ No se detectó elemento de precio, intentando extraer de todas formas...');
    }

    
    // PASO 5: EXTRAER TODOS LOS DATOS USANDO page.evaluate()
    
    // page.evaluate() ejecuta código JavaScript DENTRO de la página
    // Es como abrir la consola del navegador y ejecutar código ahí
    
    const datos = await page.evaluate(() => {
      // ESTE CÓDIGO SE EJECUTA EN EL CONTEXTO DE LA PÁGINA DE SAMSUNG
      
      // EXTRAER TÍTULO
      
      
      let titulo = '';
      
      // Intento 1: Meta tag Open Graph
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        titulo = ogTitle.getAttribute('content') || '';
      }
      
      // Intento 2: Tag <title>
      if (!titulo) {
        titulo = document.title.split('|')[0].trim();
      }
      
      // Intento 3: H1 principal
      if (!titulo) {
        const h1 = document.querySelector('h1');
        titulo = h1 ? h1.innerText.trim() : '';
      }

      
      // EXTRAER PRECIO
      
      
      let precioTexto = '';
      
      // Intento 1: Buscar en meta tags (schema.org)
      const metaPrice = document.querySelector('meta[itemprop="price"]');
      if (metaPrice) {
        precioTexto = metaPrice.getAttribute('content') || '';
      }
      
      // Intento 2: Buscar en atributo data-price
      if (!precioTexto) {
        const dataPrice = document.querySelector('[pd-buying-price__new-price-currency]');
        if (dataPrice) {
          precioTexto = dataPrice.getAttribute('pd-buying-price__new-price-currency') || '';
        }
      }
      
      // Intento 3: Buscar en elementos con clase price
      if (!precioTexto) {
        const priceElements = document.querySelectorAll(
          '[class*="pd-buying-price__new-price-currency"]'
        );
        
        for (const elem of priceElements) {
          const texto = elem.innerText || elem.textContent || '';
          
          // Verificar que el texto tenga números y posiblemente símbolos de moneda
          if (texto.match(/[\d.,]/)) {
            precioTexto = texto;
            break;
          }
        }
      }
      
      // Intento 4: Buscar en todo el body texto que parezca precio
      // Buscar patrones como "$2.999.000" o "2999000"
      if (!precioTexto) {
        const bodyText = document.body.innerText;
        
        // Regex para encontrar precios en formato colombiano
        // Ejemplos: $2.999.000, 2.999.000, $2999000
        const priceMatch = bodyText.match(/\$?\s*[\d]{1,2}[.,]?[\d]{3}[.,]?[\d]{3}/);
        
        if (priceMatch) {
          precioTexto = priceMatch[0];
        }
      }

      // ──────────────────────────────────────────────────────────────────
      // EXTRAER DISPONIBILIDAD
      // ──────────────────────────────────────────────────────────────────
      
      const bodyTextLower = document.body.innerText.toLowerCase();
      
      const palabrasNoDisponible = [
        'agotado',
        'sin stock',
        'no disponible',
        'out of stock',
        'próximamente'
      ];
      
      let disponible = true;
      for (const palabra of palabrasNoDisponible) {
        if (bodyTextLower.includes(palabra)) {
          disponible = false;
          break;
        }
      }
      
    
      // ──────────────────────────────────────────────────────────────────
      // EXTRAER IMAGEN
      // ──────────────────────────────────────────────────────────────────
      
      let imagenUrl = '';
      
      // Intento 1: Meta tag Open Graph
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        imagenUrl = ogImage.getAttribute('content') || '';
      }
      
      // Intento 2: Primera imagen de producto
      if (!imagenUrl) {
        const productImage = document.querySelector(
          '.product-image img, .gallery img, [class*="product-img"] img, main img'
        );
        
        if (productImage) {
          imagenUrl = productImage.src || productImage.getAttribute('data-src') || '';
        }
      }

      // ──────────────────────────────────────────────────────────────────
      // EXTRAER CÓDIGO DE MODELO
      // ──────────────────────────────────────────────────────────────────
      
      let codigoModelo = '';
      
      // Intento 1: Buscar en SKU
      const sku = document.querySelector('[data-sku], [itemprop="sku"], .sku, .model-code');
      if (sku) {
        codigoModelo = sku.innerText || sku.textContent || '';
      }
      
      // Intento 2: Extraer de la URL
      if (!codigoModelo) {
        const urlParts = window.location.pathname.split('/');
        const ultimaParte = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
        codigoModelo = ultimaParte.toUpperCase().replace(/-/g, '');
      }

      // ──────────────────────────────────────────────────────────────────
      // RETORNAR TODOS LOS DATOS
      // ──────────────────────────────────────────────────────────────────
      
      return {
        titulo: titulo,
        precioTexto: precioTexto,
        disponible: disponible,
        imagenUrl: imagenUrl,
        codigoModelo: codigoModelo,
      };
    });

    console.log('📊 Datos extraídos del navegador:');
    console.log(`   Título: "${datos.titulo}"`);
    console.log(`   Precio (raw): "${datos.precioTexto}"`);
    console.log(`   Disponible: ${datos.disponible}`);
    console.log(`   Código: ${datos.codigoModelo}`);

    // ========================================================================
    // PASO 6: PROCESAR EL PRECIO
    // ========================================================================
    
    const precio = parsearPrecioSamsung(datos.precioTexto);

    if (!precio || precio <= 0) {
      throw new Error(`Precio inválido: "${datos.precioTexto}" no pudo ser convertido a número`);
    }

    // Asegurar que la URL de imagen sea completa
    let imagenCompleta = datos.imagenUrl;
    if (imagenCompleta && !imagenCompleta.startsWith('http')) {
      if (imagenCompleta.startsWith('//')) {
        imagenCompleta = 'https:' + imagenCompleta;
      } else if (imagenCompleta.startsWith('/')) {
        imagenCompleta = 'https://www.samsung.com' + imagenCompleta;
      }
    }

    // ========================================================================
    // PASO 7: ENSAMBLAR OBJETO FINAL
    // ========================================================================
    
    const datosExtraidos = {
      external_id: datos.codigoModelo || 'SAMSUNG_' + Date.now(),
      title:       datos.titulo,
      price:       precio,
      available:   datos.disponible,
      image:       imagenCompleta || null,
      vendor:      'Samsung',
    };

    console.log(`✅ Datos procesados exitosamente`);

    // ========================================================================
    // PASO 8: NORMALIZAR Y RETORNAR
    // ========================================================================
    
    return normalizeProduct(datosExtraidos, "Samsung");

  } catch (error) {
    // ========================================================================
    // MANEJO DE ERRORES
    // ========================================================================
    
    console.error('❌ Error en scraper de Samsung:', error.message);
    throw new Error(`Error scraping Samsung (${url}): ${error.message}`);

  } finally {
    // ========================================================================
    // PASO 9: CERRAR EL NAVEGADOR SIEMPRE
    // ========================================================================
    // Esto se ejecuta incluso si hubo un error
    // Es MUY IMPORTANTE cerrar el navegador para no tener memory leaks
    
    if (browser) {
      await browser.close();
      console.log('🔒 Navegador cerrado');
    }
  }
}

/**
 * Función auxiliar para convertir texto de precio a número
 * (Igual que en la versión con Cheerio)
 */
function parsearPrecioSamsung(precioTexto) {
  if (!precioTexto) {
    return 0;
  }

  let precioLimpio = String(precioTexto);

  console.log(`🧹 Limpiando precio: "${precioLimpio}"`);

  // Eliminar símbolos y letras
  precioLimpio = precioLimpio.replace(/\$/g, '').trim();
  precioLimpio = precioLimpio.replace(/[A-Za-z]/g, '');
  precioLimpio = precioLimpio.replace(/\./g, '');
  precioLimpio = precioLimpio.replace(/,/g, '');
  precioLimpio = precioLimpio.trim();

  console.log(`✨ Precio limpio: "${precioLimpio}"`);

  const precioNumero = parseInt(precioLimpio, 10);

  if (isNaN(precioNumero) || precioNumero <= 0) {
    console.error(`❌ No se pudo convertir "${precioTexto}" a número válido`);
    return 0;
  }

  console.log(`💵 Precio final: ${precioNumero.toLocaleString('es-CO')}`);

  return precioNumero;
}

// ============================================================================
// NOTAS IMPORTANTES
// ============================================================================
//
// 1. RENDIMIENTO:
//    Puppeteer es más lento que Cheerio (~3-5 segundos vs ~1 segundo)
//    pero es necesario porque Samsung usa JavaScript dinámico
//
// 2. MEMORIA:
//    Puppeteer usa más memoria porque abre un navegador completo
//    SIEMPRE cierra el navegador en el finally para evitar memory leaks
//
// 3. DEBUGGING:
//    Si algo falla, cambia headless: false para ver el navegador
//    También puedes tomar screenshots:
//    await page.screenshot({ path: 'debug.png' });
//
// 4. HEADLESS EN SERVIDORES:
//    Los args ('--no-sandbox', etc.) son necesarios para correr en servidores
//    sin interfaz gráfica (como AWS, Heroku, etc.)
//
// ============================================================================