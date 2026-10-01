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

const cellCX = c => GRID_X + c * COL_W + COL_W / 2;
const rowGroundY = r => GRID_Y + r * ROW_H + ROW_H - 26;

// ====== Plantas ======
// cost: soles, cd: recarga (s), hp: vida, ready: si empieza cargada al iniciar nivel
const PLANTS = {
  peashooter:  { name: 'Lanzaguisantes', cost: 100, cd: 7.5, hp: 300, ready: true,
                 desc: 'Dispara guisantes a los zombis que avanzan por su fila.' },
  sunflower:   { name: 'Girasol', cost: 50, cd: 7.5, hp: 300, ready: true,
                 desc: 'Produce soles extra. ¡Imprescindible para cultivar más plantas!' },
  cherrybomb:  { name: 'Petacereza', cost: 150, cd: 50, hp: 300, ready: false,
                 desc: 'Explota y destruye a todos los zombis en un área de 3x3.' },
  wallnut:     { name: 'Nuez', cost: 50, cd: 30, hp: 4000, ready: true,
                 desc: 'Tiene una cáscara muy dura que protege a tus otras plantas.' },
  potatomine:  { name: 'Patapum', cost: 25, cd: 30, hp: 300, ready: true,
                 desc: 'Tarda en armarse, pero explota al contacto con un zombi.' },
  snowpea:     { name: 'Hielaguisantes', cost: 175, cd: 7.5, hp: 300, ready: true,
                 desc: 'Dispara guisantes congelados que dañan y ralentizan.' },
  chomper:     { name: 'Carnívora', cost: 150, cd: 7.5, hp: 300, ready: true,
                 desc: 'Se traga un zombi entero, pero tarda en masticarlo.' },
  repeater:    { name: 'Repetidora', cost: 200, cd: 7.5, hp: 300, ready: true,
                 desc: 'Dispara dos guisantes cada vez.' },
  squash:      { name: 'Calabaza', cost: 50, cd: 30, hp: 300, ready: false,
                 desc: 'Aplasta al primer zombi que se acerque.' },
  jalapeno:    { name: 'Jalapeño', cost: 125, cd: 50, hp: 300, ready: false,
                 desc: 'Arrasa con fuego una fila entera de zombis.' },
  tallnut:     { name: 'Nuez alta', cost: 125, cd: 30, hp: 8000, ready: true,
                 desc: 'Un muro enorme que no se puede saltar.' },
  threepeater: { name: 'Tripitidora', cost: 325, cd: 7.5, hp: 300, ready: true,
                 desc: 'Dispara guisantes en tres filas a la vez.' },
};
const PLANT_ORDER = ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea',
  'chomper', 'repeater', 'squash', 'jalapeno', 'tallnut', 'threepeater'];

// ====== Zombis ======
// hp: vida del cuerpo, armor: vida del accesorio, speed: multiplicador, cost: puntos de oleada
const ZOMBIES = {
  normal:   { name: 'Zombi', hp: 270, armor: 0, speed: 1, cost: 1 },
  flag:     { name: 'Zombi abanderado', hp: 270, armor: 0, speed: 1.4, cost: 1 },
  cone:     { name: 'Zombi caracono', hp: 270, armor: 370, speed: 1, cost: 2 },
  pole:     { name: 'Zombi saltador', hp: 500, armor: 0, speed: 2.1, cost: 2 },
  paper:    { name: 'Zombi lector', hp: 270, armor: 150, speed: 1, cost: 2 },
  bucket:   { name: 'Zombi caracubo', hp: 270, armor: 1100, speed: 1, cost: 4 },
  football: { name: 'Zombi futbolista', hp: 270, armor: 1400, speed: 2, cost: 7 },
};
const ZOMBIE_BASE_SPEED = 23;   // px/s (≈ 5 s por casilla)
const EAT_DPS = 100;

