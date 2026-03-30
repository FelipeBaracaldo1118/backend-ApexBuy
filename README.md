# ApexBuy Analisis de Mercado

## Descripción del proyecto

ApexBuy es un sistema de monitoreo competitivo de precios diseñado para automatizar la recolección y análisis de precios de productos entre distintos proveedores. El objetivo del sistema es apoyar la toma de decisiones comerciales y de compras mediante la comparación estructurada de precios y el análisis histórico de la información.

Este repositorio contiene el backend del sistema, encargado de:

- Gestionar productos y proveedores

- Almacenar el historial de precios

- Proveer datos al dashboard frontend

- Preparar la infraestructura para la integración de web scraping automatizado

Esta versión corresponde a la Fase 1 del MVP, donde se construye la base del backend y la estructura de datos.



## Objetivo del MVP

    El objetivo principal de esta fase es establecer la arquitectura backend estable que permita:
    - Registrar los productos definidos (7 productos de acuerdo a las necesidades de la empresa (mayor comercializacion, mayor oportunidad, etc))
    - Asociar multiples proveedores a cada producto
    - Almacenar historico de precios
    - Exponer endpoints para consumo del frontend
    - Preparar la integración futura de scrapers automatizados

## Lo que se ha creado

- **Config**
  - `config/env.js` — Carga de variables de entorno (`.env`) para el backend.
  - `config/database.js` — Conexión a PostgreSQL mediante un pool usando `DATABASE_URL`.

- **Servicios**
  - `services/productService.js` — Búsqueda de productos por `external_id` para vincular datos del proveedor con la base de datos.
  - `services/priceService.js` — Guardado del histórico de precios en la tabla `prices`.
  - `services/boseService.js` — Obtención de datos de producto (precio, disponibilidad, imagen, etc.) desde la fuente Bose (JSON).
  - `services/updateService.js` — Orquestación de actualización de precios por fuente: actualización individual y masiva para Bose y Samsung, incluyendo guardado en DB.
  - `services/samsungScraper.js` — Scraper de Samsung Colombia con Puppeteer para extraer datos dinámicos (título, precio, disponibilidad, imagen y código).
  - `services/NormalizeProduct.js` — Capa de normalización y validación para estandarizar los datos extraídos antes de persistirlos.
  - `services/analysisService.js` — Análisis de precios por producto: obtiene precios por fuente, distingue proveedor (Bose/Samsung) vs competencia (Ktronix/Mansion), calcula costo, ganancia, margen y clasifica la oportunidad (ALTA/MEDIA/BAJA).
  - `services/Productgroupservice.js` — Gestión de grupos de productos: creación, listado, obtención por ID, vinculación/desvinculación de productos y conteo de productos por grupo.

- **Rutas**
  - `routes/update.js` — Montada en `/api/update`. Expone actualización de precios por fuente:
    - Bose masivo: `GET /api/update/bose`
    - Bose individual por handle: `GET /api/update/bose/:handle`
    - Samsung masivo: `GET /api/update/samsung`
    - Samsung individual por URL: `GET /api/update/samsung-single?url=...`
  - `routes/analysis.js` — Montada en `/api/analysis`. Endpoint para obtener el análisis de un producto por ID: precios proveedor/competencia, margen y nivel de oportunidad (ej. `GET /api/analysis/:productId`).
  - `routes/admin.js` — Montada en `/api/admin`. Endpoints de administración para grupos de productos: crear grupos, listar grupos, obtener detalle de un grupo con sus productos, vincular múltiples productos a un grupo y desvincular productos.

- **Servidor**
  - `server.js` — Express con CORS, JSON, health check (`/api/health`), rutas `/api/update`, `/api/analysis` y `/api/admin`, y verificación de conexión a la base de datos.

## Pruebas

- `tests/test-samsung-simple.js` — Test rápido para validar el scraper de Samsung con una URL real, verificar extracción de campos clave y comprobar que el flujo responde correctamente.

## Arquitectura General
### Cliente - Servidor 

    Frontend (Dashboard React)
            ↓
        Backend API
          (Express)
            ↓
         PostgreSQL

