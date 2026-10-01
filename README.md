# Jardín vs Zombis HD

A *tower defense* game inspired by the classic **Plants vs. Zombies**, with the same mechanics and gameplay, made in HTML5 Canvas. It has no dependencies and no image files. All the art is vector graphics drawn by code, so it looks sharp (HD) at any resolution. The sounds and music are synthesized with WebAudio.

## How to play

Open `index.html` in your browser (double-clicking it works). You can also serve the folder:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

- **Collect suns** by clicking them (they fall from the sky and Sunflowers produce them).
- **Pick a plant** from the top bar and click a square on the lawn to plant it.
- **Shovel** to remove plants. **Lawn mowers** save you once per row.
- Survive every wave (the flags mark the big waves) to win a new plant.

Controls: `1-8` pick a plant · `S` shovel · `Esc` pause/cancel · right-click to cancel. It works with a mouse and with touch screens.

## Content

- **12 levels** + **endless mode** (unlocked when you finish the adventure). Progress is saved automatically.
- **12 plants:** Lanzaguisantes, Girasol, Petacereza, Nuez, Patapum, Hielaguisantes, Carnívora, Repetidora, Calabaza, Jalapeño, Nuez alta and Tripitidora.
- **7 zombies:** normal, abanderado, caracono, saltador con pértiga, lector de periódico, caracubo and futbolista.
- Classic mechanics: recharge times, slowing with ice, a pole vaulter who jumps over the first plant (except the Tall-nut), a newspaper zombie who gets angry, arms and heads that fall off, armor that wears down, a plant-picking screen, x2 speed and a progress bar with flags.

## Structure

| File | Contents |
|---|---|
| `js/config.js` | Plant, zombie and level data (easy to tune) |
| `js/art.js` | All the vector art |
| `js/audio.js` | Synthesized sound effects and music |
| `js/game.js` | Game logic |
| `js/ui.js`, `js/main.js` | Interface, menus, HD scaling and main loop |
