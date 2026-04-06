// ============================================================================
// TEST FALABELLA - ALL PRODUCTS
// ============================================================================
// Script de testing para probar el scraper de Falabella con todas las URLs
// Ejecutar: node tests/test-falabella-allproducts.js
// ============================================================================

import { scrapeFalabellaProduct } from '../src/services/falabellaScraper.js';

// URLs a probar
const urls = [
  // Productos Bose
  {
    url: "https://www.falabella.com.co/falabella-co/product/70719486/Parlante-portatil-Bose-S1-PRO+-Bluetooth/70719486",
    nombre: "Parlante Bose S1 PRO+"
  },
  {
    url: "https://www.falabella.com.co/falabella-co/product/73097569/Altavoz-Bluetooth-portatil-Bose-SoundLink-Flex-(2.a-gen.)/73097571",
    nombre: "Altavoz Bose SoundLink Flex Gen 2"
  },
  {
    url: "https://www.falabella.com.co/falabella-co/product/73357092/Audifonos-Bose-QuietComfort-Noise-cancelling/73357093",
    nombre: "Audífonos Bose QuietComfort"
  },
  
  // Productos Samsung
  {
    url: "https://www.falabella.com.co/falabella-co/product/73298024/Televisor-Samsung-50-pulgadas-4K-Ultra-HD-UHD-UN50U8000FKXZL/73298024",
    nombre: "TV Samsung 50\" 4K UHD"
  },
  {
    url: "https://www.falabella.com.co/falabella-co/product/73000484/Lavadora-Secadora-Samsung-Electrica-26-kg-Bespoke-AI-Laundry-Combo-WD26DB8995BZCO-Heat-Pump-Secado-Optimo-en-50-Menos-Tiempo/73000484",
    nombre: "Lavadora Samsung 26kg Bespoke"
  },
  {
    url: "https://www.falabella.com.co/falabella-co/product/73298011/televisor-samsung-48-pulgadas-4k-oled-qn48s90faexzl/73298011",
    nombre: "TV Samsung 48\" OLED"
  },
  {
    url: "https://www.falabella.com.co/falabella-co/product/73150331/Nevecon-Samsung-Side-by-Side-578-Litros-RS57DG4100B4CO-con-Inteligencia-Artificial-/73150331",
    nombre: "Refrigerador Samsung 578L"
  }
];

//Funcion principal para ejecutar el test

