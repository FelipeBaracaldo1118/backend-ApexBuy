# ApexBuy — Backend

Monitoreo competitivo de precios para compras y decisiones comerciales.

**Stack principal:** Node.js (ESM), Express 5, PostgreSQL, Puppeteer (Samsung/Falabella), Cheerio (Ktronix/Mansion).

---

## Tabla de contenidos

- [¿Qué es ApexBuy?](#que-es-apexbuy)
- [Características principales](#caracteristicas)
- [Arquitectura del sistema](#arquitectura)
- [Estado actual](#estado-actual)
- [Resultados de negocio](#resultados-negocio)
- [Tecnologías](#tecnologias)
- [Prerrequisitos](#prerrequisitos)
- [Instalación paso a paso](#instalacion)
- [Configuración detallada](#configuracion)
- [Ejemplos de uso (curl)](#ejemplos-curl)
- [Esquema SQL (referencia)](#esquema-sql)
- [Explicación del análisis](#analisis)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Guía de contribución](#contribucion)
- [Estadísticas del proyecto](#estadisticas)

<a id="que-es-apexbuy"></a>

## ¿Qué es ApexBuy?

**ApexBuy** es el backend de un sistema que **recolecta precios** de **tiendas proveedor** (Bose, Samsung) y de **competencia** (Ktronix, Mansion, Falabella), los **normaliza**, los **guarda en PostgreSQL** y expone una **API REST** para **analizar márgenes y oportunidades** frente al mercado. En una frase: *automatiza la vigilancia de precios y entrega señales claras (ALTA / MEDIA / BAJA) para priorizar dónde comprar o vender mejor.*

---

<a id="caracteristicas"></a>

## Características principales

| | |
|---|:-:|
| **Multi-fuente** | Bose (API JSON), Samsung (Puppeteer), Ktronix (Cheerio), Mansion (Cheerio), Falabella (Puppeteer). |
| **Cobertura operativa actual** | Múltiples fuentes por referencia (proveedores y competidores) en actualización masiva y por producto individual. |
| **Pipeline único** | `normalizeProduct` → `getOrCreateProduct` → `savePrice`. |
| **Actualización masiva** | Un endpoint ejecuta Bose → Samsung → Ktronix → Mansion → Falabella en orden. |
| **Análisis por producto y por grupo** | Márgenes, competencia (min/max/promedio), clasificación de oportunidad. |
| **Administración de grupos** | Crear grupos, listar, vincular / desvincular productos. |

---

<a id="arquitectura"></a>

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cliente (dashboard / scripts)               │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (REST)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express 5  (src/server.js)                    │
│  /api/health  /api/update  /api/analysis  /api/admin           │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────────┐   ┌────────────────────────────────┐
│  Servicios de extracción    │   │  Servicios de negocio           │
│  boseService (fetch JSON)  │   │  productService, priceService   │
│  samsungScraper (Puppeteer)│   │  analysisService, Productgroup…  │
│  ktronix/mansion (Cheerio) │   │  updateService (orquestación)    │
│  falabellaScraper (Puppeteer)                                   │
└────────────┬───────────────┘   └────────────────┬───────────────┘
             │                                     │
             └──────────────────┬──────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │    PostgreSQL          │
                    │  sources, products,    │
                    │  prices, product_groups│
                    └───────────────────────┘
```

---

<a id="estado-actual"></a>

## Estado actual

| Área | Detalle de implementación |
|------|---------------------------|
| **Fuentes activas** | Bose (proveedor, API), Samsung (proveedor, Puppeteer), Ktronix (competidor, Cheerio), Mansion (competidor, Cheerio), Falabella (competidor, Puppeteer). |
| **Cobertura configurada en update masivo** | Bose: 3 URLs/handles, Samsung: 4, Ktronix: 7, Mansion: 4, Falabella: 7 (total 25 items por corrida completa). |
| **Persistencia** | Productos normalizados + histórico de precios en `prices` por cada ejecución. |
| **Rutas de actualización** | Masivo e individual por fuente + `all-providers`. |
| **Análisis** | Por `productId`, historial y cambios, por `groupId`, comparativa supplier-vs-competitor, oportunidades (completas y filtradas), estadísticas globales. |
| **Admin** | CRUD de grupos y vínculos producto ↔ grupo. |

---

<a id="resultados-negocio"></a>

## Resultados de negocio

El backend no fija “números de ejemplo” en código: las **métricas reales** salen de **tu base** después de cada corrida de precios. Lo que el sistema **sí entrega de forma consistente** es:

| Salida | Utilidad para el negocio |
|--------|--------------------------|
| **Precio proveedor mínimo** | Costo de referencia de compra en canales propios. |
| **Costo estimado** | \(0{,}75 \times\) precio proveedor (proxy hasta tener costos reales). |
| **Competencia (min / max / promedio)** | Rango del mercado considerando todas las fuentes con `role = competitor` (Ktronix, Mansion, Falabella, etc.). |
| **Ganancia y margen %** | Señal de cuánto “aire” hay frente al retail competidor. |
| **Oportunidad ALTA / MEDIA / BAJA** | Priorización rápida según umbrales del margen (ver [Explicación del análisis](#analisis)). |

> **Nota:** Para reportes de negocio (totales ahorrados, SKUs en alerta, etc.), conviene consultar PostgreSQL o construir vistas y reportes sobre `prices` y la clasificación de oportunidad.

---

<a id="tecnologias"></a>

## Tecnologías

| Categoría | Uso en el proyecto |
|-----------|-------------------|
| **Node.js** | Runtime ESM (`"type": "module"`). |
| **Express 5** | API HTTP, CORS, JSON. |
| **PostgreSQL + `pg`** | Persistencia y consultas de análisis. |
| **dotenv** | Variables de entorno. |
| **Puppeteer** | Samsung y Falabella (contenido dinámico). |
| **Cheerio** | Ktronix y Mansion (HTML estático). |
| **nodemon** | Desarrollo (`npm run dev`). |

Versiones concretas: ver [`package.json`](package.json).

---

<a id="prerrequisitos"></a>

## Prerrequisitos

- **Node.js** 18+ (recomendado 20 LTS).
- **npm** (incluido con Node).
- **PostgreSQL** accesible con una cadena de conexión (`DATABASE_URL`).
- Para **Puppeteer**: en algunos entornos hace falta Chromium compatible (el paquete `puppeteer` lo gestiona; en servidores sin GUI suelen usarse flags ya presentes en `samsungScraper.js`).

---

<a id="instalacion"></a>

## Instalación paso a paso

```bash
git clone https://github.com/FelipeBaracaldo1118/backend-ApexBuy.git
cd backend-ApexBuy
npm install
```

Crea el archivo `.env` en la raíz (ver siguiente sección). Asegúrate de que la base tenga el esquema esperado (ver [Esquema SQL](#esquema-sql)).

```bash
npm run dev
```

El servidor queda en `http://localhost:3000` salvo que cambies `PORT`.

---

<a id="configuracion"></a>

## Configuración detallada

Ejemplo de `.env` (ajusta usuario, host y nombre de base):

```env
# Conexión obligatoria
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/apexbuy

# Opcional (por defecto 3000)
PORT=3000
```

**Fuentes en base:** deben existir filas en `sources` con nombres que el código resuelve por nombre, por ejemplo `Bose`, `Samsung`, `Ktronix`, `Mansion Electrodomesticos` y `Falabella`, con `role` = `provider` o `competitor` según corresponda (el análisis filtra por `source_role`).

---

<a id="ejemplos-curl"></a>

## Ejemplos de uso (curl)

Sustituye `GROUP_ID` y `PRODUCT_ID` por UUIDs válidos de tu instancia.

```bash
# Salud
curl -s http://localhost:3000/api/health

# Actualizar todos los proveedores + competidor
curl -s http://localhost:3000/api/update/all-providers

# Actualización masiva por fuente
curl -s http://localhost:3000/api/update/bose
curl -s http://localhost:3000/api/update/samsung
curl -s http://localhost:3000/api/update/ktronix
curl -s http://localhost:3000/api/update/mansion
curl -s http://localhost:3000/api/update/falabella

# Un producto por URL (codifica la URL en el cliente si hace falta)
curl -s "http://localhost:3000/api/update/samsung-single?url=https%3A%2F%2Fwww.samsung.com%2Fco%2F..."
curl -s "http://localhost:3000/api/update/ktronix-single?url=https%3A%2F%2Fwww.ktronix.com%2F..."
curl -s "http://localhost:3000/api/update/falabella-single?url=https%3A%2F%2Fwww.falabella.com.co%2F..."

# Análisis
curl -s http://localhost:3000/api/analysis/product/PRODUCT_ID
curl -s http://localhost:3000/api/analysis/product/PRODUCT_ID/history?limit=30
curl -s http://localhost:3000/api/analysis/product/PRODUCT_ID/changes?threshold=5
curl -s http://localhost:3000/api/analysis/group/GROUP_ID
curl -s http://localhost:3000/api/analysis/group/GROUP_ID/supplier-vs-competitor
curl -s http://localhost:3000/api/analysis/opportunities
curl -s "http://localhost:3000/api/analysis/opportunities/filtered?minMargin=20&minGanancia=500000"
curl -s http://localhost:3000/api/analysis/stats

# Admin: listar grupos
curl -s http://localhost:3000/api/admin/groups
```

---

<a id="esquema-sql"></a>

## Esquema SQL (referencia)

> **Importante:** en el repo **no hay migraciones versionadas**. El siguiente DDL está **inferido de las consultas en `src/services/`**. Revísalo con tu DBA antes de aplicarlo en producción.

```sql
-- Extensiones (opcional, según versión de PostgreSQL)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- para gen_random_uuid()

CREATE TABLE sources (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL UNIQUE,
  type                  TEXT NOT NULL,           -- p. ej. 'api', 'scraping'
  role                  TEXT NOT NULL,           -- 'provider' | 'competitor' (usado en análisis)
  wholesale_discount    NUMERIC(5,2) DEFAULT 0
);

CREATE TABLE product_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  brand        TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand, name)
);

CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  external_id       TEXT NOT NULL,
  brand             TEXT,
  image             TEXT,
  source_id         UUID NOT NULL REFERENCES sources(id),
  product_group_id  UUID REFERENCES product_groups(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_id, source_id)
);

CREATE TABLE prices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_id   UUID NOT NULL REFERENCES sources(id),
  price       NUMERIC(14,2) NOT NULL,
  available   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices recomendados
CREATE INDEX idx_products_external_source ON products (external_id, source_id);
CREATE INDEX idx_products_group ON products (product_group_id);
CREATE INDEX idx_prices_product_created ON prices (product_id, created_at DESC);
CREATE INDEX idx_prices_source ON prices (source_id);

-- Vista: último precio por producto (útil para reportes)
CREATE OR REPLACE VIEW v_latest_price_per_product AS
SELECT DISTINCT ON (product_id)
  product_id,
  source_id,
  price,
  available,
  created_at AS last_price_at
FROM prices
ORDER BY product_id, created_at DESC;
```

> **Nota de modelo:** el código de `productService` debe persistir `source_id` en `products` para que coincidan los `JOIN` de análisis y grupos. Si tu instancia aún no lo hace, alinea el `INSERT` con este esquema.

---

<a id="analisis"></a>

## Explicación del análisis

Constante en código (`analysisService.js`): **costo estimado del proveedor** = **75%** del menor precio observado entre fuentes con `role = provider`:

\[
C_{\text{proveedor}} = 0{,}75 \times P_{\text{proveedor,min}}
\]

Sobre precios de competencia se calculan mínimo, máximo y **promedio** \(\bar{P}_{\text{comp}}\) (sobre filas con `role = competitor`).

\[
\text{Ganancia} = \bar{P}_{\text{comp}} - C_{\text{proveedor}}
\]

\[
\text{Margen \%} = \frac{\text{Ganancia}}{\bar{P}_{\text{comp}}} \times 100
\]

**Clasificación de oportunidad** (misma lógica para análisis por grupo y por producto):

| Condición | Oportunidad |
|-----------|-------------|
| Margen % > 20 | **ALTA** |
| Margen % > 10 | **MEDIA** |
| En otro caso | **BAJA** |

Si faltan precios de proveedor o de competidor, el estado devuelve `missing_supplier` o `missing_competitor` en lugar de completar el cálculo.

---

<a id="testing"></a>

## Testing

| Tipo | Cómo |
|------|------|
| **Manual API** | `npm run dev` + [curl](#ejemplos-curl) o Thunder Client / Postman. |
| **Script Samsung** | `node tests/test-samsung-simple.js` (requiere red; abre Puppeteer). |
| **Suite automatizada** | Aún no configurada (`npm test` es placeholder en `package.json`). |

---

<a id="roadmap"></a>

## Roadmap

- [ ] Suite de tests (p. ej. Jest) con mocks de fetch / HTML.
- [ ] Segunda fuente competidora (p. ej. Mansion) alineada con los mismos 7 productos.
- [ ] Autenticación en rutas `/api/admin` y/o `/api/update`.
- [ ] Colas o cron para `all-providers` sin bloquear HTTP.
- [ ] Sincronizar DDL con migraciones (Knex / Prisma / archivos SQL versionados).

---

<a id="contribucion"></a>

## Guía de contribución

1. **Fork** del repositorio y rama descriptiva (`feature/…`, `fix/…`).
2. Cambios **acotados** al objetivo; seguir el estilo existente en `src/`.
3. Probar localmente (`npm run dev`, endpoints críticos, script de Samsung si aplica).
4. **Pull Request** con descripción clara: qué problema resuelve y cómo validarlo.
5. Si tocás el esquema SQL, actualiza la sección [Esquema SQL](#esquema-sql) en este README o añade migraciones en el repo.

---

<a id="estadisticas"></a>

## Estadísticas del proyecto

| Métrica | Valor (aprox.) |
|---------|----------------|
| Archivos JS en `src/` | ~18 |
| Líneas de código en servicios y rutas | ~2000+ |
| Integraciones de precio | 5 (Bose, Samsung, Ktronix, Mansion, Falabella) |
| Items configurados en corrida completa | 25 (3 + 4 + 7 + 4 + 7) |
| Endpoints REST principales | 20+ (salud, update, analysis, admin) |

---

## Licencia

Ver `package.json` (`license`).
