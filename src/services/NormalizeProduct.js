/**
 * Estándar de datos para extracción.
 *
 * TODAS las fuentes (boseService, samsungService, scrapers) deben pasar
 * su output por esta función antes de enviarlo al pipeline.
 *
 * Esto garantiza que productService y priceService siempre reciben
 * exactamente los campos que esperan, sin importar la fuente.
 */

// Campos requeridos que toda fuente debe proveer
const REQUIRED_FIELDS = ["external_id", "title", "price", "vendor"];

/**
 * Normaliza y valida el output crudo de cualquier servicio de extracción.
 *
 * @param {object} raw        - Datos crudos del servicio (boseService, scraper, etc.)
 * @param {string} sourceName - Nombre legible de la fuente, para mensajes de error
 * @returns {NormalizedProduct}
 * @throws {Error} si algún campo requerido está ausente o el precio es inválido
 */
export function normalizeProduct(raw, sourceName = "unknown") {

  //  Validar campos requeridos 
  for (const field of REQUIRED_FIELDS) {
    if (raw[field] === undefined || raw[field] === null || raw[field] === "") {
      throw new Error(
        `[normalizeProduct] Campo requerido faltante: "${field}" en fuente "${sourceName}"`
      );
    }
  }

  //Validar precio 
  const price = parseFloat(raw.price);

  if (isNaN(price) || price < 0) {
    throw new Error(
      `[normalizeProduct] Precio inválido: "${raw.price}" en fuente "${sourceName}"`
    );
  }

  //  Retornar objeto normalizado 
  // Esta es la forma canónica que todo el pipeline espera.
  return {
    external_id: String(raw.external_id),
    title:       String(raw.title).trim(),
    price:       price,
    available:   raw.available !== undefined ? Boolean(raw.available) : true,
    image:       raw.image     || null,
    vendor:      String(raw.vendor).trim(),
  };
}