// ====== Niveles ======
const ALL_LANES = [0, 1, 2, 3, 4];
const LEVELS = [
  { lanes: [2], waves: 4, zombies: ['normal'], sun: 150, growth: 0.3, first: 24, reward: 'sunflower',
    tip: 'Haz clic en los soles para recogerlos y planta Lanzaguisantes.' },
  { lanes: [1, 2, 3], waves: 6, zombies: ['normal'], sun: 50, growth: 0.35, first: 22, reward: 'cherrybomb',
    tip: '¡Planta Girasoles para conseguir más soles!' },
  { lanes: ALL_LANES, waves: 8, zombies: ['normal', 'cone'], sun: 50, growth: 0.4, first: 22, reward: 'wallnut',
    tip: 'La Petacereza destruye a todos los zombis cercanos.' },
  { lanes: ALL_LANES, waves: 10, zombies: ['normal', 'cone'], sun: 50, growth: 0.45, first: 20, reward: 'potatomine',
    tip: 'Usa Nueces para frenar a los zombis.' },
  { lanes: ALL_LANES, waves: 10, zombies: ['normal', 'cone', 'pole'], sun: 50, growth: 0.5, first: 20, reward: 'snowpea',
    tip: '¡Cuidado! El zombi saltador pasa por encima de la primera planta.' },
  { lanes: ALL_LANES, waves: 15, zombies: ['normal', 'cone', 'pole', 'bucket'], sun: 50, growth: 0.45, first: 20, reward: 'chomper',
    tip: 'El zombi caracubo es muy resistente. Ralentízalo con hielo.' },
  { lanes: ALL_LANES, waves: 20, zombies: ['normal', 'cone', 'pole', 'bucket', 'paper'], sun: 50, growth: 0.45, first: 20, reward: 'repeater',
    tip: 'Si destruyes su periódico, el zombi lector se enfada y corre.' },
  { lanes: ALL_LANES, waves: 20, zombies: ['normal', 'cone', 'paper', 'bucket', 'football'], sun: 50, growth: 0.5, first: 20, reward: 'squash',
    tip: 'El zombi futbolista es rápido y está muy protegido.' },
  { lanes: ALL_LANES, waves: 20, zombies: ['normal', 'cone', 'pole', 'paper', 'bucket', 'football'], sun: 50, growth: 0.5, first: 20, reward: 'jalapeno',
    tip: 'La Calabaza aplasta al primer zombi que se acerca.' },
  { lanes: ALL_LANES, waves: 20, zombies: ['normal', 'cone', 'pole', 'paper', 'bucket', 'football'], sun: 50, growth: 0.55, first: 20, reward: 'tallnut',
    tip: 'El Jalapeño quema una fila entera.' },
  { lanes: ALL_LANES, waves: 30, zombies: ['normal', 'cone', 'pole', 'paper', 'bucket', 'football'], sun: 50, growth: 0.5, first: 20, reward: 'threepeater',
    tip: 'La Nuez alta no se puede saltar.' },
  { lanes: ALL_LANES, waves: 30, zombies: ['normal', 'cone', 'pole', 'paper', 'bucket', 'football'], sun: 50, growth: 0.55, first: 20, reward: null,
    tip: '¡Nivel final! Demuestra lo que has aprendido.' },
];
const ENDLESS = { lanes: ALL_LANES, waves: Infinity, zombies: ['normal', 'cone', 'pole', 'paper', 'bucket', 'football'],
  sun: 50, growth: 0.75, first: 20, reward: null, endless: true, tip: 'Modo infinito: ¿cuántas oleadas aguantarás?' };

// ====== Guardado ======
const Save = {
  key: 'jardin_vs_zombis_save_v1',
  data: { level: 0, plants: ['peashooter'], best: 0, sound: true, music: true },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.key));
      if (d && typeof d === 'object') Object.assign(this.data, d);
    } catch (e) { /* sin almacenamiento disponible */ }
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignorar */ }
  },
};
