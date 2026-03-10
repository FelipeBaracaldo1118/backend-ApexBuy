import { getBoseProduct } from "./boseService.js";
import { getOrCreateProduct } from "./productService.js";
import { savePrice } from "./priceService.js";
import { getSourceByName } from "./sourceService.js";

/*
 Actualiza UN producto Bose
 */
export const updateSingleBoseProduct = async (handle) => {

  const source = await getSourceByName("Bose");

  if (!source) {
    throw new Error("Source Bose no existe en la tabla sources");
  }

  const url = `https://bose.co/products/${handle}.js`;

  console.log(`🔎 Actualizando producto Bose: ${handle}`);

  const data = await getBoseProduct(url);

  const product = await getOrCreateProduct(data);

  await savePrice(
    product.id,
    source.id,
    data.price,
    data.available
  );

  return {
    handle,
    status: "ok",
    data
  };
};


/**
 * 🔵 Actualiza TODOS los productos Bose configurados
 */
export const updateBoseProducts = async () => {

  const handles = [
    "parlante-bose-s1-pro-plus",
    "altavoz-portatil-bose-soundlink-flex-2da-gen",
    "audifonos-bose-quietcomfort"
  ];

  const results = [];

  for (const handle of handles) {

    try {
      const result = await updateSingleBoseProduct(handle);
      results.push(result);

    } catch (error) {

      console.error(`❌ Error en ${handle}:`, error.message);

      results.push({
        handle,
        status: "error",
        error: error.message
      });
    }
  }

  return results;
};