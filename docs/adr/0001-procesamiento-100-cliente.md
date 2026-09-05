# ADR-0001 — Procesamiento 100 % en cliente

## Contexto

La propuesta de valor de Tolva es convertir y editar sin límites de tamaño ni cantidad, lo que
sólo es económicamente viable si cada fichero no cuesta nada de procesar. Además, la privacidad
es la promesa central del producto.

## Opciones

1. Procesar en servidor (funciones serverless + almacenamiento temporal).
2. Procesar en el cliente (WebCodecs + WASM + workers).

## Decisión

**Opción 2.** Todo el procesado ocurre en el dispositivo del usuario.

## Consecuencias

- Sin límites de tamaño ni cantidad: el coste marginal de un fichero es cero.
- La privacidad deja de ser una política y pasa a ser una propiedad estructural.
- El rendimiento depende del dispositivo del usuario: exige streaming frame a frame y avisos
  honestos ante ficheros demasiado grandes.
- No hay backend que mantener ni datos que proteger.
