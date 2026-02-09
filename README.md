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

## Arquitectura General
### Cliente - Servidor 

    Frontend (Dashboard React)
            ↓
        Backend API
          (Express)
            ↓
         PostgreSQL

