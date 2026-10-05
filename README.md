# Jardín vs Zombis HD

Juego de *tower defense* inspirado en **Plantas contra Zombis**, hecho en HTML5 Canvas, sin dependencias ni imágenes: todo el arte es vectorial dibujado por código (nítido en HD/4K) y la música y los efectos se sintetizan en tiempo real con WebAudio.

**Todo es gratis y está desbloqueado:** los 42 niveles, los 6 minijuegos, el modo infinito y las 43 plantas, incluidas las que en los juegos originales eran de pago.

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

- **42 niveles en 5 mundos**, todos desbloqueados: **Jardín de día**, **Atardecer**, **Noche** (luciérnagas, farolas), **Niebla** (los zombis se esconden; la Planterna y el Trébol la despejan) y **Antiguo Egipto** (lápidas que bloquean los disparos rectos).
- **6 minijuegos**: Bolos con nueces (rebotan entre filas, nuez explosiva y nuez gigante), Cinta loca (plantas al azar sin soles), Último bastión (5000 soles y ni uno más), Zombis invisibles, Ataque de gigantes y Carrera zombi (todo al doble de velocidad).
- **Modo infinito**: el escenario cambia cada 10 oleadas. Guarda tu récord.
- **43 plantas, todas gratis**:
  - Clásicas: Lanzaguisantes, Girasol, Petacereza, Nuez, Patapum, Hielaguisantes, Carnívora, Repetidora, Calabaza, Jalapeño, Nuez alta, Tripitidora, Pinchohierba, Tronco ardiente, Ajo, Hongo helado, Hongo atómico, Lanzamelones, Planterna, Trébol soplador y las antes "de pago": Ametralladora, Girasol doble, Melón glacial e Imán.
  - De la secuela: Bok Choy boxeador, Junco eléctrico, Lanzamaíz (con mantequilla que paraliza), Lanzacoles, Judía láser, Dragoncillo, Cañón de coco, Bumerflor, Lechuga iceberg, Lanzallamas, Durián, Citrón, Col huracán y Remolacha rapera.
  - Inventadas para este juego: Espinarrosa (espinas que atraviesan), Bambú cohete (teledirigido), Nubecol (lluvia que ralentiza), Cacahuete muelle (rebota zombis) y Girasol lunar.
- **14 zombis** con esqueleto articulado y detalle (sombras, manchas, ropa rota, babas): normal, abanderado, caracono, saltador, lector, caracubo, mosquitera, futbolista, diablillo, Gargantúa, **globo**, **caballero**, **momia** y **faraón** con sarcófago.
- **Almanaque** con fichas animadas de todas las plantas y zombis.
- **Música original** con secuenciador propio y 5 temas (menú, día, noche, Egipto e intenso).
- Opciones: sonido, música, auto-soles, barras de vida y velocidad x2. Resolución adaptativa para ir fluido en cualquier equipo.

## Estructura

| Archivo | Contenido |
|---|---|
| `js/config.js` | Datos de plantas, zombis, escenarios y niveles (fácil de ajustar) |
| `js/art.js` | Arte de las plantas clásicas, proyectiles y soles |
| `js/art_plants2.js` | Plantas de la secuela, inventadas, bolos y proyectiles nuevos |
| `js/art_zombies.js` | Zombis articulados y animaciones |
| `js/art_scene.js` | Escenarios (día, atardecer, noche, niebla, Egipto), lápidas, niebla y cinta |
| `js/audio.js` | Secuenciador musical y efectos |
| `js/game.js` | Lógica de la partida y de los minijuegos |
| `js/game_draw.js` | Dibujo de la partida, HUD y selector de plantas |
| `js/ui.js`, `js/main.js` | Interfaz, menús, almanaque, escalado HD y bucle principal |