async function testFalabellaAllProducts() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST FALABELLA - TODOS LOS PRODUCTOS');
  console.log('='.repeat(80));
  console.log(`📋 Total de URLs a probar: ${urls.length}\n`);

  const resultados = {
    exitosos: [],
    fallidos: [],
    total: urls.length
  };

  let contador = 0;

  for (const item of urls) {
    contador++;
    console.log('\n' + '─'.repeat(80));
    console.log(`🔍 PRODUCTO ${contador}/${urls.length}: ${item.nombre}`);
    console.log('─'.repeat(80));
    console.log(`🔗 URL: ${item.url}\n`);

    try {
      // Ejecutar scraper
      const inicio = Date.now();
      const data = await scrapeFalabellaProduct(item.url);
      const duracion = Date.now() - inicio;

      // Mostrar resultado
      console.log('✅ ÉXITO - Datos extraídos:');
      console.log('─'.repeat(80));
      console.log(`📦 SKU:           ${data.external_id}`);
      console.log(`📝 Título:        ${data.title}`);
      console.log(`💰 Precio:        $${data.price.toLocaleString('es-CO')}`);
      console.log(`🏷️  Marca:         ${data.brand}`);
      console.log(`📦 Disponible:    ${data.available ? '✅ Sí' : '❌ No'}`);
      console.log(`🏪 Vendor:        ${data.vendor}`);
      console.log(`⏱️  Tiempo:        ${duracion}ms`);
      console.log('─'.repeat(80));

      resultados.exitosos.push({
        nombre: item.nombre,
        url: item.url,
        data: data,
        duracion: duracion
      });

    } catch (error) {
      console.error('❌ ERROR:');
      console.error('─'.repeat(80));
      console.error(`Mensaje: ${error.message}`);
      console.error('─'.repeat(80));

      resultados.fallidos.push({
        nombre: item.nombre,
        url: item.url,
        error: error.message
      });
    }

    // Pausa de 2 segundos entre requests para no saturar el servidor
    if (contador < urls.length) {
      console.log('\n⏳ Esperando 2 segundos antes del siguiente producto...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

//Resumen del test
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMEN FINAL DEL TEST');
  console.log('='.repeat(80));
  console.log(`Total de productos probados:  ${resultados.total}`);
  console.log(`✅ Exitosos:                   ${resultados.exitosos.length}`);
  console.log(`❌ Fallidos:                   ${resultados.fallidos.length}`);
  console.log(`📈 Tasa de éxito:              ${((resultados.exitosos.length / resultados.total) * 100).toFixed(2)}%`);
  console.log('='.repeat(80));

  // Productos exitosos
  if (resultados.exitosos.length > 0) {
    console.log('\n✅ PRODUCTOS EXITOSOS:');
    console.log('─'.repeat(80));
    resultados.exitosos.forEach((r, i) => {
      console.log(`${i + 1}. ${r.nombre}`);
      console.log(`   Precio: $${r.data.price.toLocaleString('es-CO')} | Tiempo: ${r.duracion}ms`);
    });
  }

  // Productos fallidos
  if (resultados.fallidos.length > 0) {
    console.log('\n❌ PRODUCTOS FALLIDOS:');
    console.log('─'.repeat(80));
    resultados.fallidos.forEach((r, i) => {
      console.log(`${i + 1}. ${r.nombre}`);
      console.log(`   Error: ${r.error}`);
    });
  }

  // Tiempo promedio
  if (resultados.exitosos.length > 0) {
    const tiempoPromedio = resultados.exitosos.reduce((sum, r) => sum + r.duracion, 0) / resultados.exitosos.length;
    console.log('\n⏱️  RENDIMIENTO:');
    console.log('─'.repeat(80));
    console.log(`Tiempo promedio por producto: ${tiempoPromedio.toFixed(0)}ms`);
    console.log(`Tiempo total estimado:        ${((tiempoPromedio * urls.length) / 1000).toFixed(2)}s`);
  }

  // Precios encontrados
  if (resultados.exitosos.length > 0) {
    console.log('\n💰 PRECIOS ENCONTRADOS:');
    console.log('─'.repeat(80));
    const precioMin = Math.min(...resultados.exitosos.map(r => r.data.price));
    const precioMax = Math.max(...resultados.exitosos.map(r => r.data.price));
    const precioPromedio = resultados.exitosos.reduce((sum, r) => sum + r.data.price, 0) / resultados.exitosos.length;
    
    console.log(`Precio mínimo:    $${precioMin.toLocaleString('es-CO')}`);
    console.log(`Precio máximo:    $${precioMax.toLocaleString('es-CO')}`);
    console.log(`Precio promedio:  $${precioPromedio.toLocaleString('es-CO')}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🏁 TEST COMPLETADO');
  console.log('='.repeat(80) + '\n');

  // Retornar resultados para análisis programático
  return resultados;
}



console.log('🚀 Iniciando test de Falabella...\n');

testFalabellaAllProducts()
  .then(resultados => {
    // Si todos fallaron, salir con error
    if (resultados.fallidos.length === resultados.total) {
      console.error('\n❌ TODOS LOS PRODUCTOS FALLARON');
      console.error('Probablemente los selectores CSS necesitan ajuste.\n');
      process.exit(1);
    }
    
    // Si algunos fallaron, advertir pero salir OK
    if (resultados.fallidos.length > 0) {
      console.warn(`\n⚠️  ${resultados.fallidos.length} producto(s) fallaron`);
      console.warn('Revisa los selectores CSS para esos productos.\n');
    }
    
    // Éxito total
    if (resultados.fallidos.length === 0) {
      console.log('\n🎉 ¡TODOS LOS PRODUCTOS SE SCRAPEARON EXITOSAMENTE!\n');
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ ERROR FATAL EN EL TEST:', error.message);
    console.error(error.stack);
    process.exit(1);
  });