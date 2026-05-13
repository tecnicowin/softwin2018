# 📒 Bitácora de Cambios - SoftWin PWA
**Fecha:** 13 de Mayo, 2026

## 🚀 Mejoras de Estabilidad y Checkout
- **Mecanismo de Timeout:** Se implementó un límite de 8 segundos para todas las operaciones de Firebase (Firestore y Storage). Si la red es lenta o falla, la aplicación fuerza la finalización del pedido y redirige al usuario a la pantalla de éxito/WhatsApp para garantizar la conversión.
- **Flujo Offline-First:** Se eliminó la dependencia crítica de la subida de imágenes para procesar una orden.

## 💳 Rediseño del Sistema de Pagos
- **Verificación por Texto:** Se añadieron campos obligatorios en el checkout:
  - Número de Referencia.
  - Monto cancelado ($ o Bs).
  - Fecha del pago.
  - Banco emisor.
- **Optimización de Imágenes:** Se eliminó la carga de comprobantes a Cloud Storage desde el cliente para evitar bloqueos por tamaño de archivo. Ahora se instruye al cliente a adjuntar la captura directamente en el chat de WhatsApp.
- **WhatsApp Dinámico:** El mensaje de WhatsApp ahora incluye automáticamente todos los detalles del pago reportados por el cliente.

## 🇻🇪 Sistema de Tasa BCV
- **Control Administrativo:** Se añadió una sección en la pestaña "Pagos" del panel de administración para gestionar la tasa del día.
- **Conversión Automática:** La interfaz de usuario ahora calcula y muestra el total en Bolívares (Bs) en tiempo real cuando se selecciona un método de Pago Móvil, indicando la tasa utilizada.

## 🎨 Mejoras de UI/UX y Navegación
- **Botón Regresar:** Se cambió el botón "Cancelar" por "Regresar" en el modal de checkout, permitiendo al usuario volver al carrito sin perder su selección.
- **Optimización de Modales:** Se corrigieron errores de visibilidad (clases CSS y scopes de funciones) para asegurar que las ventanas cierren instantáneamente.
- **Normalización de Texto:** Se implementó lógica de comparación insensible a acentos y mayúsculas para la carga de datos de pago (ej. "Pago Móvil" vs "Pago Movil").

## 💱 Sistema Multi-moneda (USD/Bs)
- **Selector de Moneda:** Se añadió un interruptor en la navegación para alternar entre Dólares ($) y Bolívares (Bs).
- **Conversión Dinámica:** Todos los precios del catálogo y del carrito se recalculan en tiempo real usando la tasa BCV configurada.
- **Formateo Local:** Los montos en Bolívares utilizan el formato estándar `toLocaleString` para una lectura profesional.
- **Persistencia:** La preferencia de moneda del usuario se guarda automáticamente en el navegador.

## 🛠️ Notas Técnicas para el Futuro
- Las funciones de control de modales (`toggleModal`, `closeEverything`) y guardado (`handlePaymentSave`) ahora están expuestas en el objeto `window` para permitir su uso desde el HTML estático.
- La configuración de pagos se guarda centralizada en la colección `settings/payments` de Firestore.
