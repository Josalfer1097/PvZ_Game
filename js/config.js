'use strict';
// ====== Configuración general del tablero ======
const W = 1600, H = 900;                  // resolución lógica (se escala a la pantalla en HD)
const GRID_X = 250, GRID_Y = 160;         // esquina superior izquierda del césped
const COL_W = 122, ROW_H = 145;
const ROWS = 5, COLS = 9;
const LAWN_RIGHT = GRID_X + COLS * COL_W; // 1348
const ZOMBIE_VISIBLE_X = 1395;            // los zombis a partir de aquí ya pueden recibir disparos
const HOUSE_X = 120;                      // si un zombi llega aquí sin cortacésped: fin
const MOWER_X = 200;
const SLOTS = 10;                         // casillas de semillas (¡todas gratis!)
const ALL_LANES = [0, 1, 2, 3, 4];

const cellCX = c => GRID_X + c * COL_W + COL_W / 2;
const rowGroundY = r => GRID_Y + r * ROW_H + ROW_H - 26;

// ====== Plantas (TODAS gratis y desbloqueadas) ======
// cost: soles, cd: recarga (s), hp: vida, ready: empieza cargada, premium: en el original era de pago
const PLANTS = {
  peashooter:  { name: 'Lanzaguisantes', cost: 100, cd: 7.5, hp: 300, ready: true,
                 desc: 'Dispara guisantes a los zombis de su fila.' },
  sunflower:   { name: 'Girasol', cost: 50, cd: 7.5, hp: 300, ready: true,
                 desc: 'Produce soles extra cada pocos segundos.' },
  cherrybomb:  { name: 'Petacereza', cost: 150, cd: 50, hp: 300, ready: false,
                 desc: 'Explota y destruye a los zombis en un área de 3x3.' },
  wallnut:     { name: 'Nuez', cost: 50, cd: 30, hp: 4000, ready: true,
                 desc: 'Cáscara durísima que frena a los zombis.' },
  potatomine:  { name: 'Patapum', cost: 25, cd: 30, hp: 300, ready: true,
                 desc: 'Tarda en armarse, pero explota al contacto.' },
  snowpea:     { name: 'Hielaguisantes', cost: 175, cd: 7.5, hp: 300, ready: true,
                 desc: 'Guisantes congelados que dañan y ralentizan.' },
  chomper:     { name: 'Carnívora', cost: 150, cd: 7.5, hp: 300, ready: true,
                 desc: 'Se traga un zombi entero, pero tarda en masticarlo.' },
  repeater:    { name: 'Repetidora', cost: 200, cd: 7.5, hp: 300, ready: true,
                 desc: 'Dispara dos guisantes cada vez.' },
  squash:      { name: 'Calabaza', cost: 50, cd: 30, hp: 300, ready: false,
                 desc: 'Aplasta al primer zombi que se acerque.' },
  jalapeno:    { name: 'Jalapeño', cost: 125, cd: 50, hp: 300, ready: false,
                 desc: 'Arrasa con fuego una fila entera.' },
  tallnut:     { name: 'Nuez alta', cost: 125, cd: 30, hp: 8000, ready: true,
                 desc: 'Un muro enorme que ni el saltador puede saltar.' },
  threepeater: { name: 'Tripitidora', cost: 325, cd: 7.5, hp: 300, ready: true,
                 desc: 'Dispara en tres filas a la vez.' },
  spikeweed:   { name: 'Pinchohierba', cost: 100, cd: 7.5, hp: 300, ready: true,
                 desc: 'Pincha a los zombis que pasan por encima. No se la pueden comer.' },
  torchwood:   { name: 'Tronco ardiente', cost: 175, cd: 7.5, hp: 300, ready: true,
                 desc: 'Los guisantes que lo atraviesan se vuelven de fuego: doble daño.' },
  garlic:      { name: 'Ajo', cost: 50, cd: 7.5, hp: 400, ready: true,
                 desc: 'Los zombis que lo muerden huyen a otra fila.' },
  iceshroom:   { name: 'Hongo helado', cost: 75, cd: 50, hp: 300, ready: false,
                 desc: 'Congela a todos los zombis de la pantalla.' },
  doomshroom:  { name: 'Hongo atómico', cost: 125, cd: 50, hp: 300, ready: false,
                 desc: 'Explosión gigantesca. Deja un cráter durante un rato.' },
  melonpult:   { name: 'Lanzamelones', cost: 300, cd: 7.5, hp: 300, ready: true,
                 desc: 'Lanza melones pesados que salpican a los zombis cercanos.' },
  gatling:     { name: 'Ametralladora', cost: 250, cd: 25, hp: 300, ready: true, premium: true,
                 desc: '¡Cuatro guisantes por disparo! (Antes de pago, aquí GRATIS)' },
  twinsunflower:{ name: 'Girasol doble', cost: 125, cd: 25, hp: 300, ready: true, premium: true,
                 desc: 'Produce el doble de soles. (Antes de pago, aquí GRATIS)' },
  wintermelon: { name: 'Melón glacial', cost: 450, cd: 25, hp: 300, ready: true, premium: true,
                 desc: 'Melones helados que dañan y congelan en área. (GRATIS)' },
  magnet:      { name: 'Imán', cost: 100, cd: 7.5, hp: 300, ready: true, premium: true,
                 desc: 'Arranca cubos, cascos y puertas metálicas a los zombis. (GRATIS)' },
};
const PLANT_ORDER = ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea',
  'chomper', 'repeater', 'squash', 'jalapeno', 'tallnut', 'threepeater', 'spikeweed', 'torchwood',
  'garlic', 'iceshroom', 'doomshroom', 'melonpult', 'gatling', 'twinsunflower', 'wintermelon', 'magnet'];
