import fetch from 'node-fetch';

const url = 'https://www.ktronix.com/parlante-bose-soundlink-flex-ii-negro/p/017817852470';

fetch(url)
  .then(res => res.text())
  .then(html => {
    if (html.includes('{{') || html.includes('Vue') || html.includes('React')) {
      console.log('⚠️ Ktronix usa JavaScript dinámico → Necesita Puppeteer');
    } else if (html.includes('precio') || html.includes('price')) {
      console.log('✅ Ktronix tiene HTML estático → Cheerio funciona');
      
      // Buscar si el precio está visible
      const match = html.match(/\$[\d.,]+/);
      if (match) {
        console.log('💰 Precio encontrado en HTML:', match[0]);
      }
    } else {
      console.log('❓ No claro, hay que revisar manualmente');
    }
  });