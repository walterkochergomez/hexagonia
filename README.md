# Hexagonia

Juego de colonización y comercio en una isla de hexágonos, para jugar en línea con amigos directamente en el navegador. Sin cuentas, sin servidor propio y en español, alemán o inglés.

- **Juego base** para 2 a 6 jugadores (con 5 o 6 se usa el tablero grande, con fase especial de construcción o turno en pareja).
- **Mar Abierto**: barcos, pirata, campos de oro, islas que dan puntos extra, mar de niebla y nueve escenarios con mapas generados en cada partida, cuatro de ellos con reglas especiales (pueblo isleño, aldeas tejedoras, bastiones corsarios y grandes obras).
- **Gremios y Guardianes**: mercancías, mejoras de ciudad con metrópolis, caballeros, ataques bárbaros y 54 cartas de progreso.
- Los dos módulos se pueden **combinar**.
- **Comarcas**: tres escenarios con su propio mapa (aguas de pesca, ríos de oro y ruta de camellos) y variantes que se suman a cualquier partida: señor de los muelles, mazo de sucesos en vez de dados y duelo para 2 jugadores con colores neutrales.
- **Salas con código**: quien crea la sala comparte un link y los demás entran desde cualquier navegador (también desde el celular).
- **Partida en un solo dispositivo** pasándolo de mano en mano, o contra bots.

## Cómo jugar en línea

1. Abre la página, escribe tu nombre y toca **Crear sala**. Tú eres el anfitrión: la partida corre en tu navegador, así que conviene hacerlo desde un computador y dejar la pestaña abierta.
2. Toca **Copiar link** y mándalo a tus amigos. Ellos abren el link, escriben su nombre y aparecen en la sala.
3. Elige los módulos y ajustes (si faltan jugadores puedes **añadir bots**) y toca **Iniciar partida**.

Si alguien pierde la conexión, vuelve a abrir el mismo link y recupera su lugar. Si el anfitrión cierra la pestaña, la partida queda guardada en su navegador: al volver a la página aparece **Continuar sala** con el mismo código y los demás se reconectan solos.

Cada versión tiene su manual dentro del juego (botón **?**), ilustrado con las mismas piezas del tablero, en tres idiomas y listo para imprimir.

## Publicarlo en tu GitHub

1. Crea un repositorio público en GitHub (por ejemplo `hexagonia`) y sube este código a la rama `main`.
2. En el repositorio entra a **Settings → Pages** y en **Build and deployment → Source** elige **GitHub Actions**. No uses «Deploy from a branch»: esa opción publica el código sin compilar y el juego no carga.
3. La primera vez, ve a la pestaña **Actions**, abre **Publicar en GitHub Pages** y pulsa **Run workflow**. Desde ahí, cada vez que subas cambios a `main` el flujo `.github/workflows/deploy.yml` corre las pruebas, arma el sitio y lo publica solo en `https://<tu-usuario>.github.io/<repositorio>/`.

## Desarrollo

Necesitas Node 22 o más nuevo.

```bash
npm install
npm run dev        # servidor local en http://localhost:5173
npm test           # pruebas de reglas
npm run sim        # cientos de partidas simuladas con bots, en todos los modos
npm run build      # sitio estático en dist/
```

Pruebas de punta a punta (necesitan `npm run build` y `npx vite preview` corriendo en el puerto 4173):

```bash
npm run e2e        # anfitrión + invitado en dos navegadores, reconexión y recarga
npm run e2e:soak   # partidas completas por la interfaz en cada modo
npm run e2e:a11y   # revisión de accesibilidad
npm run e2e:fit    # que nada se salga de la pantalla en celulares (320–430 px, tres idiomas)
npm run e2e:fx     # animaciones: dados, cartas que viajan, piezas que caen, ladrón, aviso de turno y «reducir movimiento»
npm run e2e:manual # manuales: cada uno en tres idiomas, figuras dibujadas, celular, accesibilidad e impresión
npm run e2e:shires # Comarcas en la interfaz: neutrales, sucesos, fichas, pesca, puentes y monedas, puja de camellos
npm run e2e:seas   # escenarios especiales del mar: regalos, telas, ataque al bastión y obras
```

### Cómo está hecho

- `src/engine/`: el motor de reglas en TypeScript puro (tablero, generadores de mapas, reglas de cada módulo, vistas por jugador y un bot). No depende del navegador.
- `src/net/`: salas en línea. El anfitrión es la única fuente de verdad: recibe las acciones, aplica las reglas y le manda a cada jugador sólo lo que puede ver (las manos ajenas y los mazos van ocultos).
- `src/ui/`: la interfaz en React, con el tablero dibujado en SVG.
- La conexión entre navegadores usa [PeerJS](https://peerjs.com/): su servidor público sólo presenta a los navegadores; los datos de la partida viajan directo entre ustedes. En redes muy cerradas (algunas redes de empresa o de celular) la conexión directa puede fallar; prueben con otra red. También se puede usar un servidor de PeerJS propio agregando `?peer=host:puerto` a la dirección.

## Deutsch

Hexagonia ist ein Besiedlungs- und Handelsspiel für 2–6 Personen im Browser, mit den Modulen *Offene See* und *Gilden & Wächter*. Die Gastgeber:in erstellt einen Raum und teilt den Link; alle anderen treten über den Link bei. Die Oberfläche gibt es auf Deutsch, Spanisch und Englisch (Auswahl oben rechts).

## English

Hexagonia is a settling and trading game for 2–6 players in the browser, with the *Open Sea* and *Guilds & Guardians* modules. The host creates a room and shares the link; everyone else joins from it. The interface is available in English, Spanish and German (selector at the top right).

---

Proyecto personal y sin fines de lucro. Nombre, gráficos, textos y mapas son propios. Código bajo licencia MIT.
