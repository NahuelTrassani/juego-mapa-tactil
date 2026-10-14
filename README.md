# Juego de mapa táctil

Juego para tótems con pantalla táctil: el jugador arrastra cada figura hasta su región del mapa y, al acertar, la región se pinta y aparece un dato sobre ella.

Pensado para stands de ferias: un jugador por vez, sin conexión y sin guardar datos.

## Cómo usarlo

Abrir `index.html` en el navegador de la PC del tótem, en pantalla completa (F11). No necesita servidor ni instalación.

## Adaptarlo a otro evento

Todo el contenido está en el objeto `CONFIG`, al principio del script:

- `regiones`: nombre, contorno del mapa y posición de la pista
- `figuras`: forma, color, región que les corresponde y el dato que se muestra al acertar
- `segundosInactividad`: tiempo sin uso antes de volver al inicio

Para otro evento se cambia el contenido; la lógica queda igual.

## En el tótem

- Después de 60 segundos sin uso, vuelve solo a la pantalla de inicio.
- Mantener apretada 2 segundos la esquina superior izquierda vuelve al inicio (para quien atiende el stand).
