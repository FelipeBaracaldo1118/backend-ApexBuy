# ApexBuy — Backend (análisis de mercado)

## Qué es este repositorio

Backend en **Node.js** para **monitoreo competitivo de precios**: obtiene precios de sitios de **proveedores** (Bose, Samsung) y de **competencia** (Ktronix), los guarda en **PostgreSQL** y expone una **API REST** para el dashboard y para análisis (margen, oportunidad, comparativas por grupo).

---

## Estado actual (lo que ya está implementado)

| Área | Qué hay hoy |
|------|-------------|
| **Catálogo de negocio** | **7 líneas de producto** a vigilar (las mismas referencias se comparan en dos frentes). |
| **Registros en base** | **14 productos** persistidos: **7** filas ligadas a fuentes **proveedor** (Bose + Samsung) y **7** a la fuente **competidor** (Ktronix), alineados para comparar el mismo universo de ítems. |
| **Fuentes en código** | **Bose** (API JSON), **Samsung** (navegador headless), **Ktronix** (HTML parseado). |
| **Histórico** | Cada actualización inserta en la tabla de precios (`prices`) para análisis temporal. |
| **Normalización** | Todo lo extraído pasa por `normalizeProduct` antes de crear/actualizar productos y precios. |
| **Grupos (admin)** | CRUD de **grupos de productos** y vínculo producto ↔ grupo para análisis agregado. |

---

## Stack técnico

- **Runtime:** Node.js (ES modules).
- **API:** Express 5, CORS, JSON body.
- **Base de datos:** PostgreSQL vía `pg` (pool + `DATABASE_URL`).
- **Extracción:** **Cheerio** (Ktronix, HTML estático), **Puppeteer** (Samsung, precio/contenido dinámico), **fetch + JSON** (Bose, endpoint `.js` tipo Shopify).
- **Desarrollo:** `nodemon` (`npm run dev`).

---

## Cómo se actualizan los precios (flujo)

1. Se elige la fuente (Bose / Samsung / Ktronix) o se lanza **todas** con un solo endpoint.
2. Se obtienen datos crudos (API o scraper).
3. **`normalizeProduct`** valida campos mínimos y forma del precio.
4. **`getOrCreateProduct`** busca por `external_id` o crea fila en `products`.
5. **`getSourceByName`** resuelve el `source_id` (Bose, Samsung, Ktronix deben existir en `sources`).
6. **`savePrice`** registra el precio en `prices`.

Orden interno en actualización global: **Bose → Samsung → Ktronix** (rápido → lento por Puppeteer → medio con Cheerio).

---

## Fuentes: rol y técnica

| Fuente | Rol típico | Método | Cantidad configurada en código |
|--------|------------|--------|--------------------------------|
| **Bose** | Proveedor | API `https://bose.co/products/{handle}.js` | **3** handles |
| **Samsung** | Proveedor | **Puppeteer** (`samsungScraper.js`) | **4** URLs |
| **Ktronix** | Competidor | **Cheerio** (`ktronixScraper.js`) | **7** URLs |

En una corrida completa (`/api/update/all-providers`) se intentan **14** actualizaciones de producto (3 + 4 + 7).

---

## API REST (rutas montadas)

**Base:** el servidor escucha el puerto de `PORT` o **3000**.

### Salud

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Comprueba que el backend responde. |

### Actualización de precios — prefijo `/api/update`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/update/bose` | Actualiza los **3** productos Bose configurados. |
| `GET` | `/api/update/bose/:handle` | Actualiza **un** producto Bose por handle (slug del `.js`). |
| `GET` | `/api/update/samsung` | Actualiza los **4** Samsung configurados (Puppeteer). |
| `GET` | `/api/update/samsung-single?url=...` | Un Samsung por URL completa. |
| `GET` | `/api/update/ktronix` | Actualiza los **7** Ktronix configurados (Cheerio). |
| `GET` | `/api/update/ktronix-single?url=...` | Un Ktronix por URL (debe ser `ktronix.com`). |
| `GET` | `/api/update/all-providers` | Ejecuta Bose + Samsung + Ktronix y devuelve resumen (200 si todo OK, 207 si hubo fallos parciales). |

### Análisis — prefijo `/api/analysis`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/analysis/product/:productId` | Análisis por **UUID** de producto (precios por fuente, margen, oportunidad). |
| `GET` | `/api/analysis/group/:groupId` | Análisis de un **grupo** de productos (comparativa proveedores vs competidores cuando hay datos). |
| `GET` | `/api/analysis/group/:groupId/supplier-vs-competitor` | Misma base que el anterior, respuesta orientada a comparativa detallada y *gaps* (202 si faltan datos de un lado). |

### Administración de grupos — prefijo `/api/admin`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/groups` | Lista grupos con conteo de productos. |
| `GET` | `/api/admin/groups/:groupId` | Detalle del grupo + productos asociados. |
| `POST` | `/api/admin/groups` | Crea grupo (`name`, `brand` obligatorios; `description`, `category` opcionales). |
| `POST` | `/api/admin/groups/:groupId/link` | Vincula `productIds[]` al grupo. |
| `DELETE` | `/api/admin/products/:productId/unlink` | Quita el producto del grupo. |

---

## Archivos principales (por carpeta)

- **`src/config/`** — `env.js` (dotenv), `database.js` (pool PostgreSQL).
- **`src/services/`**
  - `boseService.js` — Descarga JSON de producto Bose.
  - `samsungScraper.js` — Scraping Samsung con **Puppeteer**.
  - `ktronixScraper.js` — Scraping Ktronix con **Cheerio**.
  - `normalizeProduct.js` — Validación y forma única del objeto producto para el pipeline.
  - `productService.js` — `getProductByExternalId`, `getOrCreateProduct`, `createProduct`.
  - `sourceService.js` — `getSourceByName` (resuelve fuentes por nombre).
  - `priceService.js` — Inserción en histórico de precios.
  - `updateService.js` — Orquesta Bose, Samsung, Ktronix y `updateAllProviders`.
  - `analysisService.js` — Lógica de análisis por producto y por grupo.
  - `Productgroupservice.js` — Persistencia de grupos y vínculos producto–grupo.
- **`src/routes/`** — `update.js`, `analysis.js`, `admin.js`.
- **`src/server.js`** — Arranque Express y montaje de `/api/update`, `/api/analysis`, `/api/admin`.
- **`tests/test-samsung-simple.js`** — Script manual que llama al scraper Samsung con una URL de ejemplo y muestra el resultado en consola.

---

## Configuración mínima

- Archivo **`.env`** en la raíz con al menos **`DATABASE_URL`** apuntando a tu instancia PostgreSQL.
- Tablas esperadas incluyen al menos: `products`, `prices`, `sources`, `product_groups`, y columnas coherentes con los servicios (por ejemplo `products.external_id`, `sources.name`, etc.).

---

## Cómo ejecutar en local

```bash
npm install
npm run dev
```

El servidor imprime la conexión a la base y queda escuchando en el puerto configurado.

---

## Arquitectura general

```
    Frontend (dashboard)
            │
            ▼
    Backend API (Express)
            │
            ▼
       PostgreSQL
```
