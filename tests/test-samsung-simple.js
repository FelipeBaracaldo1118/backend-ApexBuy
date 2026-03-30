
import { scrapeSamsungProduct } from '../src/services/samsungScraper.js';

console.log(' INICIANDO TEST SIMPLE DE SAMSUNG\n');
console.log('='.repeat(70));

// URL de prueba: TV UHD 50"
const url = 'https://www.samsung.com/co/refrigerators/side-by-side/rs4000dc-sbside-with-large-capacity-rs4000dc-side-by-side-with-large-capacity-578l-black-rs57dg4100b4co/';

console.log(`URL a probar:\n   ${url}\n`);
console.log('Extrayendo datos...\n');

const inicio = Date.now();

scrapeSamsungProduct(url)
  .then(datos => {
    const duracion = Date.now() - inicio;
    
    console.log('='.repeat(70));
    console.log('ÉXITO - Datos extraídos correctamente\n');
    
    console.log(' RESULTADOS:');
    console.log(`   External ID:   ${datos.external_id}`);
    console.log(`   Título:        ${datos.title}`);
    console.log(`   Precio:        $${datos.price.toLocaleString('es-CO')} COP`);
    console.log(`   Disponible:    ${datos.available ? 'Sí ✅' : 'No ❌'}`);
    console.log(`   Vendor:        ${datos.vendor}`);
    console.log(`   Tiene imagen:  ${datos.image ? 'Sí ✅' : 'No ❌'}`);
    
    console.log(`\n Tiempo: ${duracion}ms`);
    console.log('='.repeat(70));
    
    console.log('\n SIGUIENTE PASO:');
    console.log('   Integrar con updateService.js y probar con las 4 URLs\n');
    
    process.exit(0);
  })
  .catch(error => {
    const duracion = Date.now() - inicio;
    
    console.log('='.repeat(70));
    console.log('❌ ERROR - El scraper falló\n');
    
    console.log('📋 DETALLES DEL ERROR:');
    console.log(`   Mensaje: ${error.message}`);
    console.log(`   Tiempo transcurrido: ${duracion}ms`);
    
    console.log('\n🔍 POSIBLES CAUSAS:');
    console.log('   1. No tienes conexión a internet');
    console.log('   2. Samsung cambió la estructura HTML');
    console.log('   3. La URL no es válida');
    console.log('   4. Falta instalar Cheerio: npm install cheerio');
    
    console.log('\n💡 DEBUGGING:');
    console.log('   Revisa los logs arriba para ver en qué paso falló');
    console.log('   Cada paso del scraper tiene console.log() con emojis\n');
    
    console.log('='.repeat(70) + '\n');
    
    process.exit(1);
  });