const DEFAULT_PICK = ['sunflower', 'peashooter', 'wallnut', 'cherrybomb', 'snowpea', 'repeater',
  'potatomine', 'squash', 'torchwood', 'melonpult'];

// ====== Zombis ======
// hp: vida del cuerpo, armor: vida del accesorio, speed: multiplicador, cost: puntos de oleada
// shield: el accesorio va delante (bloquea guisantes, no proyectiles por arriba)
// metal: el imán puede arrancarlo
const ZOMBIES = {
  normal:     { name: 'Zombi', hp: 270, armor: 0, speed: 1, cost: 1,
                desc: 'Un zombi corriente. Lento pero insistente.' },
  flag:       { name: 'Zombi abanderado', hp: 270, armor: 0, speed: 1.4, cost: 1,
                desc: 'Anuncia la llegada de una gran oleada.' },
  cone:       { name: 'Zombi caracono', hp: 270, armor: 370, speed: 1, cost: 2,
                desc: 'Su cono le hace el doble de resistente.' },
  pole:       { name: 'Zombi saltador', hp: 500, armor: 0, speed: 2.1, cost: 2,
                desc: 'Corre y salta por encima de la primera planta.' },
  paper:      { name: 'Zombi lector', hp: 270, armor: 150, speed: 1, cost: 2, shield: true,
                desc: 'Si le rompes el periódico se enfada y corre.' },
  bucket:     { name: 'Zombi caracubo', hp: 270, armor: 1100, speed: 1, cost: 4, metal: true,
                desc: 'El cubo de metal le protege muchísimo.' },
  screendoor: { name: 'Zombi mosquitera', hp: 270, armor: 1100, speed: 1, cost: 4, shield: true, metal: true,
                desc: 'Su puerta bloquea los guisantes. Usa melones o el imán.' },
  football:   { name: 'Zombi futbolista', hp: 270, armor: 1400, speed: 2, cost: 7, metal: true,
                desc: 'Rápido y muy acorazado.' },
  imp:        { name: 'Diablillo', hp: 270, armor: 0, speed: 1.9, cost: 2,
                desc: 'Pequeño y rápido. Los Gargantúas los lanzan.' },
  gargantuar: { name: 'Gargantúa', hp: 3000, armor: 0, speed: 0.8, cost: 10,
                desc: 'Gigante que aplasta cualquier planta de un golpe.' },
};
const ZOMBIE_ORDER = ['normal', 'flag', 'cone', 'pole', 'paper', 'bucket', 'screendoor', 'football', 'imp', 'gargantuar'];
const ZOMBIE_BASE_SPEED = 23;   // px/s (≈ 5 s por casilla)
const EAT_DPS = 100;

// ====== Escenarios ======
const STAGES = {
  day:   { name: 'Día', skySun: [8.5, 11], music: 'day', tint: null, startSun: 50 },
  dusk:  { name: 'Atardecer', skySun: [9.5, 12], music: 'day', tint: 'rgb(255,200,165)', startSun: 100 },
  night: { name: 'Noche', skySun: [11, 14], music: 'night', tint: 'rgb(120,140,215)', startSun: 150 },
};

