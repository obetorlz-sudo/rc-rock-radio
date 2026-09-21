RC ROCK RADIO · PWA MÓVIL V3

Esta carpeta está preparada para publicarse como sitio HTTPS y luego instalarse como app en Android o iPhone.

ARCHIVO PRINCIPAL
- index.html

PUBLICACIÓN
- Compatible con Vercel y Netlify como sitio estático.
- No requiere Python, Node, Supabase ni servidor propio para funcionar.

ANDROID
1. Abre la URL publicada en Chrome.
2. Usa el botón Instalar de RC Rock Radio o el menú de Chrome > Instalar aplicación.

IPHONE / IPAD
1. Abre la URL publicada en Safari.
2. Toca Compartir.
3. Elige Agregar a pantalla de inicio.

IMPORTANTE
- La radio necesita conexión a internet.
- La versión publicada en HTTPS prioriza streams HTTPS, porque los streams HTTP antiguos suelen ser bloqueados por los navegadores móviles.
- Algunas emisoras pueden dejar de funcionar temporalmente porque el stream depende de cada radio.


NOVEDAD V5 - SONANDO AHORA
- La app intenta leer metadatos ICY del stream para mostrar artista y canción en vivo.
- Si la emisora no publica metadatos, muestra "Título no informado por la radio".
- También actualiza la información multimedia del teléfono cuando es compatible.
- La función /api/now-playing se ejecuta en Vercel y usa el plan Hobby dentro de sus límites gratuitos.
- No utiliza un servicio de reconocimiento musical de pago.
