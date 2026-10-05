# Jardín vs Zombis HD

Juego de *tower defense* inspirado en **Plantas contra Zombis**, hecho en HTML5 Canvas, sin dependencias ni imágenes: todo el arte es vectorial dibujado por código (nítido en HD/4K) y la música y los efectos se sintetizan en tiempo real con WebAudio.

**Todo es gratis y está desbloqueado:** los 52 niveles, los 7 minijuegos, el modo infinito y las 53 plantas, incluidas las que en los juegos originales eran de pago.

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

- **52 niveles en 6 mundos**, todos desbloqueados: **Jardín de día**, **Atardecer**, **Noche** (luciérnagas, farolas), **Niebla** (los zombis se esconden; la Planterna y el Trébol la despejan) **Antiguo Egipto** (lápidas que bloquean los disparos rectos) y el **Reino Gótico** (luna de sangre, catedral, murciélagos y zombis que salen de las tumbas).
- **7 minijuegos**: Noche de vampiros, Bolos con nueces (rebotan entre filas, nuez explosiva y nuez gigante), Cinta loca (plantas al azar sin soles), Último bastión (5000 soles y ni uno más), Zombis invisibles, Ataque de gigantes y Carrera zombi (todo al doble de velocidad).
- **Modo infinito**: el escenario cambia cada 10 oleadas. Guarda tu récord.
- **53 plantas, todas gratis**:
  - Clásicas: Lanzaguisantes, Girasol, Petacereza, Nuez, Patapum, Hielaguisantes, Carnívora, Repetidora, Calabaza, Jalapeño, Nuez alta, Tripitidora, Pinchohierba, Tronco ardiente, Ajo, Hongo helado, Hongo atómico, Lanzamelones, Planterna, Trébol soplador y las antes "de pago": Ametralladora, Girasol doble, Melón glacial e Imán.
  - De la secuela: Bok Choy boxeador, Junco eléctrico, Lanzamaíz (con mantequilla que paraliza), Lanzacoles, Judía láser, Dragoncillo, Cañón de coco, Bumerflor, Lechuga iceberg, Lanzallamas, Durián, Citrón, Col huracán y Remolacha rapera.
  - **Góticas** (habilidades únicas): **Demonio** (fuego infernal que deja el suelo ardiendo), **Ángel caído** (plumas que atraviesan toda la fila), **Demonia** (hechiza zombis para que luchen por ti), **Lilith** (absorbe vida y cura a tus plantas), **Lirio espectral** (intangible; sus almas ignoran cascos), **La Parca** (siega a los heridos y te da sus almas), **Viuda negra** (telarañas que frenan), **Calabaza maldita** (explota al caer), **Rosa de sangre** (soles y almas) y **Gárgola** (muro que petrifica).
  - Inventadas para este juego: Espinarrosa (espinas que atraviesan), Bambú cohete (teledirigido), Nubecol (lluvia que ralentiza), Cacahuete muelle (rebota zombis) y Girasol lunar.
- **20 zombis** con esqueleto articulado y detalle (sombras, manchas, ropa rota, babas): normal, abanderado, caracono, saltador, lector, caracubo, mosquitera, futbolista, diablillo, Gargantúa, **globo**, **caballero**, **momia**, **faraón** con sarcófago y los góticos: **vampiro** (se cura al morder), **bruja** (paraliza plantas), **esqueleto** (se recompone), **fantasma** (se vuelve intangible), **gárgola** y el jefe **Archidemonio** (tridente en llamas, invoca esqueletos).
- **Almanaque** con fichas animadas de todas las plantas y zombis.
- **Música original** con secuenciador propio y 6 temas (menú, día, noche, Egipto, gótico e intenso).
- Animaciones: plantas que respiran y tiemblan al ser mordidas, se marchitan al morir, estelas en los disparos, soles que rebotan, ondas expansivas, zombis que salen de las tumbas y transiciones suaves entre pantallas.
- Opciones: sonido, música, auto-soles, barras de vida, velocidad x2 y **calidad gráfica** (Automática, **Ultra 4K** con supersampling, Alta o Media).

## Estructura

| Archivo | Contenido |
|---|---|
| `js/config.js` | Datos de plantas, zombis, escenarios y niveles (fácil de ajustar) |
| `js/art.js` | Arte de las plantas clásicas, proyectiles y soles |
| `js/art_plants2.js` | Plantas de la secuela, inventadas, bolos y proyectiles nuevos |
| `js/art_zombies.js` | Zombis articulados y animaciones |
| `js/art_gothic.js` | Reino Gótico: plantas, zombis, escenario y efectos góticos |
| `js/art_scene.js` | Escenarios (día, atardecer, noche, niebla, Egipto), lápidas, niebla y cinta |
| `js/audio.js` | Secuenciador musical y efectos |
| `js/game.js` | Lógica de la partida y de los minijuegos |
| `js/game_draw.js` | Dibujo de la partida, HUD y selector de plantas |
| `js/ui.js`, `js/main.js` | Interfaz, menús, almanaque, escalado HD y bucle principal |