// ====== Niveles (todos desbloqueados) ======
const Z1 = ['normal', 'cone'];
const LEVELS = [
  { stage: 'day', waves: 8,  zombies: Z1, growth: 0.3,  tip: 'Recoge soles y planta Girasoles para tener más.' },
  { stage: 'day', waves: 10, zombies: [...Z1, 'pole'], growth: 0.35, tip: 'El saltador pasa por encima de la primera planta.' },
  { stage: 'day', waves: 10, zombies: [...Z1, 'bucket'], growth: 0.4, tip: 'El caracubo es duro: ralentízalo o arráncale el cubo con el Imán.' },
  { stage: 'day', waves: 15, zombies: [...Z1, 'paper', 'pole'], growth: 0.4, tip: 'Romper el periódico enfada al lector.' },
  { stage: 'day', waves: 15, zombies: [...Z1, 'screendoor', 'bucket'], growth: 0.42, tip: 'La mosquitera bloquea guisantes. ¡Los melones caen desde arriba!' },
  { stage: 'day', waves: 20, zombies: [...Z1, 'football', 'pole'], growth: 0.42, tip: 'El futbolista es rápido. Combina hielo y daño.' },
  { stage: 'day', waves: 20, zombies: [...Z1, 'imp', 'paper', 'bucket'], growth: 0.45, tip: 'Los diablillos son pequeños y veloces.' },
  { stage: 'day', waves: 20, zombies: [...Z1, 'bucket', 'gargantuar'], growth: 0.42, tip: '¡Gargantúa! Necesitarás explosivos y mucho daño.' },
  { stage: 'dusk', waves: 15, zombies: [...Z1, 'pole', 'paper', 'bucket'], growth: 0.39, tip: 'Cae la tarde: sale algo menos de sol.' },
  { stage: 'dusk', waves: 20, zombies: [...Z1, 'screendoor', 'football'], growth: 0.39, tip: 'El Tronco ardiente duplica el daño de los guisantes.' },
  { stage: 'dusk', waves: 20, zombies: [...Z1, 'imp', 'pole', 'bucket'], growth: 0.44, tip: 'El Ajo desvía a los zombis a otras filas.' },
  { stage: 'dusk', waves: 20, zombies: [...Z1, 'paper', 'screendoor', 'gargantuar'], growth: 0.39, tip: 'El Hongo helado congela a todos los zombis.' },
  { stage: 'dusk', waves: 25, zombies: [...Z1, 'pole', 'football', 'imp', 'bucket'], growth: 0.44, tip: 'El Melón glacial ralentiza grupos enteros.' },
  { stage: 'dusk', waves: 30, zombies: ['normal', 'cone', 'bucket', 'screendoor', 'football', 'gargantuar'], growth: 0.44, tip: '¡Dos banderas más de lo normal! Prepárate bien.' },
  { stage: 'night', waves: 15, zombies: [...Z1, 'paper', 'pole'], growth: 0.39, tip: 'De noche cae muy poco sol del cielo. ¡Girasoles!' },
  { stage: 'night', waves: 20, zombies: [...Z1, 'bucket', 'screendoor', 'imp'], growth: 0.42, tip: 'El Hongo atómico deja un cráter: úsalo con cabeza.' },
  { stage: 'night', waves: 20, zombies: [...Z1, 'football', 'pole', 'paper'], growth: 0.44, tip: 'Las Pinchohierbas no pueden ser comidas.' },
  { stage: 'night', waves: 25, zombies: [...Z1, 'bucket', 'imp', 'gargantuar'], growth: 0.44, tip: 'Los Gargantúas lanzan diablillos cuando están heridos.' },
  { stage: 'night', waves: 30, zombies: ['normal', 'cone', 'pole', 'paper', 'bucket', 'screendoor', 'football', 'imp'], growth: 0.49, tip: 'Casi el final. ¡Que no pase ni uno!' },
  { stage: 'night', waves: 40, zombies: ['normal', 'cone', 'pole', 'paper', 'bucket', 'screendoor', 'football', 'imp', 'gargantuar'], growth: 0.49, tip: '¡Nivel final! La noche más larga.' },
];
const ENDLESS = { stage: 'day', waves: Infinity, zombies: ZOMBIE_ORDER.filter(z => z !== 'flag'),
  growth: 0.7, endless: true, tip: 'Modo infinito: el escenario cambia cada 10 oleadas.' };

// ====== Guardado ======
const Save = {
  key: 'jardin_vs_zombis_save_v2',
  data: { done: [], best: 0, sound: true, music: true, autoSun: false, hpBars: false, pick: null },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.key));
      if (d && typeof d === 'object') Object.assign(this.data, d);
    } catch (e) { /* sin almacenamiento disponible */ }
    if (!Array.isArray(this.data.done)) this.data.done = [];
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignorar */ }
  },
};
