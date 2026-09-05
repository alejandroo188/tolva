# ADR-0002 — Export estático de Next: la privacidad como propiedad estructural

## Contexto

Si no hay procesado en servidor (ADR-0001), no necesitamos funciones serverless, rutas de API,
middleware ni optimización de imágenes en servidor. Necesitamos una forma de garantizar que no
existe ningún endpoint al que subir un fichero.

## Opciones

1. Next con `output: 'export'` (estático puro, cero funciones desplegadas).
2. Next con Serverless + una política de privacidad que prometa no usar el backend.
3. Un SPA puro (Vite) sin framework de App Router.

## Decisión

**Opción 1.** `output: 'export'` en Next, desplegado en Vercel.

## Consecuencias

- HTML, CSS, JS y WASM estáticos; cero funciones. No existe destino al que subir nada.
- Las cabeceras (CSP, COOP/COEP) van en `vercel.json`, que funciona igual con salida estática.
- Renunciamos a middleware, rutas de API y optimización de imágenes: ninguna se necesita.
- Mantenemos App Router y el ecosistema Next para el despliegue de primera clase en Vercel.
