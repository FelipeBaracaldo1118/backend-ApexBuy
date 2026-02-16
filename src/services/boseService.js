export async function getBoseProducts(url){
    //creamos la funcion para obtener los productos de bose, teniendo en cuenta la url que se le pasa como parametro
    //en este le indicamos que productos queremos obtener, vamos a obtener 3 productos de la pagina, por dfirente categoria
    
    const boseResponse = await fetch(url);
    const boseData = await boseResponse.json();

    return {
        externalId: data.id,
        name: data.title,
        brand: data.vendor,
        category: data.type,
        price: data.price / 100,
        sku: data.variants?.[0]?.sku, 
        image: `https:${data.featured_image}`
    }
}