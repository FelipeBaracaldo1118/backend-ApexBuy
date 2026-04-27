// SCRAPER DE PRODUCTOS SAMSUNG COLOMBIA CON PUPPETEER
// Clase correcta confirmada: .pd-buying-price__new-price-currency

import puppeteer from 'puppeteer';
import { normalizeProduct } from "./normalizeProduct.js";

export async function scrapeSamsungProduct(url) {
  let browser = null;

  try {
    console.log(`🔍 Iniciando scraping Samsung: ${url}`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    console.log('✅ Página cargada');

    // Esperar el elemento de precio confirmado
    try {
      await page.waitForSelector('.pd-buying-price__new-price-currency', { timeout: 12000 });
      console.log('✅ Elemento de precio encontrado (.pd-buying-price__new-price-currency)');
    } catch {
      console.log('⚠️  Selector principal no encontrado, intentando extraer igual...');
    }

    const datos = await page.evaluate(() => {
      // ── TÍTULO ──────────────────────────────────────────────────────────
      let titulo = '';
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) titulo = ogTitle.getAttribute('content') || '';
      if (!titulo) titulo = document.title.split('|')[0].trim();
      if (!titulo) {
        const h1 = document.querySelector('h1');
        titulo = h1 ? h1.innerText.trim() : '';
      }

      // ── PRECIO — estrategias en orden de prioridad ────────────────────
      let precioTexto = '';
      let estrategiaUsada = '';

      // 1. Clase confirmada: .pd-buying-price__new-price-currency
      const priceEl = document.querySelector('.pd-buying-price__new-price-currency');
      if (priceEl) {
        const candidates = [
          priceEl.textContent,
          priceEl.innerText,
          priceEl.innerHTML,
        ];
        for (const c of candidates) {
          if (c && c.match(/[\d]{1,3}[.,][\d]{3}/)) {
            precioTexto = c;
            estrategiaUsada = '1-clase-confirmada';
            break;
          }
        }
      }

      // 2. Todos los hijos del elemento de precio (el número puede estar en un span hijo)
      if (!precioTexto && priceEl) {
        const allChildren = priceEl.querySelectorAll('*');
        for (const child of allChildren) {
          const t = child.textContent || child.innerText || '';
          if (t.match(/[\d]{1,3}[.,][\d]{3}/)) {
            precioTexto = t;
            estrategiaUsada = '2-hijo-clase-confirmada';
            break;
          }
        }
      }

      // 3. Schema.org meta tag
      if (!precioTexto) {
        const meta = document.querySelector('meta[itemprop="price"]');
        if (meta) {
          precioTexto = meta.getAttribute('content') || '';
          estrategiaUsada = '3-meta-schema';
        }
      }

      // 4. JSON-LD structured data
      if (!precioTexto) {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
          try {
            const json = JSON.parse(s.textContent);
            const price = json?.offers?.price || json?.price;
            if (price && Number(price) > 0) {
              precioTexto = String(price);
              estrategiaUsada = '4-json-ld';
              break;
            }
          } catch {}
        }
      }

      // 5. Cualquier elemento con "price" en la clase
      if (!precioTexto) {
        const all = document.querySelectorAll('[class*="price"]');
        for (const el of all) {
          const t = (el.textContent || '').trim();
          if (t.match(/\$?\s*[\d]{1,3}[.,][\d]{3}[.,][\d]{3}/)) {
            precioTexto = t;
            estrategiaUsada = '5-clase-price';
            break;
          }
        }
      }

      // 6. Regex en todo el body (último recurso)
      if (!precioTexto) {
        const bodyText = document.body.innerText;
        const match = bodyText.match(/\$?\s*[\d]{1,2}[.,][\d]{3}[.,][\d]{3}/);
        if (match) {
          precioTexto = match[0];
          estrategiaUsada = '6-regex-body';
        }
      }

      // ── DISPONIBILIDAD ───────────────────────────────────────────────
      const bodyLower = document.body.innerText.toLowerCase();
      const noDisp = ['agotado', 'sin stock', 'no disponible', 'out of stock', 'próximamente'];
      const disponible = !noDisp.some(p => bodyLower.includes(p));

      // ── IMAGEN ───────────────────────────────────────────────────────
      let imagenUrl = '';
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) imagenUrl = ogImg.getAttribute('content') || '';
      if (!imagenUrl) {
        const img = document.querySelector('.image__main, [class*="product-image"] img');
        if (img) imagenUrl = img.src || img.getAttribute('data-src') || '';
      }

      // ── CÓDIGO DE MODELO ─────────────────────────────────────────────
      let codigoModelo = '';
      const sku = document.querySelector('[data-sku], [itemprop="sku"], .model-code');
      if (sku) codigoModelo = (sku.innerText || sku.textContent || '').trim();
      if (!codigoModelo) {
        const parts = window.location.pathname.split('/').filter(Boolean);
        codigoModelo = (parts[parts.length - 1] || parts[parts.length - 2] || '')
          .toUpperCase().replace(/-/g, '');
      }

      return { titulo, precioTexto, disponible, imagenUrl, codigoModelo, estrategiaUsada };
    });

    console.log(`📊 Título: "${datos.titulo}"`);
    console.log(`📊 Precio (raw): "${datos.precioTexto}" [estrategia: ${datos.estrategiaUsada}]`);
    console.log(`📊 Disponible: ${datos.disponible}`);

    const precio = parsearPrecioSamsung(datos.precioTexto);

    if (!precio || precio <= 0) {
      throw new Error(`No se pudo extraer precio válido de: "${datos.precioTexto}" — URL: ${url}`);
    }

    let imagenCompleta = datos.imagenUrl;
    if (imagenCompleta && !imagenCompleta.startsWith('http')) {
      imagenCompleta = imagenCompleta.startsWith('//')
        ? 'https:' + imagenCompleta
        : 'https://www.samsung.com' + imagenCompleta;
    }

    const datosExtraidos = {
      external_id: datos.codigoModelo || 'SAMSUNG_' + Date.now(),
      title:       datos.titulo,
      price:       precio,
      available:   datos.disponible,
      image:       imagenCompleta || null,
      vendor:      'Samsung',
    };

    console.log(`✅ Samsung OK: ${datosExtraidos.title} → $${precio.toLocaleString('es-CO')}`);
    return normalizeProduct(datosExtraidos, "Samsung");

  } catch (error) {
    console.error('❌ Error en scraper Samsung:', error.message);
    throw new Error(`Error scraping Samsung (${url}): ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Navegador cerrado');
    }
  }
}

function parsearPrecioSamsung(precioTexto) {
  if (!precioTexto) return 0;

  let s = String(precioTexto).trim();

  // Si es solo número (de JSON-LD), convertir directo
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return n > 0 ? n : 0;
  }

  // Remover todo excepto dígitos, puntos y comas
  s = s.replace(/[^0-9.,]/g, '');

  // Formato colombiano: 3.899.900 → separadores de miles son puntos
  // Detectar si hay dos puntos (miles) o punto decimal
  const dotsCount  = (s.match(/\./g) || []).length;
  const commaCount = (s.match(/,/g)  || []).length;

  if (dotsCount >= 2) {
    // 3.899.900 → quitar puntos
    s = s.replace(/\./g, '').replace(/,/g, '');
  } else if (dotsCount === 1 && commaCount === 0) {
    // Puede ser decimal (3.5) o miles (3.500) — si termina en 3 dígitos = miles
    const parts = s.split('.');
    if (parts[1] && parts[1].length === 3) {
      s = s.replace(/\./g, ''); // miles
    } else {
      s = s.replace(/\./g, ''); // tratar como entero
    }
  } else {
    s = s.replace(/\./g, '').replace(/,/g, '');
  }

  const n = parseInt(s, 10);
  if (isNaN(n) || n <= 0) {
    console.error(`❌ No se pudo parsear precio: "${precioTexto}"`);
    return 0;
  }

  console.log(`💵 Precio parseado: $${n.toLocaleString('es-CO')}`);
  return n;
}