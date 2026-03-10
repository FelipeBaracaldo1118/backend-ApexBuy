export async function getBoseProduct(url) {

  //teniendo en cuenta el tipo de dato que se obtiene de la API de Bose, se debe convertir a un objeto JavaScript
  // se usa headers para simular un navegador web
  // se usa fetch para obtener los datos de la API de Bose
  // se usa await para esperar a que se obtengan los datos de la API de Bose
  // se usa try para manejar los errores que se puedan presentar
  // se usa catch para manejar los errores que se puedan presentar
  // se usa return para retornar los datos de la API de Bose
  // se usa console.error para imprimir los errores que se puedan presentar
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    return {
      external_id: data.id,
      title: data.title,
      price: data.price /100, // Shopify maneja centavos
      available: data.available,
      image: `https:${data.featured_image}`,
      vendor: data.vendor,
    };

  } catch (error) {
    console.error("❌ Bose service error:", error);
    throw new Error("Error obteniendo producto desde Bose");
  }
}