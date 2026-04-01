# Registro de presión con GitHub

## Archivos
- `index.html`: frontend adaptado para leer y escribir a través de un backend.
- `server.js`: backend en Node + Express.
- `datos.json`: archivo donde se guardan las lecturas.
- `.env.example`: variables de entorno.

## Pasos
1. Crea un token nuevo de GitHub con permiso Contents: Read and write.
2. Copia `.env.example` a `.env` en tu backend.
3. Instala dependencias con `npm install`.
4. Ejecuta el backend con `npm start`.
5. Publica el backend en Render, Railway o similar.
6. En `index.html`, cambia `API_BASE` por la URL real del backend.
7. Sube `index.html` y `datos.json` a tu repo del frontend.

## Importante
No pongas el token en el HTML ni en archivos públicos.
