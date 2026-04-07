/**
 Estándar de datos para extracción.
 
  TODAS las fuentes (boseService, samsungService, scrapers) deben pasar
  su output por esta función antes de enviarlo al pipeline.
 
  Esto garantiza que productService y priceService siempre reciben
  exactamente los campos que esperan, sin importar la fuente.
 */

// Campos requeridos que toda fuente debe proveer
const REQUIRED_FIELDS = ["external_id", "title", "price", "vendor"];

/**
  Normaliza y valida el output crudo de cualquier servicio de extracción.
 
  @param {object} raw        - Datos inciales de los productos extraidos de cada pagina (boseService, scraper, etc.)
  @param {string} sourceName - Nombre de la fuente donde se extrajo el producto, para mensajes de error
  @returns {NormalizedProduct}
  @throws {Error} si algún campo requerido está ausente o el precio es inválido
 */
  export function normalizeProduct(data, sourceName) {
    // Validación básica
    if (!data.title || !data.price) {
      throw new Error(`Datos incompletos: ${JSON.stringify(data)}`);
    }
  
    // Normalizar available a boolean
    let available = true;  // Default
    
    if (data.available !== undefined) {
      // Si es boolean, usar directamente
      if (typeof data.available === 'boolean') {
        available = data.available;
      }
      // Si es string, convertir
      else if (typeof data.available === 'string') {
        available = data.available.toLowerCase() !== 'no' && 
                    data.available.toLowerCase() !== 'false';
      }
    }
  
    return {
      external_id: data.external_id,
      title: data.title,
      brand: data.brand || extractBrand(data.title),
      price: parseInt(data.price),
      available: available,  // ← Siempre boolean
      image: data.image || null,
      vendor: sourceName
    };
  }
  
  function extractBrand(title) {
    const brands = ['Samsung', 'LG', 'Bose', 'Sony', 'Apple', /* ... */];
    const titleLower = title.toLowerCase();
    
    for (const brand of brands) {
      if (titleLower.includes(brand.toLowerCase())) {
        return brand;
      }
    }
    
    return 'Unknown';
  }

