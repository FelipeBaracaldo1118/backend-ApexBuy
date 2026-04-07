
import { pool } from '../config/database.js';


/**
 * Análisis de un producto individual
 * Obtiene el último precio por cada fuente y calcula el análisis
 */
export const getProductAnalysis = async (productId) => {
  try {
    // Obtener producto con sus precios más recientes por fuente
    const { data: product, error: productError } = await pool
      .from('products')
      .select(`
        id,
        name,
        brand,
        product_group_id
      `)
      .eq('id', productId)
      .single();

    if (productError) throw productError;
    if (!product) return null;

    // Obtener último precio de cada fuente para este producto
    const { data: prices, error: pricesError } = await pool
      .from('prices')
      .select(`
        price,
        available,
        created_at,
        source_id,
        sources (
          id,
          name,
          role,
          wholesale_discount
        )
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (pricesError) throw pricesError;
    if (!prices || prices.length === 0) return null;

    // Agrupar por fuente y tomar el más reciente de cada una
    const latestPricesBySource = {};
    prices.forEach(p => {
      const sourceId = p.sources.id;
      if (!latestPricesBySource[sourceId]) {
        latestPricesBySource[sourceId] = p;
      }
    });

    const latestPrices = Object.values(latestPricesBySource);

    // Separar proveedores y competidores
    const providerPrices = latestPrices.filter(p => p.sources.role === 'provider');
    const competitorPrices = latestPrices.filter(p => p.sources.role === 'competitor');

    // Calcular precio de proveedor (con descuento)
    let supplierPrice = null;
    let supplierCost = null;

    if (providerPrices.length > 0) {
      const providerPrice = providerPrices[0];
      supplierPrice = providerPrice.price;
      const discount = providerPrice.sources.wholesale_discount / 100;
      supplierCost = Math.round(supplierPrice * (1 - discount));
    }

    // Calcular precios de competencia
    const competitorMin = competitorPrices.length > 0 
      ? Math.min(...competitorPrices.map(p => p.price))
      : null;

    const competitorMax = competitorPrices.length > 0
      ? Math.max(...competitorPrices.map(p => p.price))
      : null;

    const competitorAvg = competitorPrices.length > 0
      ? Math.round(competitorPrices.reduce((sum, p) => sum + p.price, 0) / competitorPrices.length)
      : null;

    // Calcular profit y margen
    let profit = null;
    let marginPercentage = null;
    let opportunity = null;

    if (supplierCost && competitorAvg) {
      profit = competitorAvg - supplierCost;
      marginPercentage = ((profit / competitorAvg) * 100).toFixed(2);
      opportunity = profit > 0 ? ' OPORTUNIDAD' : ' NO CONVIENE';
    }

    return {
      product_id: productId,
      product_name: product.name,
      brand: product.brand,
      group_id: product.product_group_id,
      supplierPrice,
      supplierCost,
      competitor: {
        min: competitorMin,
        max: competitorMax,
        avg: competitorAvg
      },
      profit,
      marginPercentage: marginPercentage ? parseFloat(marginPercentage) : null,
      opportunity,
      sourceBreakdown: latestPrices.map(p => ({
        source: p.sources.name,
        type: p.sources.role,
        price: p.price,
        available: p.available,
        lastUpdated: p.created_at
      }))
    };

  } catch (error) {
    console.error(' Error en getProductAnalysis:', error);
    throw error;
  }
};

/**
 * Análisis de un grupo de productos
 * Compara proveedores vs competidores para todo el grupo
 */
export const getProductGroupAnalysis = async (groupId) => {
  try {
    // Obtener todos los productos del grupo
    const { data: products, error: productsError } = await pool
      .from('products')
      .select(`
        id,
        name,
        brand,
        source_id,
        sources (
          id,
          name,
          role,
          type,
          wholesale_discount
        )
      `)
      .eq('product_group_id', groupId);

    if (productsError) throw productsError;
    if (!products || products.length === 0) return null;

    // Obtener últimos precios de todos estos productos
    const productIds = products.map(p => p.id);

    const { data: allPrices, error: pricesError } = await pool
      .from('prices')
      .select('product_id, price, available, created_at, source_id')
      .in('product_id', productIds)
      .order('created_at', { ascending: false });

    if (pricesError) throw pricesError;

    // Agrupar precios por producto y tomar el más reciente de cada uno
    const latestPricesByProduct = {};
    allPrices.forEach(price => {
      const key = `${price.product_id}-${price.source_id}`;
      if (!latestPricesByProduct[key]) {
        latestPricesByProduct[key] = price;
      }
    });

    const latestPrices = Object.values(latestPricesByProduct);

    // Enriquecer precios con información del producto
    const enrichedPrices = latestPrices.map(price => {
      const product = products.find(p => p.id === price.product_id);
      return {
        ...price,
        productName: product?.name,
        source: product?.sources.name,
        type: product?.sources.role,
        method: product?.sources.type,
        wholesale_discount: product?.sources.wholesale_discount || 0
      };
    });

    // Separar por tipo
    const providerPrices = enrichedPrices.filter(p => p.type === 'provider');
    const competitorPrices = enrichedPrices.filter(p => p.type === 'competitor');

    // Verificar si tenemos ambos tipos
    let status = 'complete';
    if (providerPrices.length === 0) status = 'missing_provider';
    if (competitorPrices.length === 0) status = 'missing_competitor';

    // Calcular precio promedio de proveedor (con descuento)
    let supplierPrice = null;
    let supplierCost = null;

    if (providerPrices.length > 0) {
      const avgPrice = providerPrices.reduce((sum, p) => sum + p.price, 0) / providerPrices.length;
      const avgDiscount = providerPrices.reduce((sum, p) => sum + (p.wholesale_discount || 0), 0) / providerPrices.length;
      
      supplierPrice = Math.round(avgPrice);
      supplierCost = Math.round(avgPrice * (1 - avgDiscount / 100));
    }

    // Calcular precios de competencia
    const competitorMin = competitorPrices.length > 0
      ? Math.min(...competitorPrices.map(p => p.price))
      : null;

    const competitorMax = competitorPrices.length > 0
      ? Math.max(...competitorPrices.map(p => p.price))
      : null;

    const competitorAvg = competitorPrices.length > 0
      ? Math.round(competitorPrices.reduce((sum, p) => sum + p.price, 0) / competitorPrices.length)
      : null;

    // Calcular profit y margen
    let profit = null;
    let marginPercentage = null;
    let opportunity = null;

    if (supplierCost && competitorAvg) {
      profit = competitorAvg - supplierCost;
      marginPercentage = ((profit / competitorAvg) * 100).toFixed(2);
      opportunity = profit > 0 ? '✅ OPORTUNIDAD' : '❌ NO CONVIENE';
    }

    return {
      group_id: groupId,
      status,
      supplierPrice,
      supplierCost,
      competitor: {
        min: competitorMin,
        max: competitorMax,
        avg: competitorAvg
      },
      profit,
      marginPercentage: marginPercentage ? parseFloat(marginPercentage) : null,
      opportunity,
      sourceBreakdown: enrichedPrices
    };

  } catch (error) {
    console.error(' Error en getProductGroupAnalysis:', error);
    throw error;
  }
};

//FUNCIONES CON SQL PARA ANALATICAS DEL NEGOCIO 
/**
 * Obtener todas las oportunidades de negocio (usa función SQL)
 * 
 * @returns {Array} - Lista de oportunidades ordenadas por ganancia
 */
export const getOpportunities = async () => {
  try {
    console.log('📊 Obteniendo oportunidades de negocio...');

    // ✅ CORRECTO - pg pool
    const result = await pool.query('SELECT * FROM get_opportunities()');
    const data = result.rows;

    console.log(`✅ ${data?.length || 0} oportunidades encontradas`);
    return data || [];

  } catch (error) {
    console.error('❌ Error en getOpportunities:', error.message);
    throw new Error(`Error obteniendo oportunidades: ${error.message}`);
  }
};


/**
 * Filtrar oportunidades por criterios
 
 * @param {Object} filters - Filtros a aplicar
 * @param {Number} filters.minMargin - Margen mínimo (%)
 * @param {Number} filters.minGanancia - Ganancia mínima (pesos)
 * @param {String} filters.decision - 'OPORTUNIDAD' o 'NO CONVIENE'
 * 
 * @returns {Array} - Oportunidades filtradas
 */
export const getOpportunitiesFiltered = async (filters = {}) => {
  try {
    console.log(' Obteniendo oportunidades con filtros:', filters);

    // Obtener todas las oportunidades
    const opportunities = await getOpportunities();

    // Aplicar filtros en backend (porque son dinámicos)
    let filtered = opportunities;

    if (filters.minMargin !== undefined) {
      filtered = filtered.filter(o => o.margen_porcentaje >= filters.minMargin);
    }

    if (filters.minGanancia !== undefined) {
      filtered = filtered.filter(o => o.ganancia >= filters.minGanancia);
    }

    if (filters.decision) {
      const decisionFilter = filters.decision.includes('OPORTUNIDAD') 
        ? '✅ OPORTUNIDAD' 
        : '❌ NO CONVIENE';
      filtered = filtered.filter(o => o.decision === decisionFilter);
    }

    console.log(` ${filtered.length} oportunidades después de filtrar`);

    return filtered;

  } catch (error) {
    console.error(' Error en getOpportunitiesFiltered:', error.message);
    throw error;
  }
};

/**
 * Obtener historial de precios de un producto 
  
 * @param {String} productId - UUID del producto
 * @param {Number} limit - Cantidad de registros (default: 30)
 * @returns {Array} - Historial de precios
 */
export const getPriceHistory = async (productId, limit = 30) => {
  try {
    console.log(`📊 Obteniendo historial de precios: ${productId} (últimos ${limit})`);

    // ✅ CORRECTO - pg pool con parámetros
    const result = await pool.query(
      'SELECT * FROM get_price_history($1, $2)',
      [productId, limit]
    );
    const data = result.rows;

    console.log(`✅ ${data?.length || 0} registros de precio encontrados`);
    return data || [];

  } catch (error) {
    console.error('❌ Error en getPriceHistory:', error.message);
    throw new Error(`Error obteniendo historial: ${error.message}`);
  }
};

/**
 Detectar cambios significativos de precio
 
 * @param {String} productId - UUID del producto
 * @param {Number} threshold - Umbral de cambio (%, default: 5)
 * @returns {Array} - Cambios significativos detectados
 */
export const detectPriceChanges = async (productId, threshold = 5) => {
  try {
    console.log(` Detectando cambios de precio > ${threshold}%`);

    // Obtener historial completo
    const history = await getPriceHistory(productId, 100);

    if (history.length < 2) {
      return [];
    }

    const changes = [];

    // Comparar cada precio con el anterior
    for (let i = 0; i < history.length - 1; i++) {
      const current = history[i];
      const previous = history[i + 1];

      const priceDiff = current.precio - previous.precio;
      const percentChange = (priceDiff / previous.precio) * 100;

      if (Math.abs(percentChange) >= threshold) {
        changes.push({
          fecha: current.fecha,
          precio_anterior: previous.precio,
          precio_nuevo: current.precio,
          diferencia: priceDiff,
          porcentaje_cambio: Math.round(percentChange * 100) / 100,
          tipo: priceDiff > 0 ? 'AUMENTO' : 'DISMINUCIÓN'
        });
      }
    }

    console.log(` ${changes.length} cambios significativos detectados`);

    return changes;

  } catch (error) {
    console.error(' Error en detectPriceChanges:', error.message);
    throw error;
  }
};

/**
  Estadísticas generales del sistema
  
 @returns {Object} - Estadísticas globales
 */
 export const getGlobalStats = async () => {
  try {
    console.log('📊 Obteniendo estadísticas globales...');

    // Total de productos
    const { rows: [{ count: totalProducts }] } = await pool.query(
      'SELECT COUNT(*) FROM products'
    );

    // Total de fuentes
    const { rows: [{ count: totalSources }] } = await pool.query(
      'SELECT COUNT(*) FROM sources'
    );

    // Total de grupos
    const { rows: [{ count: totalGroups }] } = await pool.query(
      'SELECT COUNT(*) FROM product_groups'
    );

    // Total de registros de precios
    const { rows: [{ count: totalPriceRecords }] } = await pool.query(
      'SELECT COUNT(*) FROM prices'
    );

    // Oportunidades
    const opportunities = await getOpportunities();
    const oportunidadesCount = opportunities.filter(o => 
      o.decision === '✅ OPORTUNIDAD'
    ).length;

    const stats = {
      products: parseInt(totalProducts) || 0,
      sources: parseInt(totalSources) || 0,
      groups: parseInt(totalGroups) || 0,
      price_records: parseInt(totalPriceRecords) || 0,
      opportunities: oportunidadesCount,
      no_conviene: opportunities.length - oportunidadesCount
    };

    console.log('✅ Estadísticas obtenidas:', stats);

    return stats;

  } catch (error) {
    console.error('❌ Error en getGlobalStats:', error.message);
    throw error;
  }
};