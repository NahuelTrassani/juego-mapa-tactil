# Juego de mapa táctil

Juego para tótems con pantalla táctil: el jugador arrastra cada figura hasta su región del mapa y, al acertar, la región se pinta y aparece un dato sobre ella.

Pensado para stands de ferias: un jugador por vez, sin conexión y sin guardar datos.

## Cómo usarlo

Abrir `index.html` en el navegador de la PC del tótem, en pantalla completa (F11). No necesita servidor ni instalación.

## Adaptarlo a otro evento

Todo el contenido está en `js/config.js`:

- `textos`: títulos, consignas y mensajes de cada pantalla
- `mapa`: ilustración de fondo, tamaño de las figuras y si se muestran pistas y números
- `regiones`: nombre, contorno y punto donde se ubica la figura
- `figuras`: imagen, región que les corresponde y el dato que se muestra al acertar
- `segundosInactividad`: tiempo sin uso antes de volver al inicio

Las imágenes van en `assets/`, y la paleta y las tipografías en `css/estilos.css`. Para otro evento se cambia el contenido; la lógica (`js/juego.js`) queda igual.

## Estructura

```
index.html
css/estilos.css
js/config.js      contenido del evento
js/juego.js       lógica del juego
assets/productos/ imágenes de las figuras
```

## En el tótem

- Después de 60 segundos sin uso, vuelve solo a la pantalla de inicio.
- Mantener apretada 2 segundos la esquina superior izquierda vuelve al inicio (para quien atiende el stand).
