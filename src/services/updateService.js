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


/*
 Actualiza TODOS los productos Bose configurados
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


import { scrapeSamsungProduct } from "./samsungScraper.js";

export const updateSamsungProducts = async () => {
  const urls = [
    "https://www.samsung.com/co/tvs/uhd-4k-tv/u8000f-50-inch-crystal-uhd-4k-smart-tv-un50u8000fkxzl/",
    "https://www.samsung.com/co/tvs/oled-tv/s90f-48-inch-oled-4k-vision-ai-smart-tv-qn48s90faexzl/",
    "https://www.samsung.com/co/refrigerators/side-by-side/rs4000dc-sbside-with-large-capacity-rs4000dc-side-by-side-with-large-capacity-578l-black-rs57dg4100b4co/",
    "https://www.samsung.com/co/washers-and-dryers/washer-dryer-combo/wd8000dk-combo--all-in-one-combo-super-speed-26-kg-gray-wd26db8995bzco/"
  ];

  const source = await getSourceByName("Samsung");
  if (!source) throw new Error('Fuente Samsung no existe');

  const results = [];

  for (const url of urls) {
    try {
      const data = await scrapeSamsungProduct(url);
      const product = await getOrCreateProduct(data);
      await savePrice(product.id, source.id, data.price, data.available);
      results.push({ url, status: "ok", data });
    } catch (error) {
      results.push({ url, status: "error", error: error.message });
    }
  }

  return results;
};

export const updateSingleSamsungProduct = async (url) => {
  const source = await getSourceByName("Samsung");
  if (!source) throw new Error('Fuente Samsung no existe');

  const data = await scrapeSamsungProduct(url);
  const product = await getOrCreateProduct(data);
  await savePrice(product.id, source.id, data.price, data.available);

  return { url, status: "ok", data };
};