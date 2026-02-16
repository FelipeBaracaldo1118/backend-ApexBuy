export async function getBoseProduct(url) {
    try {
      const response = await fetch(url);
  
      if (!response.ok) {
        throw new Error("Error obteniendo producto desde Bose");
      }
  
      const data = await response.json();
  
      return {
        external_id: data.id,
        title: data.title,
        price: data.price / 100, // Shopify maneja centavos
        available: data.available,
        image: `https:${data.featured_image}`,
        vendor: data.vendor
      };
  
    } catch (error) {
      console.error("❌ Bose service error:", error);
      throw error;
    }
  }