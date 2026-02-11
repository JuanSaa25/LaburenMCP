# Agente de Ventas Inteligente - Laburen MCP

Este repositorio contiene la implementación de un servidor MCP (Model Context Protocol) diseñado para gestionar un flujo de ventas automatizado de indumentaria. La solución integra una base de datos relacional con un modelo de lenguaje para permitir la consulta de stock y la gestión de carritos de compra a través de WhatsApp.

## Stack Tecnológico

* **Infraestructura:** Cloudflare Workers.
* **Base de Datos:** Cloudflare D1 (SQL nativo en el Edge).
* **Framework:** Hono.js para la API del Worker.
* **Protocolo de Comunicación:** Model Context Protocol (MCP).
* **Canales de Integración:** WhatsApp Business API (Meta) y Chatwoot.
* **IA:** Agente configurado en la plataforma Laburen.

## Arquitectura del Proyecto

El sistema opera bajo un flujo de cuatro capas:
1.  **Capa de Mensajería:** Los mensajes entrantes de WhatsApp son gestionados por Chatwoot.
2.  **Capa de Inteligencia:** Chatwoot redirige el tráfico a Laburen, donde el agente procesa el lenguaje natural.
3.  **Capa de Servicio (MCP):** El agente invoca herramientas específicas alojadas en el Cloudflare Worker según la intención detectada.
4.  **Capa de Datos:** El Worker ejecuta consultas SQL sobre la base de datos D1 para obtener o persistir información.

## Implementación de la Base de Datos

Se diseñó un esquema relacional orientado a la consistencia de datos, compuesto por 100 productos de indumentaria con atributos detallados:

* **products:** Incluye columnas para ID, nombre, descripción, precio, categoría, talle, color y stock disponible.
* **carts:** Gestiona el identificador único de sesión de compra para cada usuario.
* **cart_items:** Tabla relacional que vincula productos a carritos, permitiendo la gestión de cantidades de forma independiente.

## Decisiones Técnicas Destacadas

### Optimización de Consultas (Anti-Duplicidad)
Se implementó lógica de agregación directamente en el backend mediante el uso de `GROUP BY` y `SUM` en SQL. Esto garantiza que, si un usuario agrega el mismo producto en múltiples interacciones, el resumen del carrito se visualice consolidado (ej. "Remera Negra x2" en lugar de dos líneas separadas), optimizando la legibilidad en interfaces de mensajería móvil.

### Gestión de Persistencia
El agente ha sido instruido para mantener un único `cart_id` por sesión. El Worker valida la existencia de este ID antes de realizar inserciones en la tabla de ítems, asegurando la integridad referencial.

## Instalación y Despliegue

### Instalación

Clonar el repositorio:

```bash
git clone https://github.com/JuanSaa25/LaburenMCP.git
cd LaburenMCP
```

Instalar dependencias:

```bash
npm install
```

### Configuración de la Base de Datos
Para desplegar el esquema y los datos iniciales en la infraestructura de Cloudflare:
```bash
npx wrangler d1 execute laburen-db --remote --file=./schema.sql
```

### Despliegue del Worker
Para publicar la lógica del servidor MCP:

```bash
npm run deploy
```

## Funcionalidades del Agente

### Búsqueda Multivariable:
 El agente puede filtrar productos por talle, color o tipo de prenda de forma simultánea.

### Gestión de Carrito:
 Creación, edición y visualización del estado actual de la compra.

### Protocolo de Escalación:
 El sistema incluye una herramienta de derivación automática a un operador humano en Chatwoot ante solicitudes explícitas de soporte o situaciones de baja confianza en la respuesta.


Este proyecto ha sido desarrollado como parte de una prueba técnica para demostrar habilidades en arquitectura serverless, diseño de bases de datos relacionales e integración de modelos de lenguaje en flujos de negocio reales.