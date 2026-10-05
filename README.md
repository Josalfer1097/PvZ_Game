# Jardín vs Zombis HD

Juego de *tower defense* inspirado en **Plantas contra Zombis**, hecho en HTML5 Canvas, sin dependencias ni imágenes: todo el arte es vectorial dibujado por código (nítido en HD/4K) y la música y los efectos se sintetizan en tiempo real con WebAudio.

**Todo es gratis y está desbloqueado:** los 20 niveles, el modo infinito y las 22 plantas, incluidas las que en el juego original eran de pago.

## Cómo jugar

Abre `index.html` en el navegador (doble clic) o sírvelo:

```bash
python3 -m http.server 8000   # y abre http://localhost:8000
```

Se puede desplegar tal cual en Vercel, Netlify o GitHub Pages (es una web estática).

- **Recoge soles** (caen del cielo y los producen los girasoles) o activa *Auto-soles* en la pausa.
- **Elige hasta 10 plantas** antes de cada nivel y colócalas en el césped.
- **Pala** para quitar plantas. Los **cortacéspedes** te salvan una vez por fila.

Controles: `1-9` y `0` elegir planta · `S` pala · `Esc` pausa · clic derecho cancelar. Funciona con ratón y pantallas táctiles.

## Contenido

- **20 niveles** en 3 escenarios con iluminación propia: **Día**, **Atardecer** y **Noche** (luciérnagas, farolas, luna).
- **Modo infinito**: el escenario cambia cada 10 oleadas. Guarda tu récord.
- **22 plantas**: Lanzaguisantes, Girasol, Petacereza, Nuez, Patapum, Hielaguisantes, Carnívora, Repetidora, Calabaza, Jalapeño, Nuez alta, Tripitidora, Pinchohierba, Tronco ardiente, Ajo, Hongo helado, Hongo atómico, Lanzamelones y las antes "de pago": **Ametralladora, Girasol doble, Melón glacial e Imán**.
- **10 zombis** con diseño propio y esqueleto articulado (rodillas, codos, cabeza con balanceo, mandíbula móvil, ropa y piel distintas en cada uno): normal, abanderado, caracono, saltador, lector, caracubo, mosquitera, futbolista, diablillo y **Gargantúa** (aplasta plantas y lanza diablillos).
- **Almanaque** con fichas animadas de todas las plantas y zombis.
- **Música original** con secuenciador propio (marimba, campanas, bajo, pads, batería, reverb y delay): tema de menú, de día, de noche y uno intenso para las grandes oleadas.
- Opciones: sonido, música, auto-soles, barras de vida y velocidad x2.
- Resolución adaptativa: siempre HD, y si el equipo no llega a 40 fps baja un poco la resolución interna para que vaya fluido.

## Estructura

| Archivo | Contenido |
|---|---|
| `js/config.js` | Datos de plantas, zombis, escenarios y niveles (fácil de ajustar) |
| `js/art.js` | Arte de plantas, proyectiles y soles |
| `js/art_zombies.js` | Zombis articulados y animaciones |
| `js/art_scene.js` | Escenarios (día, atardecer, noche) y ambiente |
| `js/audio.js` | Secuenciador musical y efectos |
| `js/game.js` | Lógica de la partida |
| `js/ui.js`, `js/main.js` | Interfaz, menús, almanaque, escalado HD y bucle principal |
