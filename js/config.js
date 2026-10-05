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
// kind: comportamiento · cost: soles · cd: recarga (s) · hp: vida · ready: empieza cargada
// origin: 1 = juego original, 2 = secuela, 'new' = inventada para este juego
// premium: en el juego original era de pago
const PLANTS = {
  // --- Clásicas ---
  peashooter:  { name: 'Lanzaguisantes', kind: 'shooter', cost: 100, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Dispara guisantes a los zombis de su fila.' },
  sunflower:   { name: 'Girasol', kind: 'sun', cost: 50, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Produce soles extra cada pocos segundos.' },
  cherrybomb:  { name: 'Petacereza', kind: 'instant', cost: 150, cd: 50, hp: 300, ready: false, origin: 1,
                 desc: 'Explota y destruye a los zombis en un área de 3x3.' },
  wallnut:     { name: 'Nuez', kind: 'wall', cost: 50, cd: 30, hp: 4000, ready: true, origin: 1,
                 desc: 'Cáscara durísima que frena a los zombis.' },
  potatomine:  { name: 'Patapum', kind: 'mine', cost: 25, cd: 30, hp: 300, ready: true, origin: 1,
                 desc: 'Tarda en armarse, pero explota al contacto.' },
  snowpea:     { name: 'Hielaguisantes', kind: 'shooter', cost: 175, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Guisantes congelados que dañan y ralentizan.' },
  chomper:     { name: 'Carnívora', kind: 'chomper', cost: 150, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Se traga un zombi entero, pero tarda en masticarlo.' },
  repeater:    { name: 'Repetidora', kind: 'shooter', cost: 200, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Dispara dos guisantes cada vez.' },
  squash:      { name: 'Calabaza', kind: 'squash', cost: 50, cd: 30, hp: 300, ready: false, origin: 1,
                 desc: 'Aplasta al primer zombi que se acerque.' },
  jalapeno:    { name: 'Jalapeño', kind: 'instant', cost: 125, cd: 50, hp: 300, ready: false, origin: 1,
                 desc: 'Arrasa con fuego una fila entera.' },
  tallnut:     { name: 'Nuez alta', kind: 'wall', cost: 125, cd: 30, hp: 8000, ready: true, origin: 1,
                 desc: 'Un muro enorme que ni el saltador puede saltar.' },
  threepeater: { name: 'Tripitidora', kind: 'shooter', cost: 325, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Dispara en tres filas a la vez.' },
  spikeweed:   { name: 'Pinchohierba', kind: 'spike', cost: 100, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Pincha a los zombis que pasan por encima. No se la pueden comer.' },
  torchwood:   { name: 'Tronco ardiente', kind: 'torch', cost: 175, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Los guisantes que lo atraviesan se vuelven de fuego: doble daño.' },
  garlic:      { name: 'Ajo', kind: 'garlic', cost: 50, cd: 7.5, hp: 400, ready: true, origin: 1,
                 desc: 'Los zombis que lo muerden huyen a otra fila.' },
  iceshroom:   { name: 'Hongo helado', kind: 'instant', cost: 75, cd: 50, hp: 300, ready: false, origin: 1,
                 desc: 'Congela a todos los zombis de la pantalla.' },
  doomshroom:  { name: 'Hongo atómico', kind: 'instant', cost: 125, cd: 50, hp: 300, ready: false, origin: 1,
                 desc: 'Explosión gigantesca. Deja un cráter durante un rato.' },
  melonpult:   { name: 'Lanzamelones', kind: 'lobber', cost: 300, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Lanza melones pesados que salpican a los zombis cercanos.' },
  plantern:    { name: 'Planterna', kind: 'plantern', cost: 25, cd: 30, hp: 300, ready: true, origin: 1,
                 desc: 'Ilumina y despeja la niebla a su alrededor.' },
  blover:      { name: 'Trébol soplador', kind: 'instant', cost: 100, cd: 7.5, hp: 300, ready: true, origin: 1,
                 desc: 'Sopla la niebla y se lleva volando a los zombis con globo.' },
  gatling:     { name: 'Ametralladora', kind: 'shooter', cost: 250, cd: 25, hp: 300, ready: true, premium: true, origin: 1,
                 desc: '¡Cuatro guisantes por disparo! (Antes de pago, aquí GRATIS)' },
  twinsunflower:{ name: 'Girasol doble', kind: 'sun', cost: 125, cd: 25, hp: 300, ready: true, premium: true, origin: 1,
                 desc: 'Produce el doble de soles. (Antes de pago, aquí GRATIS)' },
  wintermelon: { name: 'Melón glacial', kind: 'lobber', cost: 450, cd: 25, hp: 300, ready: true, premium: true, origin: 1,
                 desc: 'Melones helados que dañan y congelan en área. (GRATIS)' },
  magnet:      { name: 'Imán', kind: 'magnet', cost: 100, cd: 7.5, hp: 300, ready: true, premium: true, origin: 1,
                 desc: 'Arranca cubos, cascos y puertas metálicas a los zombis. (GRATIS)' },
  // --- De la secuela (muchas eran de pago) ---
  bonkchoy:    { name: 'Bok Choy boxeador', kind: 'melee', cost: 150, cd: 7.5, hp: 300, ready: true, origin: 2,
                 desc: 'Da puñetazos rapidísimos a los zombis que tiene delante o detrás.' },
  lightningreed:{ name: 'Junco eléctrico', kind: 'chain', cost: 125, cd: 7.5, hp: 300, ready: true, origin: 2, premium: true,
                 desc: 'Lanza rayos que saltan entre varios zombis. (GRATIS)' },
  kernelpult:  { name: 'Lanzamaíz', kind: 'lobber', cost: 100, cd: 7.5, hp: 300, ready: true, origin: 2,
                 desc: 'Lanza granos de maíz y, a veces, mantequilla que paraliza.' },
  cabbagepult: { name: 'Lanzacoles', kind: 'lobber', cost: 100, cd: 7.5, hp: 300, ready: true, origin: 2,
                 desc: 'Lanza coles por encima de escudos y lápidas.' },
  laserbean:   { name: 'Judía láser', kind: 'beam', cost: 200, cd: 7.5, hp: 300, ready: true, origin: 2,
                 desc: 'Su láser atraviesa a todos los zombis de la fila.' },
  snapdragon:  { name: 'Dragoncillo', kind: 'breath', cost: 150, cd: 7.5, hp: 300, ready: true, origin: 2,
                 desc: 'Escupe fuego en un área de 3x3 justo delante.' },
  coconut:     { name: 'Cañón de coco', kind: 'cannon', cost: 400, cd: 20, hp: 300, ready: true, origin: 2, premium: true,
                 desc: 'Dispara un coco explosivo enorme. (GRATIS)' },
  bloomerang:  { name: 'Bumerflor', kind: 'boomerang', cost: 175, cd: 7.5, hp: 300, ready: true, origin: 2,
                 desc: 'Su bumerán golpea hasta 3 zombis a la ida y a la vuelta.' },
  iceberg:     { name: 'Lechuga iceberg', kind: 'trap', cost: 25, cd: 20, hp: 300, ready: true, origin: 2,
                 desc: 'Congela por completo al primer zombi que la pisa.' },
  firepea:     { name: 'Lanzallamas', kind: 'shooter', cost: 175, cd: 7.5, hp: 300, ready: true, origin: 2,
                 desc: 'Dispara guisantes de fuego con doble daño.' },
  endurian:    { name: 'Durián', kind: 'wall', cost: 100, cd: 20, hp: 3000, ready: true, origin: 2, premium: true,
                 desc: 'Muro con pinchos: hiere a quien lo muerde. (GRATIS)' },
  citron:      { name: 'Citrón', kind: 'cannon', cost: 350, cd: 15, hp: 300, ready: true, origin: 2, premium: true,
                 desc: 'Carga una bola de plasma devastadora. (GRATIS)' },
  hurrikale:   { name: 'Col huracán', kind: 'instant', cost: 75, cd: 20, hp: 300, ready: true, origin: 2, premium: true,
                 desc: 'Sopla a todos los zombis de su fila hacia atrás. (GRATIS)' },
  phatbeet:    { name: 'Remolacha rapera', kind: 'aura', cost: 125, cd: 7.5, hp: 300, ready: true, origin: 2, premium: true,
                 desc: 'Sus ondas sonoras dañan a todo lo que la rodea. (GRATIS)' },
  // --- Inventadas para este juego ---
  thornrose:   { name: 'Espinarrosa', kind: 'shooter', cost: 150, cd: 7.5, hp: 300, ready: true, origin: 'new',
                 desc: 'Dispara espinas que atraviesan hasta 3 zombis.' },
  bamboo:      { name: 'Bambú cohete', kind: 'rocket', cost: 225, cd: 10, hp: 300, ready: true, origin: 'new',
                 desc: 'Lanza cohetes teledirigidos al zombi más fuerte de la pantalla.' },
  raincloud:   { name: 'Nubecol', kind: 'aura', cost: 175, cd: 7.5, hp: 300, ready: true, origin: 'new',
                 desc: 'Una nube que llueve sobre los zombis de delante: daña y ralentiza.' },
  springnut:   { name: 'Cacahuete muelle', kind: 'spring', cost: 75, cd: 20, hp: 1500, ready: true, origin: 'new',
                 desc: 'Rebota a los zombis que lo muerden tres casillas hacia atrás.' },
  moonflower:  { name: 'Girasol lunar', kind: 'sun', cost: 50, cd: 7.5, hp: 300, ready: true, origin: 'new',
                 desc: 'Produce más rápido que el Girasol y, de noche, el doble.' },
  // --- Reino Gótico (inventadas, con habilidades únicas) ---
  wraith:      { name: 'Espectro', kind: 'shooter', cost: 50, cd: 7.5, hp: 300, ready: true, origin: 'gothic',
                 desc: 'Barato y letal: lanza fuego negro que quema a través de cascos y escudos.' },
  demon:       { name: 'Demonio', kind: 'shooter', cost: 175, cd: 7.5, hp: 300, ready: true, origin: 'gothic',
                 desc: 'Lanza fuego infernal que deja el suelo ardiendo bajo los zombis.' },
  fallenangel: { name: 'Ángel caído', kind: 'shooter', cost: 200, cd: 7.5, hp: 300, ready: true, origin: 'gothic',
                 desc: 'Dispara plumas negras que atraviesan a TODOS los zombis de la fila.' },
  demongirl:   { name: 'Demonia', kind: 'charm', cost: 225, cd: 20, hp: 300, ready: true, origin: 'gothic',
                 desc: 'Lanza besos que hechizan a un zombi: se da la vuelta y lucha a tu favor.' },
  lilith:      { name: 'Lilith', kind: 'drain', cost: 250, cd: 20, hp: 600, ready: true, origin: 'gothic',
                 desc: 'Reina de la noche: absorbe la vida de los zombis cercanos y cura a tus plantas.' },
  ghostlily:   { name: 'Lirio espectral', kind: 'shooter', cost: 150, cd: 7.5, hp: 300, ready: true, origin: 'gothic',
                 desc: 'Es intangible: los zombis la atraviesan. Sus almas ignoran cascos y escudos.' },
  reaper:      { name: 'La Parca', kind: 'reaper', cost: 200, cd: 15, hp: 400, ready: true, origin: 'gothic',
                 desc: 'Siega a los zombis heridos de un tajo y te da sus almas como soles.' },
  widow:       { name: 'Viuda negra', kind: 'web', cost: 100, cd: 7.5, hp: 300, ready: true, origin: 'gothic',
                 desc: 'Teje telarañas que atrapan y frenan a los zombis de su fila.' },
  cursedpumpkin:{ name: 'Calabaza maldita', kind: 'wall', cost: 125, cd: 30, hp: 2500, ready: true, origin: 'gothic',
                 desc: 'Muro maldito: cuando lo destruyen, explota y arrasa todo a su alrededor.' },
  bloodrose:   { name: 'Rosa de sangre', kind: 'sun', cost: 50, cd: 7.5, hp: 300, ready: true, origin: 'gothic',
                 desc: 'Da soles y, además, recoge el alma de cada zombi que muere cerca.' },
  gargoyle:    { name: 'Gárgola', kind: 'wall', cost: 125, cd: 30, hp: 6000, ready: true, origin: 'gothic',
                 desc: 'Estatua de piedra durísima. Puede petrificar a quien la muerde.' },
};
// Objetos especiales del minijuego de bolos
const BOWL = {
  nut:     { name: 'Nuez rodante', dmg: 500 },
  boomnut: { name: 'Nuez explosiva', dmg: 1800 },
  bignut:  { name: 'Nuez gigante', dmg: 1800 },
};
const PLANT_ORDER = Object.keys(PLANTS);
const DEFAULT_PICK = ['sunflower', 'peashooter', 'wallnut', 'cherrybomb', 'snowpea', 'repeater',
  'kernelpult', 'bonkchoy', 'torchwood', 'potatomine'];
const GOTHIC_PICK = ['bloodrose', 'wraith', 'demon', 'fallenangel', 'reaper', 'lilith', 'demongirl', 'ghostlily', 'cursedpumpkin', 'gargoyle'];

// ====== Zombis ======
// hp: vida del cuerpo, armor: vida del accesorio, speed: multiplicador, cost: puntos de oleada
// shield: el accesorio va delante (bloquea guisantes, no proyectiles por arriba)
// metal: el imán puede arrancarlo · flying: vuela por encima de las plantas
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
                desc: 'Su puerta bloquea los guisantes. Usa coles, melones o el imán.' },
  football:   { name: 'Zombi futbolista', hp: 270, armor: 1400, speed: 2, cost: 7, metal: true,
                desc: 'Rápido y muy acorazado.' },
  imp:        { name: 'Diablillo', hp: 270, armor: 0, speed: 1.9, cost: 2,
                desc: 'Pequeño y rápido. Los Gargantúas los lanzan.' },
  gargantuar: { name: 'Gargantúa', hp: 3000, armor: 0, speed: 0.8, cost: 10,
                desc: 'Gigante que aplasta cualquier planta de un golpe.' },
  balloon:    { name: 'Zombi globo', hp: 270, armor: 20, speed: 1.1, cost: 3, flying: true,
                desc: 'Vuela por encima de las plantas. Pínchale el globo o usa el Trébol.' },
  knight:     { name: 'Zombi caballero', hp: 270, armor: 900, speed: 1, cost: 4, metal: true,
                desc: 'Armadura medieval completa. El imán se la quita.' },
  mummy:      { name: 'Momia', hp: 270, armor: 0, speed: 0.9, cost: 1,
                desc: 'Zombi del antiguo Egipto envuelto en vendas.' },
  pharaoh:    { name: 'Faraón zombi', hp: 270, armor: 1200, speed: 0.75, cost: 5, shield: true,
                desc: 'Arrastra un sarcófago que le protege por delante.' },
  vampire:    { name: 'Vampiro', hp: 500, armor: 0, speed: 1.2, cost: 3,
                desc: 'Se cura al morder. Elimínalo rápido.' },
  witch:      { name: 'Bruja', hp: 400, armor: 0, speed: 0.9, cost: 3,
                desc: 'Hechiza a las plantas de delante y las deja paralizadas un rato.' },
  skeleton:   { name: 'Esqueleto', hp: 220, armor: 0, speed: 1.5, cost: 2,
                desc: 'Se recompone una vez tras caer, salvo que lo quemes o lo aplastes.' },
  ghost:      { name: 'Fantasma', hp: 350, armor: 0, speed: 1, cost: 3,
                desc: 'A ratos se vuelve intangible y los disparos rectos lo atraviesan.' },
  gargoylez:  { name: 'Gárgola zombi', hp: 270, armor: 1000, speed: 0.85, cost: 4,
                desc: 'Lleva alas de piedra que la protegen.' },
  archdemon:  { name: 'Archidemonio', hp: 5000, armor: 0, speed: 0.6, cost: 14,
                desc: 'Jefe infernal: incendia plantas con su tridente e invoca esqueletos.' },
};
const ZOMBIE_ORDER = Object.keys(ZOMBIES);
const ZOMBIE_BASE_SPEED = 23;   // px/s (≈ 5 s por casilla)
const EAT_DPS = 100;

// ====== Escenarios ======
const STAGES = {
  day:   { name: 'Día', skySun: [8.5, 11], music: 'day', tint: null, startSun: 50 },
  dusk:  { name: 'Atardecer', skySun: [9.5, 12], music: 'day', tint: 'rgb(255,200,165)', startSun: 100 },
  night: { name: 'Noche', skySun: [11, 14], music: 'night', tint: 'rgb(120,140,215)', startSun: 150 },
  fog:   { name: 'Niebla', skySun: [11, 14], music: 'night', tint: 'rgb(130,150,205)', startSun: 150, fog: 4 },
  gothic: { name: 'Reino Gótico', skySun: [9, 11.5], music: 'gothic', tint: 'rgb(205,170,225)', startSun: 150 },
  egypt: { name: 'Antiguo Egipto', skySun: [8, 10.5], music: 'egypt', tint: 'rgb(255,240,215)', startSun: 75 },
};

// ====== Mundos y niveles (todos desbloqueados) ======
const Z1 = ['normal', 'cone'];
const ZE = ['mummy', 'cone'];
function lv(stage, waves, zombies, growth, tip, extra) { return Object.assign({ stage, waves, zombies, growth, tip }, extra || {}); }
const WORLDS = [
  { id: 'day', name: 'Jardín de día', levels: [
    lv('day', 8, Z1, 0.3, 'Recoge soles y planta Girasoles para tener más.'),
    lv('day', 10, [...Z1, 'pole'], 0.35, 'El saltador pasa por encima de la primera planta.'),
    lv('day', 10, [...Z1, 'bucket'], 0.4, 'El caracubo es duro: ralentízalo o arráncale el cubo con el Imán.'),
    lv('day', 15, [...Z1, 'paper', 'pole'], 0.4, 'Romper el periódico enfada al lector.'),
    lv('day', 15, [...Z1, 'screendoor', 'bucket'], 0.42, 'La mosquitera bloquea guisantes. ¡Las coles caen desde arriba!'),
    lv('day', 20, [...Z1, 'football', 'pole'], 0.42, 'El futbolista es rápido. Combina hielo y daño.'),
    lv('day', 20, [...Z1, 'imp', 'paper', 'bucket'], 0.45, 'Los diablillos son pequeños y veloces.'),
    lv('day', 20, [...Z1, 'knight', 'bucket'], 0.45, 'El caballero lleva armadura: usa el Imán o el Citrón.'),
    lv('day', 20, [...Z1, 'bucket', 'gargantuar'], 0.42, '¡Gargantúa! Necesitarás explosivos y mucho daño.'),
    lv('day', 25, [...Z1, 'pole', 'paper', 'bucket', 'football', 'gargantuar'], 0.45, 'Final del día: ¡todo vale!'),
  ] },
  { id: 'dusk', name: 'Atardecer', levels: [
    lv('dusk', 15, [...Z1, 'pole', 'paper', 'bucket'], 0.39, 'Cae la tarde: sale algo menos de sol.'),
    lv('dusk', 20, [...Z1, 'screendoor', 'football'], 0.39, 'El Tronco ardiente duplica el daño de los guisantes.'),
    lv('dusk', 20, [...Z1, 'imp', 'pole', 'bucket'], 0.44, 'El Ajo desvía a los zombis a otras filas.'),
    lv('dusk', 20, [...Z1, 'paper', 'screendoor', 'gargantuar'], 0.39, 'El Hongo helado congela a todos los zombis.'),
    lv('dusk', 20, [...Z1, 'knight', 'imp', 'pole'], 0.42, 'El Bok Choy pega puñetazos delante y detrás.'),
    lv('dusk', 25, [...Z1, 'pole', 'football', 'imp', 'bucket'], 0.44, 'El Melón glacial ralentiza grupos enteros.'),
    lv('dusk', 25, [...Z1, 'knight', 'screendoor', 'paper'], 0.44, 'La Judía láser atraviesa toda la fila.'),
    lv('dusk', 30, ['normal', 'cone', 'bucket', 'screendoor', 'football', 'gargantuar'], 0.44, '¡Dos banderas más de lo normal! Prepárate bien.'),
  ] },
  { id: 'night', name: 'Noche', levels: [
    lv('night', 15, [...Z1, 'paper', 'pole'], 0.39, 'De noche cae muy poco sol del cielo. Prueba el Girasol lunar.'),
    lv('night', 20, [...Z1, 'bucket', 'screendoor', 'imp'], 0.42, 'El Hongo atómico deja un cráter: úsalo con cabeza.'),
    lv('night', 20, [...Z1, 'football', 'pole', 'paper'], 0.44, 'Las Pinchohierbas no pueden ser comidas.'),
    lv('night', 20, [...Z1, 'knight', 'imp', 'pole'], 0.44, 'El Bambú cohete apunta siempre al zombi más duro.'),
    lv('night', 25, [...Z1, 'bucket', 'imp', 'gargantuar'], 0.44, 'Los Gargantúas lanzan diablillos cuando están heridos.'),
    lv('night', 25, [...Z1, 'screendoor', 'knight', 'football'], 0.46, 'El Citrón carga plasma que destroza armaduras.'),
    lv('night', 30, ['normal', 'cone', 'pole', 'paper', 'bucket', 'screendoor', 'football', 'imp'], 0.49, 'Casi el final de la noche. ¡Que no pase ni uno!'),
    lv('night', 40, ['normal', 'cone', 'pole', 'paper', 'bucket', 'screendoor', 'football', 'imp', 'knight', 'gargantuar'], 0.49, '¡La noche más larga!'),
  ] },
  { id: 'fog', name: 'Niebla', levels: [
    lv('fog', 15, [...Z1, 'balloon'], 0.33, 'La niebla oculta a los zombis. La Planterna la despeja.'),
    lv('fog', 20, [...Z1, 'balloon', 'pole'], 0.35, 'Los zombis globo vuelan por encima. ¡Trébol soplador!'),
    lv('fog', 20, [...Z1, 'balloon', 'paper', 'bucket'], 0.37, 'Los guisantes pinchan los globos.'),
    lv('fog', 20, [...Z1, 'imp', 'balloon', 'screendoor'], 0.39, 'El Junco eléctrico encadena rayos entre zombis.'),
    lv('fog', 25, [...Z1, 'football', 'balloon', 'knight'], 0.39, 'La Nubecol hace llover sobre los zombis.'),
    lv('fog', 25, [...Z1, 'balloon', 'gargantuar', 'imp'], 0.39, 'Gargantúas en la niebla... ¡qué miedo!'),
    lv('fog', 30, ['normal', 'cone', 'balloon', 'paper', 'bucket', 'screendoor', 'pole'], 0.43, 'Usa Planternas en la parte derecha.'),
    lv('fog', 35, ['normal', 'cone', 'balloon', 'bucket', 'football', 'knight', 'imp', 'gargantuar'], 0.45, '¡Final de la niebla!'),
  ] },
  { id: 'egypt', name: 'Antiguo Egipto', levels: [
    lv('egypt', 10, ZE, 0.32, 'Las lápidas bloquean los guisantes. Los lanzadores pasan por encima.', { tombs: 4 }),
    lv('egypt', 15, [...ZE, 'pole'], 0.38, 'Destruye las lápidas para despejar el camino.', { tombs: 5 }),
    lv('egypt', 15, [...ZE, 'bucket', 'pharaoh'], 0.4, 'El faraón arrastra un sarcófago muy duro.', { tombs: 5 }),
    lv('egypt', 20, [...ZE, 'pharaoh', 'imp'], 0.42, 'Las coles y el maíz saltan por encima de los sarcófagos.', { tombs: 6 }),
    lv('egypt', 20, [...ZE, 'knight', 'pharaoh', 'pole'], 0.44, 'El Cañón de coco hace mucho daño en área.', { tombs: 6 }),
    lv('egypt', 25, [...ZE, 'bucket', 'football', 'pharaoh'], 0.45, 'Combina Lanzamaíz y Lanzacoles.', { tombs: 7 }),
    lv('egypt', 25, [...ZE, 'pharaoh', 'imp', 'gargantuar'], 0.45, '¡Gargantúas en el desierto!', { tombs: 7 }),
    lv('egypt', 35, ['mummy', 'cone', 'pole', 'bucket', 'pharaoh', 'knight', 'football', 'imp', 'gargantuar'], 0.5, '¡La gran pirámide! Nivel final.', { tombs: 8 }),
  ] },
  { id: 'gothic', name: 'Reino Gótico', levels: [
    lv('gothic', 10, ['normal', 'skeleton', 'cone'], 0.26, 'Bienvenida al Reino Gótico. Los esqueletos se recomponen una vez.', { tombs: 3 }),
    lv('gothic', 15, ['normal', 'skeleton', 'vampire'], 0.3, 'El vampiro se cura al morder: no le dejes llegar.', { tombs: 3 }),
    lv('gothic', 15, ['skeleton', 'cone', 'witch'], 0.32, 'La bruja paraliza tus plantas. ¡La Parca siega a los heridos!', { tombs: 4 }),
    lv('gothic', 20, ['normal', 'skeleton', 'ghost', 'vampire'], 0.34, 'Los fantasmas esquivan los disparos rectos. El Lirio espectral los alcanza.', { tombs: 4 }),
    lv('gothic', 20, ['skeleton', 'gargoylez', 'witch', 'cone'], 0.36, 'La Demonia hechiza zombis para que luchen por ti.', { tombs: 5 }),
    lv('gothic', 20, ['vampire', 'ghost', 'bucket', 'skeleton'], 0.36, 'Lilith absorbe vida y cura a tus plantas.', { tombs: 5 }),
    lv('gothic', 25, ['skeleton', 'witch', 'gargoylez', 'vampire', 'imp'], 0.38, 'La Calabaza maldita explota al caer.', { tombs: 5 }),
    lv('gothic', 25, ['skeleton', 'ghost', 'vampire', 'archdemon'], 0.34, '¡Un Archidemonio! Fuego, almas y mucha paciencia.', { tombs: 6 }),
    lv('gothic', 30, ['skeleton', 'witch', 'ghost', 'gargoylez', 'vampire', 'knight'], 0.4, 'Las sombras se espesan...', { tombs: 6 }),
    lv('gothic', 40, ['skeleton', 'witch', 'ghost', 'gargoylez', 'vampire', 'archdemon', 'gargantuar'], 0.42, '¡Noche final en el Reino Gótico!', { tombs: 7 }),
  ] },
];
const LEVELS = [];
WORLDS.forEach(w => w.levels.forEach((l, i) => { l.world = w.id; l.num = i + 1; LEVELS.push(l); }));
const ENDLESS = { stage: 'day', waves: Infinity, zombies: ['normal', 'cone', 'pole', 'paper', 'bucket', 'screendoor', 'football', 'imp', 'knight', 'gargantuar'],
  growth: 0.7, endless: true, tip: 'Modo infinito: el escenario cambia cada 10 oleadas.' };

// ====== Minijuegos ======
const MINIGAMES = {
  bowling: { name: 'Bolos con nueces', desc: 'Lanza nueces rodantes que rebotan entre filas.',
    stage: 'day', waves: 12, zombies: ['normal', 'cone', 'paper', 'bucket', 'pole', 'screendoor'], growth: 0.55, mode: 'bowling',
    tip: 'Coloca nueces a la izquierda de la línea roja. Las rojas explotan y la gigante lo aplasta todo.' },
  conveyor: { name: 'Cinta loca', desc: 'Sin soles: la cinta te va dando plantas al azar.',
    stage: 'dusk', waves: 15, zombies: ['normal', 'cone', 'pole', 'bucket', 'imp', 'football', 'knight'], growth: 0.5, mode: 'conveyor',
    tip: 'Las plantas llegan por la cinta. ¡Úsalas rápido!' },
  laststand: { name: 'Último bastión', desc: 'Empiezas con 5000 soles y ya no cae ni uno más.',
    stage: 'night', waves: 20, zombies: ['normal', 'cone', 'pole', 'paper', 'bucket', 'screendoor', 'football', 'imp'], growth: 0.55, mode: 'laststand',
    tip: 'Prepara tu defensa con calma y pulsa «¡Empezar!».' },
  invisible: { name: 'Zombis invisibles', desc: 'Solo ves sus sombras... y cuando los golpeas.',
    stage: 'fog', waves: 15, zombies: ['normal', 'cone', 'pole', 'bucket', 'paper', 'imp'], growth: 0.45, mode: 'invisible', noFog: true,
    tip: 'Fíjate en las sombras.' },
  giants: { name: 'Ataque de gigantes', desc: 'Solo Gargantúas y diablillos. Empiezas con 1500 soles.',
    stage: 'egypt', waves: 10, zombies: ['gargantuar', 'imp'], growth: 1.4, mode: 'giants', startSun: 1500,
    tip: 'Explosivos, hielo y mucho daño. ¡Suerte!' },
  vampires: { name: 'Noche de vampiros', desc: 'Solo vampiros y murciélagos... digo, esqueletos.',
    stage: 'gothic', waves: 15, zombies: ['vampire', 'skeleton'], growth: 0.5, mode: 'normal', startSun: 300,
    tip: 'Las plantas góticas son tus mejores aliadas aquí.' },
  rush: { name: 'Carrera zombi', desc: 'Los zombis van al doble de velocidad.',
    stage: 'day', waves: 15, zombies: ['normal', 'cone', 'pole', 'bucket', 'paper', 'football'], growth: 0.36, mode: 'rush', startSun: 450,
    tip: '¡Rápido! Todo va al doble de velocidad.' },
};

// ====== Guardado ======
const Save = {
  key: 'jardin_vs_zombis_save_v3',
  data: { done: [], best: 0, sound: true, music: true, autoSun: false, hpBars: false, pick: null, world: 'day', quality: 'auto' },
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
